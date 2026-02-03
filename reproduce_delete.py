import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'django_server'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mail_muse.settings')
django.setup()

from api.models import EmailCampaign

def test_campaign_deletion():
    print("Creating test campaign...")
    campaign = EmailCampaign.objects.create(
        name="Test Campaign Deletion",
        subject="Test Subject",
        html_content="<p>Test</p>"
    )
    campaign_id = campaign.id
    print(f"Created campaign: {campaign_id}")

    print("Attempting to delete campaign...")
    try:
        campaign.delete()
        print("Deletion successful.")
    except Exception as e:
        print(f"Deletion failed: {e}")

    # Verify it's gone
    if not EmailCampaign.objects.filter(id=campaign_id).exists():
        print("Campaign verified as deleted.")
    else:
        print("ERROR: Campaign still exists.")

if __name__ == "__main__":
    test_campaign_deletion()
