import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCampaigns } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-warning/20 text-warning',
  sending: 'bg-primary/20 text-primary',
  sent: 'bg-success/20 text-success',
  failed: 'bg-destructive/20 text-destructive',
  paused: 'bg-muted text-muted-foreground',
};

export function RecentCampaigns() {
  const { campaigns, isLoading } = useCampaigns();

  const recentCampaigns = campaigns.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Recent Campaigns</h3>
          <p className="text-sm text-muted-foreground">Latest email campaigns</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading...</p>
        </div>
      ) : recentCampaigns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No campaigns yet</p>
          <p className="text-sm">Create your first campaign to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{campaign.name}</p>
                <p className="text-sm text-muted-foreground">{campaign.subject}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{campaign.total_recipients} recipients</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Badge className={cn('capitalize', statusStyles[campaign.status] || statusStyles.draft)}>
                  {campaign.status}
                </Badge>
                <div className="flex gap-2 ml-4">
                  <a
                    href={`${API_URL}/stats/export?type=docx&campaign_id=${campaign.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    title="Download Word Report"
                  >
                    <Download size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
