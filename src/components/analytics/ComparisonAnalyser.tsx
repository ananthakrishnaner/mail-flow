
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Fingerprint, Mail, RefreshCw, Layers } from 'lucide-react';
import api, { API_URL } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ComparisonMatch {
    id: string; // from security log id
    email: string;
    sent_at: string;
    security_date: string;
    input_details: string;
}

interface ComparisonStats {
    total_sent_unique: number; // Unique emails sent
    total_matches_unique: number; // Unique emails matched
}

export const ComparisonAnalyser = () => {
    const [matches, setMatches] = useState<ComparisonMatch[]>([]);
    const [stats, setStats] = useState<ComparisonStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/comparison/analytics');
            setMatches(res.data.matches);
            setStats(res.data.stats);
        } catch (error) {
            console.error('Failed to fetch comparison data', error);
            toast.error('Failed to load comparison data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const chartData = stats ? [
        { name: 'Sent Emails', value: stats.total_sent_unique, fill: '#0ea5e9' },
        { name: 'Security Matches', value: stats.total_matches_unique, fill: '#ef4444' }
    ] : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Comparison Analyser
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Analyze correlation between sent campaigns and security events
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="p-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <a
                        href={`${API_URL}/comparison/export`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow-lg hover:shadow-purple-500/25"
                    >
                        <Download size={18} />
                        Comparison Report (Word)
                    </a>
                </div>
            </div>

            {/* Stats & Graph Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 lg:col-span-1">
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent (Unique)</CardTitle>
                            <Mail className="h-4 w-4 text-sky-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_sent_unique || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Unique recipients targeted</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Security Matches</CardTitle>
                            <Fingerprint className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{stats?.total_matches_unique || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Recipients with security logs</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                            <Layers className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-500">
                                {stats && stats.total_sent_unique > 0
                                    ? ((stats.total_matches_unique / stats.total_sent_unique) * 100).toFixed(1)
                                    : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Sent to Security Event ratio</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Graph */}
                <Card className="lg:col-span-2 bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Comparison Analysis Graph</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={true} vertical={false} />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '8px',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Comparison Table */}
            <Card className="bg-card border-border overflow-hidden">
                <CardHeader>
                    <CardTitle>Matched Details</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="p-4 font-medium text-muted-foreground">Email Address</th>
                                <th className="p-4 font-medium text-muted-foreground">Sent Date</th>
                                <th className="p-4 font-medium text-muted-foreground">Security Log Date</th>
                                <th className="p-4 font-medium text-muted-foreground">Input Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {matches.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No matches found between Sent campaigns and Security logs.
                                    </td>
                                </tr>
                            ) : (
                                matches.map((match, idx) => (
                                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4 font-medium">{match.email}</td>
                                        <td className="p-4 text-muted-foreground">
                                            {match.sent_at ? format(new Date(match.sent_at), 'MMM dd, yyyy HH:mm') : '-'}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {match.security_date ? format(new Date(match.security_date), 'MMM dd, yyyy HH:mm') : '-'}
                                        </td>
                                        <td className="p-4 font-mono text-xs max-w-[300px] truncate" title={match.input_details}>
                                            {match.input_details || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
