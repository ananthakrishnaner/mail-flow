import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import time
import json
import threading
import re
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
    
    # Title
    elements.append(Paragraph(f"Campaign Report: {campaign.name}", styles['Title']))
    elements.append(Spacer(1, 12))
    
    # Summary
    elements.append(Paragraph(f"<b>Status:</b> {campaign.status.upper()}", styles['Normal']))
    elements.append(Paragraph(f"<b>Sent Successfully:</b> {sent_count}", styles['Normal']))
    elements.append(Paragraph(f"<b>Failed:</b> {failed_count}", styles['Normal']))
    elements.append(Paragraph(f"<b>Completed At:</b> {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 24))
    
    # Failed Emails Table
    if failed_recipients:
        elements.append(Paragraph("Failed Recipients Details", styles['Heading2']))
        elements.append(Spacer(1, 12))
        
        data = [['Email', 'Error']]
        for f in failed_recipients:
            # Truncate error if too long
            err = str(f.get('error', 'Unknown'))
            if len(err) > 50:
                err = err[:47] + '...'
            data.append([f['email'], err])
            
        t = Table(data, colWidths=[200, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.red),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("No failures recorded.", styles['Normal']))
        
    doc.build(elements)
    buffer.seek(0)
    return buffer

def process_campaign_task(campaign_id, base_url):
    # This runs in a thread
    try:
        # Close connections in this thread to ensure new connection is created
        from django.db import connections
        connections.close_all()
        
        campaign = EmailCampaign.objects.get(id=campaign_id)
        config = MailConfig.objects.first()
        
        if not config or not config.is_configured:
            campaign.status = 'failed'
            campaign.save()
            print('Email provider not configured')
            return

        print(f"Starting campaign {campaign_id} using {config.provider}")
        
        recipient_ids = campaign.recipient_ids # JSON list
        recipients = EmailRecipient.objects.filter(id__in=recipient_ids)
        
        campaign.status = 'sending'
        campaign.total_recipients = len(recipients)
        campaign.save()
        
        # Fetch template content if needed
        base_html_content = campaign.html_content
        if not base_html_content and campaign.template:
            base_html_content = campaign.template.html_content or ''
            
        sent_count = 0
        failed_count = 0
        
        for i, recipient in enumerate(recipients):
            try:
                # Refresh campaign status (check pause)
                campaign.refresh_from_db()
                while campaign.status == 'paused':
                    time.sleep(5)
                    campaign.refresh_from_db()
                
                if campaign.status != 'sending':
                    print(f"Campaign stopped/cancelled. Status: {campaign.status}")
                    return

                log_id = str(uuid.uuid4())
                
                # Create Pending Log
                EmailLog.objects.create(
                    id=log_id,
                    campaign=campaign,
                    recipient=recipient,
                    recipient_email=recipient.email,
                    status='pending'
                )
                
                personalized_html = process_template_variables(
                    base_html_content,
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
                log = EmailLog.objects.get(id=log_id)
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
                
                # Update live stats
                campaign.sent_count = sent_count
                campaign.failed_count = failed_count
                campaign.save()
                
                # Delay
                if i < len(recipients) - 1 and campaign.delay_seconds > 0:
                    time.sleep(campaign.delay_seconds)
                    
            except Exception as e:
                print(f"Error processing recipient {recipient.email}: {e}")
                
        final_status = 'failed' if failed_count == len(recipients) and len(recipients) > 0 else 'sent'
        campaign.status = final_status
        campaign.sent_at = timezone.now()
        campaign.save()
        
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
                print("Telegram report sent")
            except Exception as e:
                print(f"Failed to send Telegram report: {e}")

    except Exception as e:
        print(f"Campaign processing error: {e}")

def process_campaign(campaign_id, base_url):
    t = threading.Thread(target=process_campaign_task, args=(campaign_id, base_url))
    t.start()
