import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Clock, FileCode, Eye, TestTube, Loader2, Play } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecipients } from '@/hooks/useRecipients';
import { useTemplates } from '@/hooks/useTemplates';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { useSendgridConfig } from '@/hooks/useSendgridConfig';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import api from '@/lib/api';

export default function Compose() {
  const { recipients, isLoading: recipientsLoading } = useRecipients();
  const { templates } = useTemplates();
  const { createCampaign, startCampaign } = useCampaigns();
  const { isConfigured, sendTestEmail, isSendingTest } = useSendgridConfig();

  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #0d9488; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Subject Here</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your email content goes here...</p>
    </div>
    <div class="footer">
      <p>© 2024 Your Company. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('10');
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Progress tracking
  const [isSending, setIsSending] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [progress, setProgress] = useState(0);

  // Subscribe to realtime updates for active campaign
  useEffect(() => {
    if (!activeCampaign || !isSending) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get('/campaigns');
        const updated = data.find((c: any) => c.id === activeCampaign.id);
        if (updated) {
          setActiveCampaign(updated);

          if (updated.total_recipients > 0) {
            const progressPercent = ((updated.sent_count + updated.failed_count) / updated.total_recipients) * 100;
            setProgress(progressPercent);
          }

          if (updated.status === 'sent' || updated.status === 'failed') {
            setIsSending(false);
            toast.success(`Campaign completed! ${updated.sent_count} sent, ${updated.failed_count} failed`);
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [activeCampaign?.id, isSending]);

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const selectAllRecipients = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(recipients.map((r) => r.id));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject);
      setHtmlContent(template.html_content);
    }
  };

  const handleSend = async () => {
    if (!isConfigured) {
      toast.error('Please configure SendGrid settings first');
      return;
    }
    if (!campaignName || !subject || selectedRecipients.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const scheduledAt = isScheduled && scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`)
        : undefined;

      const campaign = await createCampaign({
        name: campaignName,
        subject,
        htmlContent,
        templateId: selectedTemplate || undefined,
        recipientIds: selectedRecipients,
        delaySeconds: parseInt(delaySeconds) || 0,
        scheduledAt,
      });

      if (isScheduled) {
        toast.success('Campaign scheduled successfully!');
        // Reset form
        setCampaignName('');
        setSubject('');
        setSelectedRecipients([]);
        setIsScheduled(false);
      } else {
        // Start sending immediately
        setActiveCampaign(campaign);
        setProgress(0);
        setIsSending(true);
        startCampaign({ campaignId: campaign.id, delaySeconds: parseInt(delaySeconds) || 0 });
      }
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const handleSendTestEmail = async () => {
    if (!isConfigured) {
      toast.error('Please configure SendGrid settings first');
      return;
    }
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    if (!subject) {
      toast.error('Please enter a subject');
      return;
    }

    try {
      await sendTestEmail({ toEmail: testEmail, subject, htmlContent });
    } catch (error) {
      // Error handled in hook
    }
  };

  if (recipientsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Compose Email</h1>
          <p className="text-muted-foreground mt-1">
            Create and send email campaigns
          </p>
        </div>

        {/* Progress Section */}
        {isSending && activeCampaign && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <h3 className="font-semibold">Sending Campaign: {activeCampaign.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeCampaign.sent_count + activeCampaign.failed_count} of {activeCampaign.total_recipients} emails processed
                    {parseInt(delaySeconds) > 0 && ` (${delaySeconds}s delay between emails)`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
                <p className="text-xs text-muted-foreground">
                  {activeCampaign.sent_count} sent, {activeCampaign.failed_count} failed
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                Campaign Details
              </h3>

              <div>
                <label className="text-sm font-medium mb-2 block">Campaign Name *</label>
                <Input
                  placeholder="My Email Campaign"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  disabled={isSending}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Subject *</label>
                <Input
                  placeholder="Your email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSending}
                />
              </div>

              {templates.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Use Template</label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect} disabled={isSending}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">HTML Content</h3>
                <Button
                  variant={showPreview ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </div>

              {/* Template Variables Help */}
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Available Template Variables:</p>
                <div className="flex flex-wrap gap-2">
                  <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs cursor-pointer hover:bg-primary/20"
                    onClick={() => setHtmlContent(htmlContent + '{{name}}')}
                  >{"{{name}}"}</code>
                  <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs cursor-pointer hover:bg-primary/20"
                    onClick={() => setHtmlContent(htmlContent + '{{email}}')}
                  >{"{{email}}"}</code>
                  <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs cursor-pointer hover:bg-primary/20"
                    onClick={() => setHtmlContent(htmlContent + '{{tracking}}')}
                  >{"{{tracking}}"}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click to insert. <strong>{"{{name}}"}</strong> = recipient name, <strong>{"{{email}}"}</strong> = recipient email, <strong>{"{{tracking}}"}</strong> = open tracking pixel
                </p>
              </div>

              <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                <div className="h-[400px] border border-border rounded-lg overflow-hidden">
                  <Editor
                    height="100%"
                    defaultLanguage="html"
                    value={htmlContent}
                    onChange={(value) => setHtmlContent(value || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      readOnly: isSending,
                    }}
                  />
                </div>

                {showPreview && (
                  <div className="h-[400px] border border-border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={htmlContent}
                      title="Email Preview"
                      className="w-full h-full"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Send Test Email Section */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TestTube className="w-5 h-5 text-primary" />
                Send Test Email
              </h3>
              <p className="text-sm text-muted-foreground">
                Send a test email to verify your configuration is working correctly.
              </p>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="Enter test email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                  disabled={isSendingTest}
                />
                <Button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !isConfigured}
                  variant="outline"
                  className="gap-2"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
              {!isConfigured && (
                <p className="text-xs text-destructive">
                  ⚠️ Email not configured. Go to Settings to add your sender email.
                </p>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Scheduling & Delay
              </h3>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="schedule"
                  checked={isScheduled}
                  onCheckedChange={(checked) => setIsScheduled(checked as boolean)}
                  disabled={isSending}
                />
                <label htmlFor="schedule" className="text-sm font-medium cursor-pointer">
                  Schedule for later
                </label>
              </div>

              {isScheduled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date</label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      disabled={isSending}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Time</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      disabled={isSending}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Delay Between Emails (seconds)</label>
                <Input
                  type="number"
                  min="0"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(e.target.value)}
                  placeholder="0 = Send without delay"
                  disabled={isSending}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Time to wait between sending each email. Useful for avoiding rate limits.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Recipients</h3>
                <Button variant="ghost" size="sm" onClick={selectAllRecipients} disabled={isSending}>
                  {selectedRecipients.length === recipients.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {recipients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recipients added yet
                </p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={selectedRecipients.includes(recipient.id)}
                        onCheckedChange={() => toggleRecipient(recipient.id)}
                        disabled={isSending}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{recipient.email}</p>
                        {recipient.name && (
                          <p className="text-xs text-muted-foreground">{recipient.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {selectedRecipients.length} of {recipients.length} selected
                </p>
              </div>
            </div>

            <Button
              onClick={handleSend}
              className="w-full gap-2"
              size="lg"
              disabled={!campaignName || !subject || selectedRecipients.length === 0 || isSending || !isConfigured}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : isScheduled ? (
                <>
                  <Clock className="w-5 h-5" />
                  Schedule Campaign
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Campaign
                </>
              )}
            </Button>

            {!isConfigured && (
              <p className="text-xs text-center text-destructive">
                Configure your sender email in Settings before sending.
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
