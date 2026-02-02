import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mail_muse.settings')
django.setup()

from django.contrib.auth.models import User

username = 'testadmin'
password = 'testpassword123'
email = 'testadmin@example.com'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f"Superuser '{username}' created.")
else:
    print(f"Superuser '{username}' already exists.")
