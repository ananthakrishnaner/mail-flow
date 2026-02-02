export interface EmailRecipient {
  id: string;
  email: string;
  name?: string;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  addedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  templateId?: string;
  recipients: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  stats: {
    total: number;
    sent: number;
    pending: number;
    failed: number;
  };
  createdAt: Date;
}

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  isConfigured: boolean;
}

export interface ScheduledJob {
  id: string;
  campaignId: string;
  campaignName: string;
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface EmailStats {
  totalSent: number;
  pending: number;
  failed: number;
  scheduled: number;
  dailyStats: {
    date: string;
    sent: number;
    failed: number;
  }[];
}
