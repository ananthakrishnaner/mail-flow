from django.urls import path
from .views import (
    ConfigView, 
    RecipientListView, RecipientDetailView, RecipientBulkView,
    TemplateListView, TemplateDetailView,
    CampaignListView, CampaignDetailView, CampaignStatusView, CampaignStartView,
    CampaignLogsView, StatsSummaryView,
    TestEmailView, TrackEmailView
)

urlpatterns = [
    path('config', ConfigView.as_view()),
    
    path('recipients', RecipientListView.as_view()),
    path('recipients/bulk', RecipientBulkView.as_view()),
    path('recipients/<str:pk>', RecipientDetailView.as_view()),
    
    path('templates', TemplateListView.as_view()),
    path('templates/<str:pk>', TemplateDetailView.as_view()),
    
    path('campaigns', CampaignListView.as_view()),
    path('campaigns/<str:pk>', CampaignDetailView.as_view()),
    path('campaigns/<str:pk>/status', CampaignStatusView.as_view()),
    path('campaigns/<str:pk>/start', CampaignStartView.as_view()),
    path('campaigns/<str:pk>/logs', CampaignLogsView.as_view()),
    
    path('stats/summary', StatsSummaryView.as_view()),
    path('test-email', TestEmailView.as_view()),
    path('track-email', TrackEmailView.as_view()),
]
