import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import time
import json
import threading
import re
import logging
import os
from django.conf import settings
from django.utils import timezone
from api.models import MailConfig, EmailRecipient, EmailTemplate, EmailCampaign, EmailLog
import uuid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from twilio.rest import Client as TwilioClient
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def strip_html_tags(html):
    if not html:
        return ""
    # Simple regex to remove tags
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', html)
    # Decode entities
    import html as html_parser
    return html_parser.unescape(text).strip()

def process_template_variables(html_content, recipient_email, recipient_name, log_id, tracking_enabled, base_url):
    processed = html_content or ''
    
    # Simple replacement
    name_val = recipient_name or recipient_email.split('@')[0]
    processed = processed.replace('{{name}}', name_val)
    processed = processed.replace('{{email}}', recipient_email)
    
    if tracking_enabled:
        tracking_pixel_url = f"{base_url}/api/track-email?id={log_id}&type=open"
        tracking_pixel = f'<img src="{tracking_pixel_url}" alt="" width="1" height="1" style="display:none;visibility:hidden;" />'
        
        if '{{tracking}}' in processed:
            processed = processed.replace('{{tracking}}', tracking_pixel)
        elif '</body>' in processed.lower():
            # Case insensitive replace for </body>
            processed = re.sub(r'</body>', f'{tracking_pixel}</body>', processed, flags=re.IGNORECASE)
        else:
            processed += tracking_pixel
    else:
        processed = processed.replace('{{tracking}}', '')
        
    return processed

