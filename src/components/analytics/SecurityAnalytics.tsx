
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Upload, Activity, Trash2, AlertTriangle, Shield, CheckCircle, FileUp } from 'lucide-react';
import api, { API_URL } from '@/lib/api';

interface SecurityLog {
    id: string;
    email: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    input_details: string;
    attempt_status: string;
    review_status: string;
}

export const SecurityAnalytics = () => {
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [uploading, setUploading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [stats, setStats] = useState<any>(null);

    const fetchStats = async () => {
        try {
            const res = await api.get('/security/stats');
            setLogs(res.data.recent_logs || []);
            setStats(res.data);
        } catch (error) {
            console.error('Fetch stats failed', error);
            // Initialize with empty array to prevent crashes
            setLogs([]);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            // Note: For file uploads we might need to manually set content-type header to undefined 
            // to let browser set multipart boundary, but axios usually handles it.
            // Using api instance to ensure auth headers are present.
            const response = await api.post('/security/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.status === 200) {
                toast.success(response.data.message || 'Import successful');
                fetchStats();
                event.target.value = '';
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Upload failed';
            console.error('Upload failed:', errorMessage);
            toast.error(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log?')) return;
        try {
            await api.delete(`/security/log/${id}`);
            fetchStats(); // Refresh
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Failed to delete log');
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await api.patch(`/security/log/${id}`, { review_status: newStatus });
            fetchStats(); // Refresh
        } catch (error) {
            console.error('Update failed', error);
            toast.error('Failed to update status');
        }
    };

    // Filter logs
    const filteredLogs = (logs || []).filter(log => {
        if (filterStatus === 'all') return true;
        return log.review_status === filterStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Security Analytics
                </h2>
                <div className="flex gap-2">
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-white transition-colors">
                            <span className="text-sm font-medium">Export</span>
                        </button>
                        <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <a href={`${API_URL}/security/export?type=csv`} target="_blank" rel="noreferrer" className="block px-4 py-2 hover:bg-slate-700 text-sm text-slate-300">Download CSV</a>
                            <a href={`${API_URL}/security/export?type=pdf`} target="_blank" rel="noreferrer" className="block px-4 py-2 hover:bg-slate-700 text-sm text-slate-300">Download PDF</a>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${uploading
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25'
                                }`}
                        >
                            {uploading ? <Activity className="animate-spin" size={18} /> : <FileUp size={18} />}
                            {uploading ? 'Importing...' : 'Import CSV'}
                        </label>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Incidents</CardTitle>
                        <Shield className="h-4 w-4 text-cyan-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{logs.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Unreviewed</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">
                            {logs.filter(l => l.review_status === 'unreviewed').length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Top Threat Source</CardTitle>
                        <Activity className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-red-400 truncate">
                            {stats?.top_ips?.[0]?.ip_address || 'N/A'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <select
                    className="p-2 border rounded-lg bg-zinc-900 border-zinc-800 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="unreviewed">Unreviewed</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="false_positive">False Positive</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-zinc-300">
                        <thead className="bg-zinc-950/50 text-zinc-400 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">IP Address</th>
                                <th className="p-4">Input Details</th>
                                <th className="p-4">Attempt Status</th>
                                <th className="p-4">Review Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-4 text-sm whitespace-nowrap text-zinc-400">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-medium text-white">{log.email}</td>
                                    <td className="p-4 font-mono text-sm text-cyan-400">{log.ip_address}</td>
                                    <td className="p-4 text-sm text-slate-300 max-w-[200px] truncate" title={log.input_details}>{log.input_details || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${log.attempt_status === 'failure'
                                            ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(248,113,113,0.2)]'
                                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                                            }`}>
                                            {log.attempt_status === 'failure' ? 'Failed Attempt' : 'Success'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            className={`bg-transparent border rounded px-2 py-1 text-xs font-medium outline-none transition-all cursor-pointer ${log.review_status === 'unreviewed' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' :
                                                log.review_status === 'reviewed' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' :
                                                    'border-zinc-700 text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800'
                                                }`}
                                            value={log.review_status}
                                            onChange={(e) => handleStatusUpdate(log.id, e.target.value)}
                                        >
                                            <option value="unreviewed" className="bg-zinc-900 text-amber-400">Unreviewed</option>
                                            <option value="reviewed" className="bg-zinc-900 text-emerald-400">Reviewed</option>
                                            <option value="false_positive" className="bg-zinc-900 text-zinc-400">False Positive</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(log.id)}
                                            className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                                            title="Delete Log"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        No logs found matching filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
