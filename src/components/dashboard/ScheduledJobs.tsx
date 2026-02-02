import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCampaigns } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  scheduled: 'bg-warning/20 text-warning',
  sending: 'bg-primary/20 text-primary',
  sent: 'bg-success/20 text-success',
  failed: 'bg-destructive/20 text-destructive',
};

export function ScheduledJobs() {
  const { campaigns, deleteCampaign } = useCampaigns();

  const scheduledCampaigns = campaigns.filter(
    (c) => c.status === 'scheduled' || c.status === 'sending'
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Scheduled & Active Jobs</h3>
          <p className="text-sm text-muted-foreground">Upcoming and running dispatches</p>
        </div>
      </div>

      {scheduledCampaigns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No scheduled jobs</p>
          <p className="text-sm">Schedule emails to see them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduledCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {campaign.scheduled_at 
                      ? format(new Date(campaign.scheduled_at), 'MMM dd, yyyy HH:mm')
                      : `${campaign.sent_count}/${campaign.total_recipients} sent`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('capitalize', statusStyles[campaign.status] || statusStyles.scheduled)}>
                  {campaign.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
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
  );
}
