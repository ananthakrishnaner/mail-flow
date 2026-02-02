import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export type EmailProvider = 'sendgrid' | 'mailgun' | 'smtp';

export interface MailConfig {
  id: string;
  provider: EmailProvider;
  from_email: string;
  from_name: string;
  api_key?: string; // SendGrid
  mailgun_api_key?: string;
  mailgun_domain?: string;
  mailgun_region?: 'us' | 'eu';
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_secure?: boolean;
  is_configured: boolean;
  tracking_enabled?: boolean;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_notifications_enabled?: boolean;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_from_number?: string;
  created_at: string;
  updated_at: string;
}

export const useSendgridConfig = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['mail-config'],
    queryFn: async () => {
      const { data } = await api.get('/config');
      return data as MailConfig | null;
    },
  });

  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<MailConfig>) => {
      await api.post('/config', {
        ...newConfig,
        is_configured: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-config'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const updateTracking = useMutation({
    mutationFn: async (trackingEnabled: boolean) => {
      await api.post('/config', {
        ...config,
        tracking_enabled: trackingEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-config'] });
      toast.success('Tracking settings updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update tracking: ${error.message}`);
    },
  });

  const saveTelegramConfig = useMutation({
    mutationFn: async ({
      botToken,
      chatId,
      enabled
    }: {
      botToken: string;
      chatId: string;
      enabled: boolean;
    }) => {
      await api.post('/config', {
        ...config,
        telegram_bot_token: botToken,
        telegram_chat_id: chatId,
        telegram_notifications_enabled: enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-config'] });
      toast.success('Telegram settings saved');
    },
    onError: (error: any) => {
      toast.error(`Failed to save Telegram settings: ${error.message}`);
    },
  });

  const saveTwilioConfig = useMutation({
    mutationFn: async ({
      accountSid,
      authToken,
      fromNumber
    }: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
    }) => {
      await api.post('/config', {
        ...config,
        twilio_account_sid: accountSid,
        twilio_auth_token: authToken,
        twilio_from_number: fromNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-config'] });
      toast.success('Twilio settings saved');
    },
    onError: (error: any) => {
      toast.error(`Failed to save Twilio settings: ${error.message}`);
    },
  });

  const testTelegram = useMutation({
    mutationFn: async () => {
      toast.info('Telegram test not implemented in local backend yet');
    },
  });

  const sendTestEmail = useMutation({
    mutationFn: async ({ toEmail, subject, htmlContent }: { toEmail: string; subject: string; htmlContent: string }) => {
      await api.post('/test-email', {
        to: toEmail,
        subject,
        html: htmlContent,
      });
    },
    onSuccess: () => {
      toast.success('Test email sent successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to send test email: ${error.message}`);
    },
  });

  return {
    config,
    isLoading,
    isConfigured: config?.is_configured ?? false,
    trackingEnabled: config?.tracking_enabled ?? true,
    telegramEnabled: config?.telegram_notifications_enabled ?? false,
    saveConfig: saveConfig.mutate,
    updateTracking: updateTracking.mutate,
    saveTelegramConfig: saveTelegramConfig.mutate,
    saveTwilioConfig: saveTwilioConfig.mutate,
    testTelegram: testTelegram.mutate,
    isTestingTelegram: testTelegram.isPending,
    sendTestEmail: sendTestEmail.mutateAsync,
    isSendingTest: sendTestEmail.isPending,
  };
};