import threading
import time
import os
import sys
import fcntl
import logging
from django.utils import timezone
from api.models import EmailCampaign
from api.utils.mailer import process_campaign
from django.conf import settings

# Configure Logger
logger = logging.getLogger('scheduler')
# Ensure unique handler
if not logger.handlers:
    # Log to project root
    log_path = os.path.join(settings.BASE_DIR, 'scheduler.log')
    handler = logging.FileHandler(log_path)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def run_scheduler():
    logger.info("Scheduler thread loop started")
    while True:
        try:
            now = timezone.now()
            # Find campaigns
            campaigns = EmailCampaign.objects.filter(status='scheduled', scheduled_at__lte=now)
            
            if campaigns.exists():
                logger.info(f"Found {campaigns.count()} due campaigns.")
            
            for campaign in campaigns:
                logger.info(f"Executing campaign {campaign.id} - {campaign.name}")
                base_url = "http://localhost:8000" 
                process_campaign(campaign.id, base_url)
                
            # Sleep 
            time.sleep(60)
        except Exception as e:
            logger.error(f"Scheduler Error: {e}")
            time.sleep(60)

def start_scheduler():
    try:
        # Lock file in base dir
        lock_path = os.path.join(settings.BASE_DIR, 'scheduler.lock')
        lock_file = open(lock_path, 'w')
        
        # Try to acquire non-blocking exclusive lock
        fcntl.lockf(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        
        # If successful, start thread
        t = threading.Thread(target=run_scheduler, daemon=True)
        t.start()
        logger.info("Scheduler lock acquired. Starting thread.")
        
    except IOError:
        # Lock is held by another process
        # logger.warning("Scheduler lock held by another process. Skipping.")
        pass
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
