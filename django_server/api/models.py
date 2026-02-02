from django.db import models
from django.utils import timezone
import uuid

class EmailRecipient(models.Model):
    id = models.CharField(max_length=255, primary_key=True, default=uuid.uuid4)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=50, default='pending')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'email_recipients'

class EmailTemplate(models.Model):
    id = models.CharField(max_length=255, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    html_content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'email_templates'

class EmailCampaign(models.Model):
    id = models.CharField(max_length=255, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    html_content = models.TextField(null=True, blank=True)
    template = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL, null=True, db_column='template_id')
    recipient_ids = models.JSONField(default=list)
    status = models.CharField(max_length=50, default='draft')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delay_seconds = models.IntegerField(default=0)
    total_recipients = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    open_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'email_campaigns'

class EmailLog(models.Model):
    id = models.CharField(max_length=255, primary_key=True, default=uuid.uuid4)
    campaign = models.ForeignKey(EmailCampaign, on_delete=models.CASCADE, db_column='campaign_id')
    recipient = models.ForeignKey(EmailRecipient, on_delete=models.CASCADE, db_column='recipient_id')
    recipient_email = models.EmailField()
    status = models.CharField(max_length=50, default='pending')
    error_message = models.TextField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'email_logs'
        indexes = [
            models.Index(fields=['campaign']),
            models.Index(fields=['recipient']),
        ]

class MailConfig(models.Model):
    id = models.CharField(max_length=255, primary_key=True, default=uuid.uuid4)
    provider = models.CharField(max_length=50, default='sendgrid')
    from_email = models.EmailField(default='', blank=True)
    from_name = models.CharField(max_length=255, default='', blank=True)
    api_key = models.CharField(max_length=255, null=True, blank=True)
    mailgun_api_key = models.CharField(max_length=255, null=True, blank=True)
    mailgun_domain = models.CharField(max_length=255, null=True, blank=True)
    mailgun_region = models.CharField(max_length=50, default='us', null=True)
    smtp_host = models.CharField(max_length=255, null=True, blank=True)
    smtp_port = models.IntegerField(null=True, blank=True)
    smtp_user = models.CharField(max_length=255, null=True, blank=True)
    smtp_pass = models.CharField(max_length=255, null=True, blank=True)
    smtp_secure = models.BooleanField(default=False)
    is_configured = models.BooleanField(default=False)
    tracking_enabled = models.BooleanField(default=True)
    telegram_notifications_enabled = models.BooleanField(default=False)
    telegram_bot_token = models.CharField(max_length=255, null=True, blank=True)
    telegram_chat_id = models.CharField(max_length=255, null=True, blank=True)
    # Twilio (SMS)
    twilio_account_sid = models.CharField(max_length=255, null=True, blank=True)
    twilio_auth_token = models.CharField(max_length=255, null=True, blank=True)
    twilio_from_number = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'mail_config'
