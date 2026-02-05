from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SecurityLog
from django.http import HttpResponse
from datetime import datetime
from rest_framework.permissions import AllowAny
import csv
import io

class ComparisonAnalyticsView(APIView):
    def post(self, request):
        try:
            file = request.FILES.get('file')
            if not file:
                return Response({'error': 'No file uploaded'}, status=400)

            # Parse CSV
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            # Normalize headers to lowercase to find 'email'
            fieldnames = [f.lower() for f in reader.fieldnames] if reader.fieldnames else []
            if 'email' not in fieldnames:
                return Response({'error': 'CSV must contain an "email" column'}, status=400)
            
            # Map original header to 'email' key
            email_key = next(f for f in reader.fieldnames if f.lower() == 'email')
            
            csv_emails = set()
            csv_sent_dates = {} # Map email -> sent_date if available (optional)
            
            for row in reader:
                if row.get(email_key):
                    email = row[email_key].strip().lower()
                    csv_emails.add(email)
                    # Try to capture sent date if it exists, otherwise None
                    # Checks for 'sent at', 'sent_at', 'date'
                    for key in row.keys():
                        if key.lower() in ['sent at', 'sent_at', 'date']:
                            csv_sent_dates[email] = row[key]
                            break

            # Get security logs
            # Filter logic: email in csv_emails AND length(input_details) > 2
            sec_logs = SecurityLog.objects.all().order_by('-created_at')
            
            matches = []
            unique_matched_emails = set()
            
            for slog in sec_logs:
                if not slog.email:
                    continue
                    
                email_lower = slog.email.lower()
                
                # Check match and filter constraint
                if email_lower in csv_emails:
                    # Filter: input_details length > 2
                    if slog.input_details and len(slog.input_details) > 2:
                        matches.append({
                            'id': slog.id,
                            'email': slog.email,
                            'sent_at': csv_sent_dates.get(email_lower),
                            'security_date': slog.created_at,
                            'input_details': slog.input_details
                        })
                        unique_matched_emails.add(email_lower)

            return Response({
                'matches': matches,
                'stats': {
                    'total_sent_unique': len(csv_emails),
                    'total_matches_unique': len(unique_matched_emails)
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ComparisonExportView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            file = request.FILES.get('file')
            if not file:
                return Response({'error': 'No file uploaded'}, status=400)

            # Parse CSV (Same logic as above)
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            fieldnames = [f.lower() for f in reader.fieldnames] if reader.fieldnames else []
            if 'email' not in fieldnames:
                return Response({'error': 'CSV must contain an "email" column'}, status=400)
            
            email_key = next(f for f in reader.fieldnames if f.lower() == 'email')
            
            csv_emails = set()
            csv_sent_dates = {}
            
            for row in reader:
                if row.get(email_key):
                    email = row[email_key].strip().lower()
                    csv_emails.add(email)
                    for key in row.keys():
                        if key.lower() in ['sent at', 'sent_at', 'date']:
                            csv_sent_dates[email] = row[key]
                            break

            sec_logs = SecurityLog.objects.all().order_by('-created_at')
            matches = []
            
            for slog in sec_logs:
                if not slog.email:
                    continue
                email_lower = slog.email.lower()
                if email_lower in csv_emails:
                    if slog.input_details and len(slog.input_details) > 2:
                        matches.append({
                            'email': slog.email,
                            'sent_at': csv_sent_dates.get(email_lower),
                            'security_date': slog.created_at,
                            'input_details': slog.input_details
                        })

            # Word Document Generation
            from docx import Document
            from docx.shared import Inches, Pt, RGBColor
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            from docx.oxml.ns import nsdecls
            from docx.oxml import parse_xml
            
            doc = Document()
            
            # Title
            title = doc.add_heading('Comparision Analyser Report', 0)
            title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            title.runs[0].font.color.rgb = RGBColor(0, 102, 204)
            
            doc.add_paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            doc.add_heading('Comparison Analysis', level=1)
            doc.add_paragraph('This report compares emails from the uploaded CSV against security logs. Only matches with input details longer than 2 characters are included.')
            
            # Table
            table = doc.add_table(rows=1, cols=4)
            table.style = 'Table Grid'
            
            headers = ['Email Address', 'Email Sent Date', 'Security Log Date', 'Input Details']
            hdr_cells = table.rows[0].cells
            for i, h in enumerate(headers):
                hdr_cells[i].text = h
                hdr_cells[i].paragraphs[0].runs[0].font.bold = True
                hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
                
                # Header background
                shading_elm = parse_xml(r'<w:shd {} w:fill="0066CC"/>'.format(nsdecls('w')))
                hdr_cells[i]._element.get_or_add_tcPr().append(shading_elm)
                
            for m in matches:
                row_cells = table.add_row().cells
                row_cells[0].text = m['email']
                row_cells[1].text = str(m['sent_at']) if m['sent_at'] else '-'
                row_cells[2].text = m['security_date'].strftime('%Y-%m-%d %H:%M:%S') if m['security_date'] else '-'
                row_cells[3].text = m['input_details'] or '-'
                
            # Summary
            doc.add_paragraph()
            doc.add_heading('Summary', level=2)
            doc.add_paragraph(f"Total Emails in CSV: {len(csv_emails)}")
            doc.add_paragraph(f"Total Matches Found: {len(matches)}")
            
            # Save
            buffer = io.BytesIO()
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
