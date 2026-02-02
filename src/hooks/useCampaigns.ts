import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  html_content: string | null;
  template_id: string | null;
  recipient_ids: string[];
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  delay_seconds: number;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export const useCampaigns = () => {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/campaigns');
      return data as Campaign[];
    },
  });

  // Simple polling instead of realtime for now (or just invalidate on mutations)
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const createCampaign = useMutation({
    mutationFn: async ({
      name,
      subject,
      htmlContent,
      templateId,
      recipientIds,
      delaySeconds,
      scheduledAt,
    }: {
      name: string;
      subject: string;
      htmlContent: string;
      templateId?: string;
      recipientIds: string[];
      delaySeconds: number;
      scheduledAt?: Date;
    }) => {
      const { data } = await api.post('/campaigns', {
        name,
        subject,
        html_content: htmlContent,
        template_id: templateId || null,
        recipient_ids: recipientIds,
        delay_seconds: delaySeconds,
        scheduled_at: scheduledAt?.toISOString() || null,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  const startCampaign = useMutation({
    mutationFn: async ({ campaignId, delaySeconds }: { campaignId: string; delaySeconds: number }) => {
      const { data } = await api.post(`/campaigns/${campaignId}/start`, { delaySeconds });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Campaign started!`);
    },
    onError: (error: any) => {
      toast.error(`Failed to start campaign: ${error.message}`);
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/campaigns/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createCampaign.mutateAsync,
    startCampaign: startCampaign.mutate,
    deleteCampaign: deleteCampaign.mutate,
    updateCampaignStatus: updateCampaignStatus.mutate,
  };
};
