
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Upload, Activity, Trash2, AlertTriangle, Shield, CheckCircle, FileUp, X, CheckSquare, Square, Search, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
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

interface PaginationState {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export const SecurityAnalytics = () => {
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [uploading, setUploading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [stats, setStats] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [clearConfirmationCount, setClearConfirmationCount] = useState(0);

    // Search & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        limit: 1000,
        total: 0,
        pages: 1
    });

    const COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];

    const fetchStats = async () => {
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());
            if (searchQuery) params.append('search', searchQuery);
            if (dateFilter) params.append('date', dateFilter);

            const res = await api.get(`/security/stats?${params.toString()}`);
            setLogs(res.data.recent_logs || []);
            setStats(res.data);
            if (res.data.pagination) {
                setPagination(prev => ({ ...prev, ...res.data.pagination }));
            }
        } catch (error) {
            console.error('Fetch stats failed', error);
            // Initialize with empty array to prevent crashes
            setLogs([]);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStats();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [pagination.page, searchQuery, dateFilter]);

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

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLogs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map(l => l.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} logs?`)) return;
        try {
            await api.post('/security/bulk', {
                action: 'delete_selected',
                ids: Array.from(selectedIds)
            });
            setSelectedIds(new Set());
            fetchStats();
            toast.success('Logs deleted');
        } catch (error) {
            toast.error('Bulk delete failed');
        }
    };

    const handleBulkStatusUpdate = async (status: string) => {
        try {
            await api.post('/security/bulk', {
                action: 'update_status',
                ids: Array.from(selectedIds),
                status
            });
            setSelectedIds(new Set());
            fetchStats();
            toast.success('Status updated');
        } catch (error) {
            toast.error('Bulk update failed');
        }
    };

    const handleClearAll = async () => {
        if (clearConfirmationCount < 2) {
            setClearConfirmationCount(prev => prev + 1);
            toast.warning(`Click ${3 - (clearConfirmationCount + 1)} more times to confirm clearing ALL logs`);
            return;
        }

        try {
            await api.post('/security/bulk', { action: 'delete_all' });
            setClearConfirmationCount(0);
            fetchStats();
            toast.success('All logs cleared');
        } catch (error) {
            toast.error('Clear all failed');
            setClearConfirmationCount(0);
        }
    };

    // Client-side status filter (applied on current page)
    const filteredLogs = logs.filter(log => {
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
                        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <a href={`${API_URL}/security/export?type=csv`} target="_blank" rel="noreferrer" className="block px-4 py-2 hover:bg-slate-700 text-sm text-slate-300">Download All (CSV)</a>
                            <a href={`${API_URL}/security/export?type=csv&status=success`} target="_blank" rel="noreferrer" className="block px-4 py-2 hover:bg-slate-700 text-sm text-emerald-400">Download Success (CSV)</a>
                            <a href={`${API_URL}/security/export?type=csv&status=failure`} target="_blank" rel="noreferrer" className="block px-4 py-2 hover:bg-slate-700 text-sm text-red-400">Download Failure (CSV)</a>
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
                <Card className="bg-zinc-950 border-zinc-900 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Emails</CardTitle>
                        <Shield className="h-4 w-4 text-cyan-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.counts?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-900 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Successful Emails</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {stats?.counts?.success || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-900 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Failed Attempts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-400">
                            {stats?.counts?.failure || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-zinc-950 border-zinc-900 backdrop-blur-sm p-4">
                    <CardHeader>
                        <CardTitle className="text-zinc-400 text-sm font-medium">Activity Timeline (7 Days)</CardTitle>
                    </CardHeader>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.timeline_data || []}>
                                <defs>
                                    <linearGradient id="colorInputs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                                    itemStyle={{ color: '#e5e7eb' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="input_count" stroke="#a855f7" fillOpacity={1} fill="url(#colorInputs)" name="Input Details Recorded" />
                                <Area type="monotone" dataKey="email_count" stroke="#06b6d4" fillOpacity={1} fill="url(#colorEmails)" name="Total Emails" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="bg-zinc-950 border-zinc-900 backdrop-blur-sm p-4">
                    <CardHeader>
                        <CardTitle className="text-zinc-400 text-sm font-medium">Status Distribution</CardTitle>
                    </CardHeader>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.status_distribution || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="attempt_status"
                                >
                                    {(stats?.status_distribution || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.attempt_status === 'failure' ? '#ef4444' : '#10b981'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Search & Pagination Controls */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-900 backdrop-blur-sm">
                <div className="flex flex-1 gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search email, IP, details..."
                            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <input
                            type="date"
                            className="pl-4 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all [color-scheme:dark]"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                        disabled={pagination.page === 1}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-zinc-400 font-medium px-2">
                        Page {pagination.page} of {Math.max(1, pagination.pages)}
                    </span>
                    <button
                        onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.pages, p.page + 1) }))}
                        disabled={pagination.page >= pagination.pages}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Filters & Bulk Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-2">
                    <select
                        className="p-2 border rounded-lg bg-zinc-950 border-zinc-800 text-white focus:ring-2 focus:ring-cyan-900/50 focus:border-zinc-700 outline-none transition-all"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="unreviewed">Unreviewed</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="false_positive">False Positive</option>
                    </select>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-4 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <span className="text-blue-400 text-sm font-medium">{selectedIds.size} selected</span>
                        <div className="flex gap-2">
                            <select
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 outline-none"
                                onChange={(e) => {
                                    if (e.target.value) handleBulkStatusUpdate(e.target.value);
                                    e.target.value = '';
                                }}
                            >
                                <option value="">Set Status...</option>
                                <option value="reviewed">Mark Reviewed</option>
                                <option value="unreviewed">Mark Unreviewed</option>
                                <option value="false_positive">Mark False Positive</option>
                            </select>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm transition-colors"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Clear All Button */}
                <button
                    onClick={handleClearAll}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ml-auto ${clearConfirmationCount > 0
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-red-900/30 hover:text-red-400'
                        }`}
                >
                    <Trash2 size={16} />
                    {clearConfirmationCount === 0 ? 'Clear All Logs' : `Confirm Clear (${3 - clearConfirmationCount} clicks left)`}
                </button>
            </div>

            {/* Table */}
            <div className="bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-zinc-300">
                        <thead className="bg-black text-zinc-400 uppercase text-xs tracking-wider border-b border-zinc-900">
                            <tr>
                                <th className="p-4 w-[50px]">
                                    <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white">
                                        {selectedIds.size === filteredLogs.length && filteredLogs.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="p-4 w-[40px]"></th>
                                <th className="p-4">Time</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">IP Address</th>
                                <th className="p-4">Input Details</th>
                                <th className="p-4">Review Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredLogs.map(log => (
                                <>
                                    <tr
                                        key={log.id}
                                        onClick={(e) => {
                                            // Prevent expansion when clicking checkbox, select, or buttons
                                            if ((e.target as HTMLElement).closest('button, select, input')) return;
                                            toggleExpand(log.id);
                                        }}
                                        className={`transition-colors cursor-pointer border-b border-zinc-900/50 ${selectedIds.has(log.id) ? 'bg-blue-900/10 hover:bg-blue-900/20' : 'hover:bg-zinc-900'
                                            } ${expandedRows.has(log.id) ? 'bg-zinc-900' : ''}`}
                                    >
                                        <td className="p-4">
                                            <button onClick={() => toggleSelect(log.id)} className={`transition-colors ${selectedIds.has(log.id) ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                                {selectedIds.has(log.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="p-4 text-zinc-500">
                                            {expandedRows.has(log.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </td>
                                        <td className="p-4 text-sm whitespace-nowrap text-zinc-400">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-medium text-white">{log.email}</td>
                                        <td className="p-4 font-mono text-sm text-cyan-400">{log.ip_address}</td>
                                        <td className="p-4 text-sm text-slate-300 max-w-[200px] truncate" title={log.input_details}>{log.input_details || '-'}</td>
                                        <td className="p-4">
                                            <select
                                                className={`bg-transparent border rounded px-2 py-1 text-xs font-medium outline-none transition-all cursor-pointer ${log.review_status === 'unreviewed' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' :
                                                    log.review_status === 'reviewed' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' :
                                                        'border-zinc-700 text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800'
                                                    }`}
                                                value={log.review_status}
                                                onChange={(e) => handleStatusUpdate(log.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="unreviewed" className="bg-zinc-900 text-amber-400">Unreviewed</option>
                                                <option value="reviewed" className="bg-zinc-900 text-emerald-400">Reviewed</option>
                                                <option value="false_positive" className="bg-zinc-900 text-zinc-400">False Positive</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                                className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                                                title="Delete Log"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRows.has(log.id) && (
                                        <tr className="bg-black/40 border-t border-zinc-900 animate-in fade-in slide-in-from-top-1">
                                            <td colSpan={8} className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">User Agent</h4>
                                                            <p className="text-sm text-zinc-300 font-mono bg-zinc-900/50 p-3 rounded border border-zinc-900 break-all">{log.user_agent}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Input Details</h4>
                                                            <p className="text-sm text-zinc-300 font-mono bg-zinc-900/50 p-3 rounded border border-zinc-900 whitespace-pre-wrap">{log.input_details}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex gap-4">
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">IP Address</h4>
                                                                <p className="text-sm text-cyan-400 font-mono">{log.ip_address}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Timestamp</h4>
                                                                <p className="text-sm text-zinc-300">{new Date(log.created_at).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Status</h4>
                                                            <div className="flex gap-2">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${log.attempt_status === 'failure'
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                    }`}>
                                                                    Attempt: {log.attempt_status}
                                                                </span>
                                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${log.review_status === 'unreviewed' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' :
                                                                    log.review_status === 'reviewed' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
                                                                        'border-zinc-700 text-zinc-400 bg-zinc-800/50'
                                                                    }`}>
                                                                    Review: {log.review_status.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
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
