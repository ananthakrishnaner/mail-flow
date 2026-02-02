from rest_framework import serializers
from .models import MailConfig, EmailRecipient, EmailTemplate, EmailCampaign, EmailLog

class MailConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailConfig
        fields = '__all__'

class EmailRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailRecipient
        fields = '__all__'

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'

class EmailCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailCampaign
        fields = '__all__'

class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = '__all__'
