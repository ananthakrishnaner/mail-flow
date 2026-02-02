from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from .models import MailConfig, EmailRecipient, EmailTemplate, EmailCampaign, EmailLog
from .serializers import MailConfigSerializer, EmailRecipientSerializer, EmailTemplateSerializer, EmailCampaignSerializer, EmailLogSerializer
from .utils.mailer import process_campaign, send_email, process_template_variables
import uuid
import json

# --- Config ---
class ConfigView(APIView):
    def get(self, request):
        config = MailConfig.objects.first()
        if config:
            serializer = MailConfigSerializer(config)
            return Response(serializer.data)
        return Response({})

    def post(self, request):
        config = MailConfig.objects.first()
        data = request.data
        
        # If updating, merge with existing instance
        if config:
            serializer = MailConfigSerializer(config, data=data, partial=True)
        else:
            data['id'] = str(uuid.uuid4())
            serializer = MailConfigSerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- Recipients ---
class RecipientListView(APIView):
    def get(self, request):
        recipients = EmailRecipient.objects.all().order_by('-created_at')
        serializer = EmailRecipientSerializer(recipients, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data
        if 'id' not in data:
            data['id'] = str(uuid.uuid4())
            
        serializer = EmailRecipientSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RecipientDetailView(APIView):
    def delete(self, request, pk):
        try:
            recipient = EmailRecipient.objects.get(pk=pk)
            recipient.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EmailRecipient.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RecipientBulkView(APIView):
    def post(self, request):
        recipients_data = request.data
        if not isinstance(recipients_data, list) or len(recipients_data) == 0:
            return Response({'error': 'Invalid input: expected non-empty array of recipients'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Optimized approach using bulk_create
            recipient_objects = []
            for r in recipients_data:
                if not r.get('email'):
                    continue
                recipient_objects.append(EmailRecipient(
                    id=str(uuid.uuid4()),
                    email=r['email'],
                    name=r.get('name')
                ))
            
            # bulk_create with ignore_conflicts=True handles "ON CONFLICT DO NOTHING" (Postgres/SQLite)
            EmailRecipient.objects.bulk_create(recipient_objects, ignore_conflicts=True)
            
            return Response({'success': True, 'count': len(recipients_data)})
        except Exception as e:
            return Response({'error': 'Failed to bulk add recipients', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Templates ---
class TemplateListView(APIView):
    def get(self, request):
        templates = EmailTemplate.objects.all().order_by('-created_at')
        serializer = EmailTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data
        if 'id' not in data:
            data['id'] = str(uuid.uuid4())
        serializer = EmailTemplateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TemplateDetailView(APIView):
    def delete(self, request, pk):
        try:
            template = EmailTemplate.objects.get(pk=pk)
            template.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EmailTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

# --- Campaigns ---
class CampaignListView(APIView):
    def get(self, request):
        campaigns = EmailCampaign.objects.all().order_by('-created_at')
        serializer = EmailCampaignSerializer(campaigns, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data
        if 'id' not in data:
            data['id'] = str(uuid.uuid4())
        
        # If scheduled_at is present, set status to scheduled
        if data.get('scheduled_at'):
            data['status'] = 'scheduled'
        else:
            data['status'] = 'draft'
            
        data['total_recipients'] = len(data.get('recipient_ids', []))
        
        serializer = EmailCampaignSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CampaignDetailView(APIView):
    def delete(self, request, pk):
        try:
            campaign = EmailCampaign.objects.get(pk=pk)
            campaign.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EmailCampaign.DoesNotExist:
            return Response({'error': 'Campaign not found'}, status=status.HTTP_404_NOT_FOUND)

class CampaignStatusView(APIView):
    def patch(self, request, pk):
        try:
            campaign = EmailCampaign.objects.get(pk=pk)
            status_val = request.data.get('status')
            if status_val:
                campaign.status = status_val
                campaign.save()
                return Response({'success': True, 'status': status_val})
            return Response({'error': 'Status required'}, status=status.HTTP_400_BAD_REQUEST)
        except EmailCampaign.DoesNotExist:
            return Response({'error': 'Campaign not found'}, status=status.HTTP_404_NOT_FOUND)

class CampaignStartView(APIView):
    def post(self, request, pk):
        base_url = f"{request.scheme}://{request.get_host()}"
        # Start in background
        process_campaign(pk, base_url)
        return Response({'success': True, 'message': 'Campaign started'})

# --- Logs ---
class CampaignLogsView(APIView):
    def get(self, request, pk):
        logs = EmailLog.objects.filter(campaign_id=pk).order_by('-created_at')
        serializer = EmailLogSerializer(logs, many=True)
        return Response(serializer.data)

# --- Stats ---
class StatsSummaryView(APIView):
    def get(self, request):
        campaign_id = request.GET.get('campaignId')
        
        # Base querysets
        campaigns_qs = EmailCampaign.objects.all()
        logs_qs = EmailLog.objects.all()
        recipients_qs = EmailRecipient.objects.all()

        if campaign_id and campaign_id != 'all':
            campaigns_qs = campaigns_qs.filter(id=campaign_id)
            logs_qs = logs_qs.filter(campaign_id=campaign_id)
            # For a single campaign, total recipients is the number of logs (or recipients in campaign)
            # Usually users expect "Recipients targeted" for a campaign stats view.
            # But let's stick to aggregates.

        # Aggregates
        total_predictions = campaigns_qs.aggregate(
            sent=Sum('sent_count'),
            failed=Sum('failed_count'),
            opens=Sum('open_count'),
            clicks=Sum('click_count')
        )
        
        total_sent = total_predictions['sent'] or 0
        total_failed = total_predictions['failed'] or 0
        total_opens = total_predictions['opens'] or 0
        total_clicks = total_predictions['clicks'] or 0
        
        # Unique counts (from logs)
        unique_opens = logs_qs.exclude(opened_at__isnull=True).values('recipient').distinct().count()
        unique_clicks = logs_qs.exclude(clicked_at__isnull=True).values('recipient').distinct().count()
        
        total_recipients = recipients_qs.count() # This is global total recipients in DB
        if campaign_id and campaign_id != 'all':
             # If filtering by campaign, total recipients = pending + sent + failed for that campaign (approximation)
             total_recipients = logs_qs.count() 

        total_pending = logs_qs.filter(status='pending').count()
        
        # Daily Stats (last 7 days)
        from django.db.models.functions import TruncDate
        from datetime import timedelta
        
        seven_days_ago = timezone.now() - timedelta(days=7)
        daily_stats_qs = logs_qs.filter(created_at__gte=seven_days_ago).annotate(date=TruncDate('created_at')).values('date').annotate(
            sent=Count('id', filter=Q(status='sent')),
            failed=Count('id', filter=Q(status='failed')),
            opens=Count('id', filter=Q(opened_at__isnull=False)),
            clicks=Count('id', filter=Q(clicked_at__isnull=False))
        ).order_by('date')
        
        daily_stats = []
        for stat in daily_stats_qs:
            daily_stats.append({
                'date': stat['date'].isoformat(),
                'sent': stat['sent'],
                'failed': stat['failed'],
                'opens': stat['opens'],
                'clicks': stat['clicks']
            })

        return Response({
            'totalSent': total_sent,
            'totalFailed': total_failed,
            'totalPending': total_pending,
            'totalRecipients': total_recipients,
            'totalOpens': total_opens,
            'uniqueOpens': unique_opens,
            'totalClicks': total_clicks,
            'uniqueClicks': unique_clicks,
            'totalCampaigns': EmailCampaign.objects.count(), # Always total campaigns count
            'dailyStats': daily_stats
        })

# --- Test Email ---
class TestEmailView(APIView):
    def post(self, request):
        to = request.data.get('to')
        html = request.data.get('html')
        subject = request.data.get('subject')
        
        config = MailConfig.objects.first()
        if not config or not config.is_configured:
            return Response({'error': 'Email provider not configured'}, status=status.HTTP_400_BAD_REQUEST)
        
        recipient_name = 'Test User'
        # Pass empty log_id for test
        processed_html = process_template_variables(html, to, recipient_name, 'test-id', False, '')
        
        result = send_email(to, subject, processed_html, config)
        
        if result['success']:
            return Response({'success': True})
        else:
            print(f"Test Email Error: {result.get('error')}")
            return Response({'error': result.get('error')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Tracking Pixel ---
from django.http import HttpResponse
import base64

class TrackEmailView(APIView):
    def get(self, request):
        log_id = request.GET.get('id')
        type_ = request.GET.get('type')
        
        if log_id:
            try:
                log = EmailLog.objects.get(id=log_id)
                campaign = log.campaign
                
                if type_ == 'open' and not log.opened_at:
                    log.opened_at = timezone.now()
                    log.save()
                    # Atomic increment
                    EmailCampaign.objects.filter(pk=campaign.pk).update(open_count=F('open_count') + 1)
                    
            except Exception as e:
                print(f"Tracking error: {e}")
                pass

        pixel = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
        return HttpResponse(pixel, content_type='image/gif')
