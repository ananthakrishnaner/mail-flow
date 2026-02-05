from rest_framework.views import APIView
from rest_framework.response import Response
from .models import EmailLog, SecurityLog
from django.http import HttpResponse
from datetime import datetime
from rest_framework.permissions import AllowAny

class ComparisonAnalyticsView(APIView):
    def get(self, request):
        try:
            # Get latest sent date for each email
            sent_logs = EmailLog.objects.filter(status='sent').values('recipient_email', 'sent_at').order_by('recipient_email', '-sent_at')
            sent_map = {}
            for log in sent_logs:
                email = log['recipient_email']
                if email:
                    email_lower = email.lower()
                    if email_lower not in sent_map:
                        sent_map[email_lower] = log['sent_at']

            # Get latest security log for each email (or all? User said "input details match that")
            # Let's show all security logs that have a matching sent email
            sec_logs = SecurityLog.objects.all().order_by('-created_at')
            
            matches = []
            unique_matched_emails = set()
            
            for slog in sec_logs:
                if not slog.email:
                    continue
                    
                email_lower = slog.email.lower()
                if email_lower in sent_map:
                    matches.append({
                        'id': slog.id,
                        'email': slog.email,
                        'sent_at': sent_map[email_lower],
                        'security_date': slog.created_at,
                        'input_details': slog.input_details
                    })
                    unique_matched_emails.add(email_lower)

            return Response({
                'matches': matches,
                'stats': {
                    'total_sent_unique': len(sent_map),
                    'total_matches_unique': len(unique_matched_emails)
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ComparisonExportView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            # Data gathering (same as above)
            sent_logs = EmailLog.objects.filter(status='sent').values('recipient_email', 'sent_at').order_by('recipient_email', '-sent_at')
            sent_map = {}
            for log in sent_logs:
                email = log['recipient_email']
                if email:
                    sent_map[email.lower()] = log['sent_at']

            sec_logs = SecurityLog.objects.all().order_by('-created_at')
            matches = []
            
            for slog in sec_logs:
                if not slog.email:
                    continue
                email_lower = slog.email.lower()
                if email_lower in sent_map:
                    matches.append({
                        'email': slog.email,
                        'sent_at': sent_map[email_lower],
                        'security_date': slog.created_at,
                        'input_details': slog.input_details
                    })

            # Word Document Generation
            from docx import Document
            from docx.shared import Inches, Pt, RGBColor
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            
            doc = Document()
            
            # Title
            title = doc.add_heading('Comparision Analyser Report', 0)
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            title.runs[0].font.color.rgb = RGBColor(0, 102, 204)
            
            doc.add_paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            doc.add_heading('Comparison Analysis', level=1)
            doc.add_paragraph('This report compares emails sent via campaigns against security logs captured from the landing page/application. The table below matches recipients who were sent an email and subsequently generated a security log entry.')
            
            # Table
            table = doc.add_table(rows=1, cols=4)
            table.style = 'Light Grid Accent 1'
            
            headers = ['Email Address', 'Email Sent Date', 'Security Log Date', 'Input Details']
            hdr_cells = table.rows[0].cells
            for i, h in enumerate(headers):
                hdr_cells[i].text = h
                hdr_cells[i].paragraphs[0].runs[0].font.bold = True
                
            for m in matches:
                row_cells = table.add_row().cells
                row_cells[0].text = m['email']
                row_cells[1].text = m['sent_at'].strftime('%Y-%m-%d %H:%M:%S') if m['sent_at'] else '-'
                row_cells[2].text = m['security_date'].strftime('%Y-%m-%d %H:%M:%S') if m['security_date'] else '-'
                row_cells[3].text = m['input_details'] or '-'
                
            # Summary
            doc.add_paragraph()
            doc.add_heading('Summary', level=2)
            doc.add_paragraph(f"Total Matches Found: {len(matches)}")
            
            # Save
            from io import BytesIO
            buffer = BytesIO()
            doc.save(buffer)
            buffer.seek(0)
            
            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response['Content-Disposition'] = 'attachment; filename="comparison_analysis_report.docx"'
            return response
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
