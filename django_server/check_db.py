
from api.models import EmailRecipient, EmailCampaign
import json
import uuid

def check_recipients():
    print("--- Checking Recipients via Shell ---")
    
    # IDs from the user's log
    target_ids = ['8c29637a-ec94-4b3b-97f8-022165db09cd', 'bdb3b180-bcac-46af-bc77-46dc1496c3c6', '96879fc2-1425-45e4-af2c-7932386f5fa1', '4956b54b-03f3-4396-b113-d70d65d599c2']
    print(f"Target IDs: {target_ids}")

    # 1. Count Total
    total = EmailRecipient.objects.count()
    print(f"Total Recipients in DB: {total}")

    # 2. Query by ID list (Strings)
    try:
        qs = EmailRecipient.objects.filter(id__in=target_ids)
        count = qs.count()
        print(f"Found via Strings: {count}")
        if count > 0:
            print("First 5 matches:", list(qs.values_list('email', flat=True)[:5]))
    except Exception as e:
        print(f"Error querying by strings: {e}")

    # 3. Query by ID list (UUIDs)
    try:
        uuid_ids = [uuid.UUID(i) for i in target_ids]
        qs = EmailRecipient.objects.filter(id__in=uuid_ids)
        count = qs.count()
        print(f"Found via UUIDs: {count}")
    except Exception as e:
        print(f"Error querying by UUIDs: {e}")

    # 4. Check Campaign
    try:
        cid = '0ad82b3c-cbe4-4259-8228-2554e92d6ef2'
        c = EmailCampaign.objects.get(id=cid)
        print(f"Campaign Status: {c.status}")
        print(f"Campaign Recipient IDs: {c.recipient_ids}")
    except Exception as e:
        print(f"Error fetching campaign: {e}")

check_recipients()
