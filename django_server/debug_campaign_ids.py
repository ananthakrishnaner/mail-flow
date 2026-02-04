
import os
import django
import sys

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mail_muse.settings')
django.setup()

from api.models import EmailCampaign, EmailRecipient

def debug_latest_campaign():
    print("--- Debugging Latest Campaign Data ---")
    
    # Get latest campaign
    campaign = EmailCampaign.objects.order_by('-created_at').first()
    if not campaign:
        print("No campaigns found in database!")
        return

    print(f"Campaign Found: {campaign.name} (ID: {campaign.id})")
    print(f"Status: {campaign.status}")
    print(f"Recipient IDs (JSON): {campaign.recipient_ids}")
    print(f"Type of recipient_ids: {type(campaign.recipient_ids)}")
    
    if not campaign.recipient_ids:
        print("ERROR: recipient_ids is empty or None!")
        return

    # Check first ID
    first_id = campaign.recipient_ids[0]
    print(f"First ID from list: '{first_id}' (Type: {type(first_id)})")

    # Try to find this specific recipient
    try:
        recipient = EmailRecipient.objects.get(id=first_id)
        print(f"SUCCESS: Found recipient in DB: {recipient.email} (ID: {recipient.id})")
    except EmailRecipient.DoesNotExist:
        print(f"FAILURE: Could not find recipient with ID '{first_id}' in EmailRecipient table.")
        print("Checking first 5 recipients in DB:")
        for r in EmailRecipient.objects.all()[:5]:
            print(f" - {r.email}: '{r.id}'")

    # Check filter count
    recipients_qs = EmailRecipient.objects.filter(id__in=campaign.recipient_ids)
    print(f"Objects found via filter(id__in=...): {recipients_qs.count()}")
    
    if recipients_qs.count() == 0:
        print("CRITICAL: Filter returned 0 results despite having IDs.")

if __name__ == "__main__":
    debug_latest_campaign()
