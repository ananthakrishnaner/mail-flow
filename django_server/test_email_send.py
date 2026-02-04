#!/usr/bin/env python
"""
Test Email Sending Script
This script fetches a recipient from the database and sends a test email
to verify that the email configuration is working correctly.
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mail_muse.settings')
django.setup()

from api.models import EmailRecipient, MailConfig
from api.utils.mailer import send_email

def test_email_sending():
    print("=" * 60)
    print("EMAIL SENDING TEST SCRIPT")
    print("=" * 60)
    
    # Step 1: Check Mail Configuration
    print("\n[1/4] Checking Mail Configuration...")
    config = MailConfig.objects.first()
    
    if not config:
        print("❌ ERROR: No mail configuration found!")
        print("   Please configure your email settings in the application first.")
        return False
    
    if not config.is_configured:
        print("❌ ERROR: Mail configuration is incomplete!")
        print("   Please complete your email settings in the application.")
        return False
    
    print(f"✅ Mail Config Found")
    print(f"   Provider: {config.provider}")
    print(f"   From Email: {config.from_email}")
    print(f"   From Name: {config.from_name}")
    
    # Step 2: Fetch a Recipient
    print("\n[2/4] Fetching a test recipient from database...")
    recipient = EmailRecipient.objects.first()
    
    if not recipient:
        print("❌ ERROR: No recipients found in database!")
        print("   Please add at least one recipient in the application first.")
        return False
    
    print(f"✅ Recipient Found")
    print(f"   Email: {recipient.email}")
    print(f"   Name: {recipient.name or 'N/A'}")
    
    # Step 3: Prepare Test Email
    print("\n[3/4] Preparing test email...")
    
    subject = "🧪 Test Email from Mail Muse"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }}
            .content {{
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }}
            .success {{
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🧪 Test Email</h1>
            <p>Mail Muse System Test</p>
        </div>
        <div class="content">
            <h2>Hello {recipient.name or 'there'}!</h2>
            
            <div class="success">
                <strong>✅ Success!</strong> If you're reading this, your email configuration is working correctly.
            </div>
            
            <p>This is a test email sent from your Mail Muse application to verify that:</p>
            <ul>
                <li>✅ Email provider is configured correctly</li>
                <li>✅ Authentication is working</li>
                <li>✅ Emails can be delivered successfully</li>
            </ul>
            
            <p><strong>Configuration Details:</strong></p>
            <ul>
                <li>Provider: {config.provider.upper()}</li>
                <li>From: {config.from_name} &lt;{config.from_email}&gt;</li>
            </ul>
            
            <div class="footer">
                <p>This is an automated test email from Mail Muse</p>
                <p>Sent at: {django.utils.timezone.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    print(f"✅ Test Email Prepared")
    print(f"   Subject: {subject}")
    print(f"   To: {recipient.email}")
    
    # Step 4: Send Email
    print("\n[4/4] Sending test email...")
    print("   (This may take a few seconds...)")
    
    try:
        result = send_email(
            to_email=recipient.email,
            subject=subject,
            html_content=html_content,
            config=config
        )
        
        if result.get('success'):
            print("\n" + "=" * 60)
            print("✅ SUCCESS! Test email sent successfully!")
            print("=" * 60)
            print(f"\nPlease check the inbox for: {recipient.email}")
            print("(Don't forget to check spam/junk folder)")
            return True
        else:
            error_msg = result.get('error', 'Unknown error')
            print("\n" + "=" * 60)
            print("❌ FAILED! Email could not be sent")
            print("=" * 60)
            print(f"\nError: {error_msg}")
            print("\nTroubleshooting tips:")
            print("1. Verify your API keys/credentials are correct")
            print("2. Check if your email provider account is active")
            print("3. Ensure your domain is verified (if using custom domain)")
            print("4. Check the server logs for more details")
            return False
            
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ EXCEPTION! An error occurred")
        print("=" * 60)
        print(f"\nError: {str(e)}")
        import traceback
        print("\nFull traceback:")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    import django.utils.timezone
    success = test_email_sending()
    sys.exit(0 if success else 1)
