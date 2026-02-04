import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Clock, Users, Send, AlertTriangle, FileText, Terminal } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ServerLog {
    source: 'mailer' | 'scheduler';
    message: string;
    timestamp: string;
}

export default function CampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<ServerLog[]>([]);

    const { data: campaign, isLoading: isLoadingCampaign } = useQuery({
        queryKey: ['campaign', id],
        queryFn: async () => {
            const { data } = await api.get(`/campaigns/${id}`);
            return data;
        },
        refetchInterval: 1000 // Poll every second for live progress
    });

    const { data: serverLogs, isLoading: isLoadingLogs } = useQuery({
        queryKey: ['campaign-logs', id],
        queryFn: async () => {
            const { data } = await api.get(`/campaigns/${id}/server-logs`);
            return data as ServerLog[];
        },
        refetchInterval: 2000 // Poll logs while viewing
    });

    if (isLoadingCampaign) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!campaign) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold">Campaign Not Found</h2>
                    <Button onClick={() => navigate('/campaigns')} className="mt-4">Back to Campaigns</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {campaign.name}
                            <Badge variant="outline" className="capitalize">{campaign.status === 'sent' ? 'Completed' : campaign.status}</Badge>
                        </h1>
                        <p className="text-muted-foreground text-sm flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created {format(new Date(campaign.created_at), 'MMM dd, yyyy HH:mm')}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {campaign.total_recipients} Recipients</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recipients</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{campaign.total_recipients}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{campaign.sent_count}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{campaign.failed_count}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Completion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                <div className="text-2xl font-bold">
                                    {campaign.total_recipients > 0
                                        ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
                                        : 0}%
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500 ease-out"
                                        style={{ width: `${campaign.total_recipients > 0 ? ((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="server-logs" className="w-full">
                    <TabsList>
                        <TabsTrigger value="server-logs" className="flex items-center gap-2"><Terminal className="w-4 h-4" /> Server Logs</TabsTrigger>
                        <TabsTrigger value="details" className="flex items-center gap-2"><FileText className="w-4 h-4" /> Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="server-logs">
                        <Card className="bg-black/95 text-green-400 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Terminal className="w-5 h-5" />
                                    Internal Server Logs
                                </CardTitle>
                                <CardDescription className="text-zinc-500">
                                    Real-time logs from the mailer daemon and scheduler related to this campaign.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] w-full rounded-md border border-zinc-800 bg-black p-4 font-mono text-xs">
                                    {isLoadingLogs ? (
                                        <div className="flex items-center gap-2 text-zinc-500">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading logs...
                                        </div>
                                    ) : serverLogs && serverLogs.length > 0 ? (
                                        serverLogs.map((log, i) => (
                                            <div key={i} className="mb-1 break-all">
                                                <span className="text-zinc-500">[{log.timestamp}]</span>{' '}
                                                <span className={log.source === 'mailer' ? 'text-blue-400' : 'text-yellow-400'}>
                                                    [{log.source.toUpperCase()}]
                                                </span>{' '}
                                                <span className={log.message.toLowerCase().includes('error') ? 'text-red-500' : 'text-green-300'}>
                                                    {log.message}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-zinc-600 italic">No logs found for this campaign ID. Make sure the campaign has started.</div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details">
                        <Card>
                            <CardHeader>
                                <CardTitle>Campaign Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Subject</label>
                                        <p className="mt-1">{campaign.subject}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Delay Step</label>
                                        <p className="mt-1">{campaign.delay_seconds} seconds</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium text-muted-foreground">Recipient IDs (Debug)</label>
                                        <p className="mt-1 font-mono text-xs bg-muted p-2 rounded">{JSON.stringify(campaign.recipient_ids)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
