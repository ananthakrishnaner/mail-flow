import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface EmailStats {
  totalRecipients: number;
  totalSent: number;
  totalPending: number;
  totalFailed: number;
  totalScheduled: number;
  totalCampaigns: number;
  totalOpens: number;
  totalClicks: number;
  uniqueOpens: number;
  uniqueClicks: number;
  dailyStats: { date: string; sent: number; failed: number; opens: number; clicks: number }[];
}

export const useEmailStats = (campaignId?: string) => {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['email-stats', campaignId],
    queryFn: async (): Promise<EmailStats> => {
      const { data: recipients } = await api.get('/recipients');
      const { data: campaigns } = await api.get('/campaigns');
      const { data: summary } = await api.get('/stats/summary');

      let sentCount = summary.totalSent || 0;
      let failedCount = summary.totalFailed || 0;
      let scheduledCount = campaigns.filter((c: any) => c.status === 'scheduled').length;
      let totalCampaigns = summary.totalCampaigns || 0;

      if (campaignId && campaignId !== 'all') {
        const campaign = campaigns.find((c: any) => c.id === campaignId);
        sentCount = campaign?.sent_count || 0;
        failedCount = campaign?.failed_count || 0;
        scheduledCount = campaign?.status === 'scheduled' ? 1 : 0;
      }

      // Mocking tracking stats for now
      const totalOpens = 0;
      const totalClicks = 0;
      const uniqueOpens = 0;
      const uniqueClicks = 0;

      // Group by date (simplified)
      const dailyStats: any[] = [];
      const today = new Date().toISOString().split('T')[0];
      dailyStats.push({ date: today, sent: sentCount, failed: failedCount, opens: 0, clicks: 0 });

      return {
        totalRecipients: recipients.length,
        totalSent: sentCount,
        totalPending: 0,
        totalFailed: failedCount,
        totalScheduled: scheduledCount,
        totalCampaigns,
        totalOpens,
        totalClicks,
        uniqueOpens,
        uniqueClicks,
        dailyStats,
      };
    },
    refetchInterval: 5000,
  });

  return {
    stats: stats ?? {
      totalRecipients: 0,
      totalSent: 0,
      totalPending: 0,
      totalFailed: 0,
      totalScheduled: 0,
      totalCampaigns: 0,
      totalOpens: 0,
      totalClicks: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
      dailyStats: [],
    },
    isLoading,
  };
};