
import os
import django
import sys
import json
import uuid

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mail_muse.settings')
django.setup()

from api.models import EmailRecipient

def debug_crash():
    print("--- Debugging Crash ---")
    
    # IDs from user log
    raw_ids = ['8c29637a-ec94-4b3b-97f8-022165db09cd', 'bdb3b180-bcac-46af-bc77-46dc1496c3c6', '96879fc2-1425-45e4-af2c-7932386f5fa1', '4956b54b-03f3-4396-b113-d70d65d599c2']
    print(f"Raw IDs: {raw_ids}")
    
    # Attempt 1: Raw string usage
    try:
        print("Attempting filter with raw strings...")
        qs = EmailRecipient.objects.filter(id__in=raw_ids)
        print(f"Count (Strings): {qs.count()}")
    except Exception as e:
        print(f"CRASH (Strings): {e}")

    # Attempt 2: UUID conversion
    try:
        print("Attempting filter with UUID objects...")
        uuid_ids = [uuid.UUID(i) for i in raw_ids]
        qs = EmailRecipient.objects.filter(id__in=uuid_ids)
        print(f"Count (UUIDs): {qs.count()}")
    except Exception as e:
        print(f"CRASH (UUIDs): {e}")

    # Attempt 3: Fetching one by one
    print("Fetching one by one:")
    for i in raw_ids:
        try:
            r = EmailRecipient.objects.get(id=i)
            print(f" - Found {i}: {r.email}")
        except Exception as e:
            print(f" - Failed {i}: {e}")

if __name__ == "__main__":
    debug_crash()
