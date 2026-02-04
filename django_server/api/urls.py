from django.urls import path
from .views import (
    ConfigView, 
    RecipientListView, RecipientDetailView, RecipientBulkView,
    TemplateListView, TemplateDetailView,
    CampaignListView, CampaignDetailView, CampaignStatusView, CampaignStartView,
    CampaignLogsView, CampaignServerLogsView, StatsSummaryView,
    TestEmailView, TrackEmailView, RecentActivityView,
    SecurityLogImportView, SecurityLogAnalyticsView, SecurityLogActionView,
    StatsExportView, SecurityLogExportView, SecurityLogBulkView, ClearLogsView
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
    path('campaigns/<str:pk>/server-logs', CampaignServerLogsView.as_view()),
    
    path('stats/summary', StatsSummaryView.as_view()),
    path('test-email', TestEmailView.as_view()),
    path('test-email', TestEmailView.as_view()),
    path('track-email', TrackEmailView.as_view()),
    path('stats/recent-activity', RecentActivityView.as_view()),
    path('security/import', SecurityLogImportView.as_view()),
    path('security/stats', SecurityLogAnalyticsView.as_view()),
    path('security/log/<str:pk>', SecurityLogActionView.as_view()),
    path('stats/export', StatsExportView.as_view()),
    path('security/export', SecurityLogExportView.as_view()),
    path('security/bulk', SecurityLogBulkView.as_view()),
    path('clear-logs', ClearLogsView.as_view()),
]
