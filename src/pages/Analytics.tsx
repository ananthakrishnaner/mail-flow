import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEmailStats } from '@/hooks/useEmailStats';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useRecipients } from '@/hooks/useRecipients';
import { Loader2, Mail, Send, AlertCircle, CheckCircle, Clock, TrendingUp, Users, Eye, MousePointer, Filter } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = ['hsl(173, 80%, 40%)', 'hsl(0, 72%, 51%)', 'hsl(38, 92%, 50%)', 'hsl(220, 70%, 50%)'];

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SecurityAnalytics } from "@/components/analytics/SecurityAnalytics";
import { API_URL } from '../../config';

export default function Analytics() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const { stats, isLoading: statsLoading } = useEmailStats(selectedCampaignId === 'all' ? undefined : selectedCampaignId);
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { recipients, isLoading: recipientsLoading } = useRecipients();

  const isLoading = statsLoading || campaignsLoading || recipientsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ... (keep chart data preparation logic) ...
  // copy lines 54-101 here for reference, but in reality I will just keep them and wrap the return statement.

  const emailStatusData = [
    { name: 'Sent', value: stats.totalSent, color: 'hsl(173, 80%, 40%)' },
    { name: 'Failed', value: stats.totalFailed, color: 'hsl(0, 72%, 51%)' },
    { name: 'Pending', value: stats.totalPending, color: 'hsl(38, 92%, 50%)' },
  ].filter(d => d.value > 0);

  const recipientStatusData = [
    { name: 'Pending', value: recipients.filter(r => r.status === 'pending').length },
    { name: 'Sent', value: recipients.filter(r => r.status === 'sent').length },
    { name: 'Failed', value: recipients.filter(r => r.status === 'failed').length },
  ].filter(d => d.value > 0);

  const campaignStatusData = [
    { name: 'Draft', value: campaigns.filter(c => c.status === 'draft').length },
    { name: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length },
    { name: 'Sending', value: campaigns.filter(c => c.status === 'sending').length },
    { name: 'Sent', value: campaigns.filter(c => c.status === 'sent').length },
    { name: 'Failed', value: campaigns.filter(c => c.status === 'failed').length },
  ].filter(d => d.value > 0);

  const dailyChartData = stats.dailyStats.map((stat) => ({
    date: format(new Date(stat.date), 'MMM dd'),
    sent: stat.sent,
    failed: stat.failed,
    opens: stat.opens,
    clicks: stat.clicks,
  }));

  const campaignPerformance = campaigns.slice(0, 10).map(c => ({
    name: c.name.substring(0, 15) + (c.name.length > 15 ? '...' : ''),
    sent: c.sent_count,
    failed: c.failed_count,
    total: c.total_recipients,
  }));

  const successRate = stats.totalSent + stats.totalFailed > 0
    ? ((stats.totalSent / (stats.totalSent + stats.totalFailed)) * 100).toFixed(1)
    : 0;

  const openRate = stats.totalSent > 0
    ? ((stats.uniqueOpens / stats.totalSent) * 100).toFixed(1)
    : 0;

  const clickRate = stats.totalSent > 0
    ? ((stats.uniqueClicks / stats.totalSent) * 100).toFixed(1)
    : 0;


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive email campaign analytics and insights
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors">
                <span className="text-sm font-medium">Export Report</span>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <a href={`${API_URL}/api/stats/export?type=csv`} target="_blank" rel="noreferrer" className="block px-4 py-2 hover:bg-muted text-sm">Download CSV</a>
                <a href={`${API_URL}/api/stats/export?type=pdf`} target="_blank" rel="noreferrer" className="block px-4 py-2 hover:bg-muted text-sm">Download PDF</a>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaigns">Campaign Analytics</TabsTrigger>
            <TabsTrigger value="security">Security Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-3 bg-card border border-border p-2 rounded-lg min-w-[280px]">
                <Filter className="w-4 h-4 text-muted-foreground ml-2" />
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger className="border-none bg-transparent focus:ring-0">
                    <SelectValue placeholder="All Campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Recipients</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalRecipients}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Sent</span>
                </div>
                <p className="text-2xl font-bold text-success">{stats.totalSent}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Opens</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">{stats.uniqueOpens}</p>
                <p className="text-xs text-muted-foreground">{stats.totalOpens} total</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Clicks</span>
                </div>
                <p className="text-2xl font-bold text-purple-500">{stats.uniqueClicks}</p>
                <p className="text-xs text-muted-foreground">{stats.totalClicks} total</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Open Rate</span>
                </div>
                <p className="text-2xl font-bold text-success">{openRate}%</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Click Rate</span>
                </div>
                <p className="text-2xl font-bold text-purple-500">{clickRate}%</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Failed</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.totalFailed}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                </div>
                <p className="text-2xl font-bold text-success">{successRate}%</p>
              </motion.div>
            </div>

            {/* Tracking Analytics Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Email Engagement (Last 7 Days)</h3>
              {dailyChartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="opensGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(220 70% 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(220 70% 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(280 70% 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(280 70% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" opacity={0.3} />
                    <XAxis dataKey="date" stroke="hsl(220 10% 45%)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(220 10% 45%)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220 25% 12%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'hsl(220 15% 95%)',
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="opens" stroke="hsl(220 70% 50%)" strokeWidth={2} fill="url(#opensGradient)" name="Opens" />
                    <Area type="monotone" dataKey="clicks" stroke="hsl(280 70% 50%)" strokeWidth={2} fill="url(#clicksGradient)" name="Clicks" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Activity Over Time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Email Delivery (Last 7 Days)</h3>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                </div>
                <p className="text-2xl font-bold text-success">{successRate}%</p>
              </motion.div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Activity Over Time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Email Activity (Last 7 Days)</h3>
                {dailyChartData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyChartData}>
                      <defs>
                        <linearGradient id="sentGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(173 80% 40%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(173 80% 40%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="failedGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" opacity={0.3} />
                      <XAxis dataKey="date" stroke="hsl(220 10% 45%)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(220 10% 45%)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(220 25% 12%)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'hsl(220 15% 95%)',
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="sent" stroke="hsl(173 80% 40%)" strokeWidth={2} fill="url(#sentGradientAnalytics)" name="Sent" />
                      <Area type="monotone" dataKey="failed" stroke="hsl(0 72% 51%)" strokeWidth={2} fill="url(#failedGradientAnalytics)" name="Failed" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Email Status Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Email Status Distribution</h3>
                {emailStatusData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={emailStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {emailStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(220 25% 12%)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'hsl(220 15% 95%)',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign Status Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Campaign Status Overview</h3>
                {campaignStatusData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No campaigns yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={campaignStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" opacity={0.3} />
                      <XAxis dataKey="name" stroke="hsl(220 10% 45%)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(220 10% 45%)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(220 25% 12%)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'hsl(220 15% 95%)',
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(173 80% 40%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Recipient Status Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Recipient Status Distribution</h3>
                {recipientStatusData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No recipients yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={recipientStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {recipientStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(220 25% 12%)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'hsl(220 15% 95%)',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            {/* Campaign Performance Table */}
            {campaignPerformance.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Campaign Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campaignPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" opacity={0.3} />
                    <XAxis type="number" stroke="hsl(220 10% 45%)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(220 10% 45%)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220 25% 12%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'hsl(220 15% 95%)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sent" fill="hsl(173 80% 40%)" name="Sent" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="failed" fill="hsl(0 72% 51%)" name="Failed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Data Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold">Campaign Details</h3>
              </div>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No campaigns yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Campaign</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Recipients</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Sent</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Opens</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Clicks</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Success Rate</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => {
                        const rate = campaign.sent_count + campaign.failed_count > 0
                          ? ((campaign.sent_count / (campaign.sent_count + campaign.failed_count)) * 100).toFixed(1)
                          : '-';
                        return (
                          <tr key={campaign.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-6 py-4">
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">{campaign.subject}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${campaign.status === 'sent' ? 'bg-success/20 text-success' :
                                campaign.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                                  campaign.status === 'sending' ? 'bg-primary/20 text-primary' :
                                    campaign.status === 'scheduled' ? 'bg-warning/20 text-warning' :
                                      'bg-muted text-muted-foreground'
                                }`}>
                                {campaign.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">{campaign.total_recipients}</td>
                            <td className="px-6 py-4 text-success">{campaign.sent_count}</td>
                            <td className="px-6 py-4 text-primary">{(campaign as any).open_count || 0}</td>
                            <td className="px-6 py-4 text-blue-500">{(campaign as any).click_count || 0}</td>
                            <td className="px-6 py-4">{rate}%</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="security">
            <SecurityAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout >
  );
}
