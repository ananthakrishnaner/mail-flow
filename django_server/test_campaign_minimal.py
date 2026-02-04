#!/usr/bin/env python
"""
Minimal Campaign Send Test
This bypasses all the complex logic and directly tests the campaign loop
"""

import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mail_muse.settings')
django.setup()

from api.models import EmailRecipient, MailConfig, EmailCampaign
from api.utils.mailer import send_email
import time

def test_campaign_loop():
    print("=" * 60)
    print("MINIMAL CAMPAIGN SEND TEST")
    print("=" * 60)
    
    # Get config
    config = MailConfig.objects.first()
    if not config:
        print("❌ No mail config")
        return
    
    # Get campaign
    campaign = EmailCampaign.objects.filter(status='draft').first()
    if not campaign:
        print("❌ No draft campaign found")
        return
    
    print(f"\n✅ Testing Campaign: {campaign.name}")
    print(f"   Campaign ID: {campaign.id}")
    print(f"   Recipient IDs: {campaign.recipient_ids}")
    print(f"   Type: {type(campaign.recipient_ids)}")
    
    # Get recipients DIRECTLY without UUID conversion
    print("\n[1] Fetching recipients directly...")
    try:
        # Try raw query first
        recipients = EmailRecipient.objects.filter(id__in=campaign.recipient_ids)
        count = recipients.count()
        print(f"✅ Found {count} recipients")
        
        if count == 0:
            print("⚠️  No recipients found, trying with string IDs...")
            # Try converting to strings
            str_ids = [str(rid) for rid in campaign.recipient_ids]
            recipients = EmailRecipient.objects.filter(id__in=str_ids)
            count = recipients.count()
            print(f"✅ Found {count} recipients with string conversion")
        
        if count == 0:
            print("❌ Still no recipients found!")
            return
            
    except Exception as e:
        print(f"❌ DB Query failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Send to first recipient only
    print(f"\n[2] Sending test email to first recipient...")
    recipient = recipients.first()
    print(f"   To: {recipient.email}")
    
    try:
        result = send_email(
            to_email=recipient.email,
            subject=f"Test from Campaign: {campaign.subject}",
            html_content=campaign.html_content or "<h1>Test Email</h1>",
            config=config
        )
        
        if result.get('success'):
            print(f"✅ Email sent successfully!")
        else:
            print(f"❌ Send failed: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Exception during send: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_campaign_loop()
