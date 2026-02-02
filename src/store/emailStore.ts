import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EmailRecipient, EmailTemplate, EmailCampaign, SendGridConfig, ScheduledJob } from '@/types/email';

interface EmailStore {
  recipients: EmailRecipient[];
  templates: EmailTemplate[];
  campaigns: EmailCampaign[];
  scheduledJobs: ScheduledJob[];
  config: SendGridConfig;
  
  // Recipients
  addRecipient: (email: string, name?: string) => void;
  addBulkRecipients: (emails: string[]) => void;
  removeRecipient: (id: string) => void;
  updateRecipientStatus: (id: string, status: EmailRecipient['status']) => void;
  
  // Templates
  addTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteTemplate: (id: string) => void;
  
  // Campaigns
  addCampaign: (campaign: Omit<EmailCampaign, 'id' | 'createdAt' | 'stats'>) => void;
  updateCampaign: (id: string, updates: Partial<EmailCampaign>) => void;
  deleteCampaign: (id: string) => void;
  
  // Config
  updateConfig: (config: Partial<SendGridConfig>) => void;
  
  // Scheduled Jobs
  addScheduledJob: (job: Omit<ScheduledJob, 'id'>) => void;
  updateJobStatus: (id: string, status: ScheduledJob['status']) => void;
  removeJob: (id: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useEmailStore = create<EmailStore>()(
  persist(
    (set) => ({
      recipients: [],
      templates: [],
      campaigns: [],
      scheduledJobs: [],
      config: {
        apiKey: '',
        fromEmail: '',
        fromName: '',
        isConfigured: false,
      },

      addRecipient: (email, name) =>
        set((state) => ({
          recipients: [
            ...state.recipients,
            {
              id: generateId(),
              email,
              name,
              status: 'pending',
              addedAt: new Date(),
            },
          ],
        })),

      addBulkRecipients: (emails) =>
        set((state) => ({
          recipients: [
            ...state.recipients,
            ...emails.map((email) => ({
              id: generateId(),
              email: email.trim(),
              status: 'pending' as const,
              addedAt: new Date(),
            })),
          ],
        })),

      removeRecipient: (id) =>
        set((state) => ({
          recipients: state.recipients.filter((r) => r.id !== id),
        })),

      updateRecipientStatus: (id, status) =>
        set((state) => ({
          recipients: state.recipients.map((r) =>
            r.id === id ? { ...r, status } : r
          ),
        })),

      addTemplate: (template) =>
        set((state) => ({
          templates: [
            ...state.templates,
            {
              ...template,
              id: generateId(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })),

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      addCampaign: (campaign) =>
        set((state) => ({
          campaigns: [
            ...state.campaigns,
            {
              ...campaign,
              id: generateId(),
              createdAt: new Date(),
              stats: {
                total: campaign.recipients.length,
                sent: 0,
                pending: campaign.recipients.length,
                failed: 0,
              },
            },
          ],
        })),

      updateCampaign: (id, updates) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCampaign: (id) =>
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
        })),

      updateConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      addScheduledJob: (job) =>
        set((state) => ({
          scheduledJobs: [
            ...state.scheduledJobs,
            { ...job, id: generateId() },
          ],
        })),

      updateJobStatus: (id, status) =>
        set((state) => ({
          scheduledJobs: state.scheduledJobs.map((j) =>
            j.id === id ? { ...j, status } : j
          ),
        })),

      removeJob: (id) =>
        set((state) => ({
          scheduledJobs: state.scheduledJobs.filter((j) => j.id !== id),
        })),
    }),
    {
      name: 'email-dashboard-storage',
    }
  )
);
