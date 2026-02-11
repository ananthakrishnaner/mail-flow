
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Fingerprint, Mail, RefreshCw, Layers, Upload, FileText, UserCheck, PieChart as PieIcon, CheckCircle2, AlertCircle, ChevronRight, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { API_URL } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ComparisonMatch {
    id: string;
    email: string;
    sent_at: string;
    security_date: string;
    input_details: string;
    cleaned_details: string;
}

interface ComparisonStats {
    total_sent_unique: number;
    unique_matches: number;
    total_matches: number;
}

export const ComparisonAnalyser = () => {
    const [matches, setMatches] = useState<ComparisonMatch[]>([]);
    const [stats, setStats] = useState<ComparisonStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingCSV, setIsExportingCSV] = useState(false);
    const [minLength, setMinLength] = useState(2);
    const [showCleaned, setShowCleaned] = useState(false);
    const [uniqueOnly, setUniqueOnly] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!file) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('min_length', minLength.toString());
        formData.append('unique_only', uniqueOnly.toString());

        try {
            const res = await api.post('/comparison/analytics', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMatches(res.data.matches);
            setStats(res.data.stats);
            // toast.success("Analysis complete"); // Silent for reactivity
        } catch (error) {
            console.error('Failed to fetch comparison data', error);
            toast.error('Failed to analyze data.');
        } finally {
            setIsLoading(false);
        }
    }, [file, minLength, uniqueOnly]);

    // Reactivity: Auto-analyze on setting change
    useEffect(() => {
        if (file) {
            handleAnalyze();
        }
    }, [uniqueOnly, minLength, handleAnalyze]);

    const handleDownloadSample = () => {
        const csvContent = "data:text/csv;charset=utf-8," + "email,sent_at,date\nexample@test.com,2024-01-01 10:00:00,2024-01-01\nanother@test.com,2024-01-02 11:30:00,2024-01-02";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sample_comparison_upload.csv");
        document.body.appendChild(link); // Required for FF
        link.click();
        document.body.removeChild(link);
    };

    const handleExportReport = async () => {
        if (!file) {
            toast.error("Please upload a CSV file to generate the report.");
            return;
        }

        setIsExporting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('min_length', minLength.toString());
        formData.append('unique_only', uniqueOnly.toString());

        try {
            const response = await api.post('/comparison/export', formData, {
                responseType: 'blob',
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'comparison_analysis_report.docx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Report downloaded successfully");
        } catch (error) {
            console.error('Export failed', error);
            toast.error("Failed to export report");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCSV = async () => {
        if (!file) {
            toast.error("Please upload a CSV file to generate the report.");
            return;
        }

        setIsExportingCSV(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('min_length', minLength.toString());
        formData.append('unique_only', uniqueOnly.toString());

        try {
            const response = await api.post('/comparison/export-csv', formData, {
                responseType: 'blob',
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'comparison_analysis.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("CSV exported successfully");
        } catch (error) {
            console.error('CSV Export failed', error);
            toast.error("Failed to export CSV");
        } finally {
            setIsExportingCSV(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setMatches([]);
        setStats(null);
        // Reset file input value
        const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const chartData = stats ? [
        { name: 'Initial Sent', value: stats.total_sent_unique, fill: '#6366f1' },
        { name: 'Identified Hits', value: stats.total_matches, fill: '#4f46e5' }
    ] : [];

    const pieData = stats ? [
        { name: 'Matched', value: stats.unique_matches },
        { name: 'Unmatched', value: Math.max(0, stats.total_sent_unique - stats.unique_matches) }
    ] : [];

    const PIE_COLORS = ['#6366f1', '#e2e8f0'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-[1600px] mx-auto pb-12"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-zinc-950 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded">Analytics Engine</span>
                        <ChevronRight size={12} className="text-slate-400" />
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Cross-Reference</span>
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                        Comparison <span className="text-indigo-600">Analyser</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
                        Advanced deliverability diagnostics and security log reconciliation platform.
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Input Group */}
                    <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <button
                            onClick={handleDownloadSample}
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Download Sample Template"
                        >
                            <FileText size={18} />
                        </button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                        <div className="relative">
                            <input
                                id="csv-upload"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${file ? 'bg-indigo-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                                <Upload size={14} />
                                <span className="max-w-[150px] truncate">{file ? file.name : 'Upload Records'}</span>
                            </button>
                        </div>
                        {file && (
                            <button
                                onClick={handleReset}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-1"
                                title="Reset selection"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>

                    {/* Settings Group */}
                    <div className="flex items-center gap-3 px-3 py-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                            <Filter size={14} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">MIN LENGTH</span>
                            <input
                                type="number"
                                min="0"
                                max="50"
                                className="w-8 bg-transparent border-none text-sm focus:ring-0 p-0 text-center font-bold text-slate-900 dark:text-slate-100"
                                value={minLength}
                                onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <button
                            onClick={() => setUniqueOnly(!uniqueOnly)}
                            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all py-1.5 px-4 rounded-md border ${uniqueOnly
                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm'
                                : 'text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                        >
                            <UserCheck size={14} />
                            {uniqueOnly ? 'Strict Mode' : 'Standard'}
                        </button>
                    </div>

                    {/* Action Group */}
                    <div className="flex items-center gap-3 ml-auto">
                        <AnimatePresence>
                            {stats && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5"
                                >
                                    <button
                                        onClick={handleExportReport}
                                        disabled={isExporting || !file}
                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded"
                                        title="Export Word Report"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        disabled={isExportingCSV || !file}
                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-all rounded"
                                        title="Export Filtered CSV"
                                    >
                                        <FileText size={18} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading || !file}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isLoading
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border border-indigo-700'
                                }`}
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            {isLoading ? 'Processing' : (stats ? 'Re-Analyze' : 'Run Diagnostics')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
                {/* Key Metrics */}
                {[
                    { title: 'Total Sent', value: stats?.total_sent_unique, icon: Mail, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
                    { title: 'Security Matches', value: stats?.total_matches, icon: Fingerprint, color: 'text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/20' },
                    { title: 'Confidence Score', value: `${stats && stats.total_sent_unique > 0 ? ((stats.total_matches / stats.total_sent_unique) * 100).toFixed(1) : 0}%`, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                    { title: 'Data Coverage', value: stats?.unique_matches, icon: Layers, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' }
                ].map((card, i) => (
                    <Card key={i} className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-b-2">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg ${card.color.split(' ')[1]}`}>
                                    <card.icon size={18} className={card.color.split(' ')[0]} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{card.title}</span>
                            </div>
                            <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums leading-none mb-1">
                                {card.value || 0}
                            </div>
                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-900 mt-4 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '70%' }}
                                    className={`h-full ${card.color.split(' ')[1].replace('bg-', 'bg-').split('/')[0]}`}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Line Analytics */}
                <Card className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
                        <div className="flex items-center gap-2">
                            <PieIcon size={16} className="text-indigo-600" />
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Match Trend Distribution</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[320px] pt-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Distribution Analysis */}
                <Card className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-indigo-600" />
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Baseline Reconciliation</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[320px] p-6">
                        <div className="grid grid-cols-2 h-full items-center">
                            <div className="h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                                        {stats && stats.total_sent_unique > 0 ? ((stats.unique_matches / stats.total_sent_unique) * 100).toFixed(0) : 0}%
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Coverage</span>
                                </div>
                            </div>
                            <div className="space-y-4 pl-6">
                                {[
                                    { label: 'Identified Match', value: stats?.unique_matches, sub: 'Found in logs', color: 'bg-indigo-600' },
                                    { label: 'Unresolved', value: Math.max(0, (stats?.total_sent_unique || 0) - (stats?.unique_matches || 0)), sub: 'No activity found', color: 'bg-slate-200' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className={`w-1 h-10 rounded-full ${item.color}`} />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.value || 0}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">{item.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Results Table Section */}
            {matches.length > 0 && (
                <Card className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 py-6 px-8">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-indigo-600" />
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Diagnostic Audit Log</CardTitle>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded border border-indigo-100 dark:border-indigo-900">{matches.length} IDENTIFIED RECORDS</span>
                            <button
                                onClick={() => setShowCleaned(!showCleaned)}
                                className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border ${showCleaned ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-zinc-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-600'
                                    }`}
                            >
                                {showCleaned ? 'Raw Input' : 'Clean Input'}
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16">SL NO</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subscriber Identity</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reconciliation Data</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {matches.map((match, idx) => (
                                        <tr key={match.id + idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-8 py-6 text-[10px] font-bold text-slate-400">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{match.email}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">Record ID: {match.id.substring(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase w-20">Sent On:</span>
                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{match.sent_at || 'Unrecorded'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase w-20">Matched:</span>
                                                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{format(new Date(match.security_date), 'MMM dd, HH:mm')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="max-w-xl">
                                                    <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-3 rounded border border-slate-100 dark:border-slate-800 font-mono">
                                                        {showCleaned ? match.cleaned_details : match.input_details}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </motion.div>
    );
};
