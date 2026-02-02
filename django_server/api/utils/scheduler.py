import threading
import time
import os
from django.utils import timezone
from api.models import EmailCampaign
from api.utils.mailer import process_campaign

def run_scheduler():
    print("Scheduler thread started...")
    while True:
        try:
            now = timezone.now()
            # Find campaigns that are scheduled and due
            campaigns = EmailCampaign.objects.filter(status='scheduled', scheduled_at__lte=now)
            
            for campaign in campaigns:
                print(f"Scheduler: Executing campaign {campaign.id} - {campaign.name}")
                # For background tasks, we assume a default base URL if not stored.
                # ideally this should be in settings/config
                base_url = "http://localhost:8000" 
                process_campaign(campaign.id, base_url)
                
            # Sleep for 60 seconds before next check
            time.sleep(60)
        except Exception as e:
            print(f"Scheduler Error: {e}")
            time.sleep(60)

def start_scheduler():
    # Only start scheduler in the main process (not reloader) to avoid duplicates
    if os.environ.get('RUN_MAIN') == 'true':
        t = threading.Thread(target=run_scheduler, daemon=True)
        t.start()
