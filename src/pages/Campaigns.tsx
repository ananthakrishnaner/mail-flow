import { motion } from 'framer-motion';
import {
    Play,
    Pause,
    Trash2,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    MoreVertical,
    Search,
    Filter,
    Users
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

export default function Campaigns() {
    const navigate = useNavigate();
    const { campaigns, isLoading, updateCampaignStatus, deleteCampaign, startCampaign } = useCampaigns();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCampaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sending':
                return <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">Sending</Badge>;
            case 'paused':
                return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Paused</Badge>;
            case 'sent':
                return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'scheduled':
                return <Badge variant="outline" className="text-primary border-primary/20">Scheduled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getProgress = (campaign: Campaign) => {
        if (campaign.total_recipients === 0) return 0;
        return Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Campaigns</h1>
                        <p className="text-muted-foreground mt-1">Manage and track your email campaigns</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search campaigns..."
                                className="pl-9 w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredCampaigns.length === 0 ? (
                        <div className="bg-card border border-dashed rounded-xl p-12 text-center">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ArrowRight className="w-6 h-6 text-primary rotate-45" />
                            </div>
                            <h3 className="text-lg font-semibold">No campaigns found</h3>
                            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                                {searchTerm ? 'Try adjusting your search' : 'Start your first email campaign to see it listed here'}
                            </p>
                            {!searchTerm && (
                                <Button className="mt-6" variant="outline" asChild>
                                    <a href="/compose">Create Campaign</a>
                                </Button>
                            )}
                        </div>
                    ) : (
                        filteredCampaigns.map((campaign, index) => (
                            <motion.div
                                key={campaign.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group cursor-pointer"
                            >
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold truncate">{campaign.name}</h3>
                                            {getStatusBadge(campaign.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                                            {campaign.subject}
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                {campaign.total_recipients} recipients
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                Created {new Date(campaign.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-64 space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span>Progress</span>
                                            <span className="font-medium">{getProgress(campaign)}%</span>
                                        </div>
                                        <Progress value={getProgress(campaign)} className="h-2" />
                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                            <span className="text-success">{campaign.sent_count} sent</span>
                                            <span className="text-destructive">{campaign.failed_count} failed</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {campaign.status === 'draft' && (
                                            <Button
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => startCampaign({ campaignId: campaign.id, delaySeconds: campaign.delay_seconds })}
                                            >
                                                <Play className="w-4 h-4" />
                                                Start
                                            </Button>
                                        )}

                                        {campaign.status === 'sending' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-2 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-600"
                                                onClick={() => updateCampaignStatus({ id: campaign.id, status: 'paused' })}
                                            >
                                                <Pause className="w-4 h-4" />
                                                Pause
                                            </Button>
                                        )}

                                        {campaign.status === 'paused' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-2 border-green-500/20 text-green-500 hover:bg-green-500/10 hover:text-green-600"
                                                onClick={() => {
                                                    updateCampaignStatus({ id: campaign.id, status: 'sending' });
                                                    startCampaign({ campaignId: campaign.id, delaySeconds: campaign.delay_seconds });
                                                }}
                                            >
                                                <Play className="w-4 h-4" />
                                                Resume
                                            </Button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteCampaign(campaign.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Campaign
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