def send_with_sendgrid(to_email, subject, html_content, from_email, from_name, api_key):
    try:
        # Use Official SDK as requested
        message = Mail(
            from_email=(from_email, from_name) if from_name else from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        
        if 200 <= response.status_code < 300:
            return {'success': True}
        else:
            return {'success': False, 'error': f"Status: {response.status_code}, Body: {response.body}"}
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg:
            return {'success': False, 'error': "Invalid API Key (401 Unauthorized). Please check your SendGrid configuration."}
        return {'success': False, 'error': error_msg}

def send_with_mailgun(to_email, subject, html_content, from_email, from_name, api_key, domain, region='us'):
    try:
        base_url = 'https://api.eu.mailgun.net' if region == 'eu' else 'https://api.mailgun.net'
        url = f"{base_url}/v3/{domain}/messages"
        auth = ('api', api_key)
        
        from_str = f"{from_name} <{from_email}>" if from_name else from_email
        
        data = {
            'from': from_str,
            'to': to_email,
            'subject': subject,
            'html': html_content
        }
        
        response = requests.post(url, auth=auth, data=data)
        if 200 <= response.status_code < 300:
            return {'success': True}
        else:
            return {'success': False, 'error': response.text}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def send_with_smtp(to_email, subject, html_content, from_email, from_name, host, port, user, password, secure):
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Determine connection type
        if secure:
            server = smtplib.SMTP_SSL(host, port)
        else:
            server = smtplib.SMTP(host, port)
            try:
                server.starttls()
            except:
                pass # Maybe server doesn't support starttls

        if user and password:
            server.login(user, password)
            
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def send_twilio_sms(to_number, body, config):
    try:
        if not (config.twilio_account_sid and config.twilio_auth_token and config.twilio_from_number):
            return {'success': False, 'error': 'Twilio not configured'}

        client = TwilioClient(config.twilio_account_sid, config.twilio_auth_token)
        message = client.messages.create(
            body=body,
            from_=config.twilio_from_number,
            to=to_number
        )
        return {'success': True, 'sid': message.sid}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def send_email(to_email, subject, html_content, config, recipient_phone=None):
    if config.provider == 'mailgun':
        return send_with_mailgun(
            to_email, subject, html_content,
            config.from_email, config.from_name,
            config.mailgun_api_key, config.mailgun_domain, config.mailgun_region
        )
    elif config.provider == 'smtp':
        return send_with_smtp(
            to_email, subject, html_content,
            config.from_email, config.from_name,
            config.smtp_host, config.smtp_port,
            config.smtp_user, config.smtp_pass,
            config.smtp_secure
        )
    elif config.provider == 'twilio':
        # SMS Handler
        if not recipient_phone:
             return {'success': False, 'error': 'No phone number for recipient'}
        
        # Convert HTML to text for SMS
        body = strip_html_tags(html_content)
        # Append subject if present perhaps? Or just body.
        if subject:
            body = f"{subject}\n{body}"
            
        return send_twilio_sms(recipient_phone, body, config)
    else:
        # Default SendGrid
        return send_with_sendgrid(
            to_email, subject, html_content,
            config.from_email, config.from_name,
            config.api_key
        )

def generate_campaign_pdf(campaign, sent_count, failed_count, failed_recipients):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom Colors
    PRIMARY_COLOR = colors.HexColor('#1e293b')
    ACCENT_COLOR = colors.HexColor('#3b82f6')
    SUCCESS_COLOR = colors.HexColor('#10b981')
    FAIL_COLOR = colors.HexColor('#ef4444')
    TEXT_COLOR = colors.HexColor('#334155')
    
    # Title Section with Background
    title_style = styles['Title']
    title_style.textColor = PRIMARY_COLOR
    title_style.fontSize = 24
    title_style.alignment = 1 # Center
    
    elements.append(Paragraph(f"MAIL MUSE", title_style))
    elements.append(Paragraph(f"Campaign Performance Report", styles['Heading2']))
    elements.append(Spacer(1, 20))
    
    # Campaign Details Box
    elements.append(Paragraph(f"<b>Campaign Name:</b> {campaign.name}", styles['Normal']))
    elements.append(Paragraph(f"<b>Date:</b> {timezone.now().strftime('%B %d, %Y at %I:%M %p')}", styles['Normal']))
    elements.append(Spacer(1, 10))
    
    # Stats Visuals (Text based, as charts in PDF are hard without image lib)
    stats_data = [
        ['Total Sent', 'Successful', 'Failed'],
        [str(sent_count + failed_count), str(sent_count), str(failed_count)]
    ]
    t_stats = Table(stats_data, colWidths=[150, 150, 150])
    t_stats.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        ('TEXTCOLOR', (0, 1), (0, 1), TEXT_COLOR),
        ('TEXTCOLOR', (1, 1), (1, 1), SUCCESS_COLOR),
        ('TEXTCOLOR', (2, 1), (2, 1), FAIL_COLOR),
        ('FONTSIZE', (0, 1), (-1, 1), 14),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 15),
        ('TOPPADDING', (0, 1), (-1, 1), 15),
        ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.9, 0.9, 0.9))
    ]))
    elements.append(t_stats)
    elements.append(Spacer(1, 30))
    
    # Failed Emails Section
    if failed_recipients:
        elements.append(Paragraph("Failed Deliveries Log", styles['Heading2']))
        elements.append(Spacer(1, 10))
        
        data = [['Recipient', 'Error Reason']]
        for f in failed_recipients:
            # Wrap error text
            err = str(f.get('error', 'Unknown'))
            if len(err) > 60:
                err = err[:57] + '...'
            data.append([f['email'], err])
            
        t = Table(data, colWidths=[200, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), FAIL_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fef2f2')),
            ('GRID', (0, 0), (-1, -1), 0.5, FAIL_COLOR),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        elements.append(t)
    else:
        # Success Message
        success_style = styles['Normal']
        success_style.textColor = SUCCESS_COLOR
        success_style.fontSize = 12
        elements.append(Paragraph("🎉 Perfect execution! No failed deliveries recorded.", success_style))
        
    doc.build(elements)
    buffer.seek(0)
    return buffer

# Configure Logger
logger = logging.getLogger('mailer')
if not logger.handlers:
    log_path = os.path.join(settings.BASE_DIR, 'mailer.log')
    handler = logging.FileHandler(log_path)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def process_campaign_task(campaign_id, base_url):
    # This runs in a thread
    logger.info(f"Starting campaign processing task for ID: {campaign_id}")
    try:
        from django.db import connections
        # Ensure we have a fresh connection for this thread
        connections.close_all()
        
        campaign = EmailCampaign.objects.get(id=campaign_id)
        
        if campaign.status != 'scheduled' and campaign.status != 'draft' and campaign.status != 'paused':
             logger.warning(f"Campaign {campaign.name} is {campaign.status}, skipping start.")
             return

        logger.info(f"Processing Campaign: {campaign.name}")
        campaign.status = 'sending'
        campaign.save()
        
        config = MailConfig.objects.first()
        if not config or not config.is_configured:
            logger.error("Mail config missing or invalid")
            campaign.status = 'failed'
            campaign.save()
            return

        # Get recipients
        recipients = EmailLog.objects.filter(campaign=campaign, status='pending')
        # If no pending logs, maybe it's a fresh start? 
        # The logic seems to rely on logs being pre-created or created here?
        # Checking previous implementation... it iterates recipients_ids if no logs?
        # The original code iterated `campaign.recipient_ids`.
        
        # Let's stick to original logic but add logging
        recipient_ids = campaign.recipient_ids
        processed_count = 0
        
        # We need to know if we are resuming or starting.
        # If logs exist, we might be resuming.
        existing_logs = EmailLog.objects.filter(campaign=campaign)
        
        final_recipients = []
        
        if existing_logs.exists():
             # Resume: only pending
             pending_logs = existing_logs.filter(status='pending')
             # We need to map back to recipient objects or just use logs
             # The original code looped through EmailRecipient objects based on ids.
             # This is a bit tricky if we want to support resume.
             # precise resumption requires checking if a log exists for that recipient.
             pass
        
        recipients_list = EmailRecipient.objects.filter(id__in=recipient_ids)
        
        sent_count = campaign.sent_count
        failed_count = campaign.failed_count
        
        logger.info(f"Targeting {len(recipients_list)} recipients.")

        for i, recipient in enumerate(recipients_list):
            # Check if already processed (in case of restart)
            if EmailLog.objects.filter(campaign=campaign, recipient_email=recipient.email).exclude(status='pending').exists():
                continue

            try:
                # Create or Get Log
                log, created = EmailLog.objects.get_or_create(
                    campaign=campaign,
                    recipient_email=recipient.email,
                    defaults={
                        'recipient_name': recipient.name,
                        'status': 'pending'
                    }
                )
                
                log_id = str(log.id)
                
                # Check Pause
                campaign.refresh_from_db()
                if campaign.status == 'paused':
                    logger.info("Campaign paused by user.")
                    return

                # Personalize
                personalized_html = process_template_variables(
                    base_html_content, # Use base_html_content
                    recipient.email,
                    recipient.name,
                    log_id,
                    config.tracking_enabled,
                    base_url
                )
                
                result = send_email(
                    recipient.email,
                    campaign.subject,
                    personalized_html,
                    config,
                    recipient_phone=recipient.phone
                )
                
                # Update Log and Recipient
                log.status = 'sent' if result['success'] else 'failed'
                log.error_message = json.dumps(result.get('error')) if not result['success'] else None
                log.sent_at = timezone.now()
                log.save()
                
                recipient.status = 'sent' if result['success'] else 'failed'
                recipient.save()
                
                if result['success']:
                    sent_count += 1
                else:
                    failed_count += 1
                    logger.warning(f"Failed to send to {recipient.email}: {result.get('error')}")
                
                # Update live stats
                campaign.sent_count = sent_count
                campaign.failed_count = failed_count
                campaign.save()
                
                # Delay
                if i < len(recipients_list) - 1 and campaign.delay_seconds > 0:
                    time.sleep(campaign.delay_seconds)
                    
            except Exception as e:
                logger.error(f"Error processing recipient {recipient.email}: {e}")
                
        final_status = 'failed' if failed_count == len(recipients_list) and len(recipients_list) > 0 else 'sent'
        campaign.status = final_status
        campaign.sent_at = timezone.now()
        campaign.save()
        logger.info(f"Campaign finished. Status: {final_status}. Sent: {sent_count}, Failed: {failed_count}")
        
        # Telegram Notification
        if config.telegram_notifications_enabled and config.telegram_bot_token and config.telegram_chat_id:
            try:
                # Identify failed recipients for report
                failed_logs = EmailLog.objects.filter(campaign=campaign, status='failed')
                failed_list = [{'email': l.recipient_email, 'error': l.error_message} for l in failed_logs]
                
                pdf_buffer = generate_campaign_pdf(campaign, sent_count, failed_count, failed_list)
                
                caption = (
                    f"📊 *Campaign Report*\n"
                    f"Name: {campaign.name}\n"
                    f"✅ Sent: {sent_count}\n"
                    f"❌ Failed: {failed_count}\n"
                    f"Status: {final_status.upper()}"
                )
                
                files = {'document': ('campaign_report.pdf', pdf_buffer, 'application/pdf')}
                data = {'chat_id': config.telegram_chat_id, 'caption': caption, 'parse_mode': 'Markdown'}
                
                requests.post(
                    f"https://api.telegram.org/bot{config.telegram_bot_token}/sendDocument",
                    data=data,
                    files=files
                )
                logger.info("Telegram report sent")
            except Exception as e:
                logger.error(f"Failed to send Telegram report: {e}")

    except Exception as e:
        logger.error(f"Campaign processing error: {e}")
    finally:
        connections.close_all()

def process_campaign(campaign_id, base_url):
    t = threading.Thread(target=process_campaign_task, args=(campaign_id, base_url))
    t.start()
