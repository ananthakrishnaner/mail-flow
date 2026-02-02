import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmailChart } from '@/components/dashboard/EmailChart';
import { RecentCampaigns } from '@/components/dashboard/RecentCampaigns';
import { ScheduledJobs } from '@/components/dashboard/ScheduledJobs';
import { useEmailStats } from '@/hooks/useEmailStats';
import { Mail, Send, Clock, AlertCircle, Loader2, LayoutDashboard, Users } from 'lucide-react';

export default function Dashboard() {
  const { stats, isLoading } = useEmailStats();

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your email campaigns and performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Campaigns"
            value={stats.totalCampaigns}
            icon={LayoutDashboard}
            variant="primary"
          />
          <StatCard
            title="Total Recipients"
            value={stats.totalRecipients}
            icon={Users}
            variant="success"
          />
          <StatCard
            title="Emails Sent"
            value={stats.totalSent}
            icon={Send}
            variant="primary"
          />
          <StatCard
            title="Scheduled"
            value={stats.totalScheduled}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Failed"
            value={stats.totalFailed}
            icon={AlertCircle}
            variant="destructive"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmailChart dailyStats={stats.dailyStats} />
          <ScheduledJobs />
        </div>

        <RecentCampaigns />
      </div>
    </DashboardLayout>
  );
}
