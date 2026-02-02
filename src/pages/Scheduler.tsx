import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar, Clock, Play, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-warning/20 text-warning',
  sending: 'bg-primary/20 text-primary',
  sent: 'bg-success/20 text-success',
  failed: 'bg-destructive/20 text-destructive',
  paused: 'bg-muted text-muted-foreground',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  scheduled: Clock,
  sending: Loader2,
  sent: CheckCircle,
  failed: AlertCircle,
};

export default function Scheduler() {
  const { campaigns, isLoading, startCampaign, deleteCampaign } = useCampaigns();

  const scheduledCampaigns = campaigns.filter((c) => c.status === 'scheduled');
  const activeCampaigns = campaigns.filter((c) => c.status === 'sending');
  const completedCampaigns = campaigns.filter((c) => c.status === 'sent' || c.status === 'failed');

  const getProgress = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0;
    return ((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100;
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Scheduler</h1>
          <p className="text-muted-foreground mt-1">
            Manage scheduled and active email campaigns
          </p>
        </div>

        {/* Active Campaigns */}
        {activeCampaigns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-primary/20">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Active Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  {activeCampaigns.length} campaigns currently sending
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {activeCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-4 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {Math.round(getProgress(campaign))}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.sent_count}/{campaign.total_recipients} sent
                      </p>
                    </div>
                  </div>
                  <Progress value={getProgress(campaign)} className="h-2" />
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{campaign.sent_count} sent, {campaign.failed_count} failed</span>
                    <span>{campaign.delay_seconds}s delay between emails</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-warning/10">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Scheduled Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  {scheduledCampaigns.length} campaigns scheduled
                </p>
              </div>
            </div>

            {scheduledCampaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No scheduled campaigns</p>
                <p className="text-sm">Schedule emails from the Compose page</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <Badge className={statusStyles.scheduled}>Scheduled</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{campaign.subject}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {campaign.total_recipients} recipients
                      </span>
                      {campaign.scheduled_at && (
                        <span className="text-primary">
                          {format(new Date(campaign.scheduled_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startCampaign({ campaignId: campaign.id, delaySeconds: campaign.delay_seconds })}
                        className="gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Start Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCampaign(campaign.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Completed Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  {completedCampaigns.length} campaigns completed
                </p>
              </div>
            </div>

            {completedCampaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No completed campaigns</p>
                <p className="text-sm">Completed campaigns will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {completedCampaigns.slice(0, 10).map((campaign) => {
                  const StatusIcon = statusIcons[campaign.status] || CheckCircle;
                  return (
                    <div
                      key={campaign.id}
                      className="p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4 text-muted-foreground" />
                          <h4 className="font-medium">{campaign.name}</h4>
                        </div>
                        <Badge className={cn('capitalize', statusStyles[campaign.status])}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {campaign.sent_count} sent, {campaign.failed_count} failed
                        </span>
                        {campaign.sent_at && (
                          <span>
                            {format(new Date(campaign.sent_at), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Campaign Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-2xl font-bold text-warning">
                {scheduledCampaigns.length}
              </p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-2xl font-bold text-primary">
                {activeCampaigns.length}
              </p>
              <p className="text-sm text-muted-foreground">Sending</p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <p className="text-2xl font-bold text-success">
                {campaigns.filter((c) => c.status === 'sent').length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-2xl font-bold text-destructive">
                {campaigns.filter((c) => c.status === 'failed').length}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
