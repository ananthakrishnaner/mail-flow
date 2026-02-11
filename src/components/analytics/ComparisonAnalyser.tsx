
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Fingerprint, Mail, RefreshCw, Layers, Upload, FileText, UserCheck, PieChart as PieIcon, CheckCircle2, AlertCircle } from 'lucide-react';
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
        { name: 'Total Emails', value: stats.total_sent_unique, fill: 'url(#barGradient)' },
        { name: 'Security Matches', value: stats.total_matches, fill: 'url(#matchGradient)' }
    ] : [];

    const pieData = stats ? [
        { name: 'Matched', value: stats.unique_matches },
        { name: 'Unmatched', value: Math.max(0, stats.total_sent_unique - stats.unique_matches) }
    ] : [];

    const PIE_COLORS = ['#8b5cf6', '#3b82f6'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-1000" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-1000" />

                <div className="relative z-10">
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                        Comparison Analyser
                    </h2>
                    <p className="text-indigo-200/60 text-base mt-2 max-w-md font-medium">
                        Cross-reference your campaign reach against real-time security logs for deep deliverability insights.
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 items-center relative z-10">
                    {/* Input Group */}
                    <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-lg">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleDownloadSample}
                            className="p-2 text-indigo-300 hover:text-white transition-colors"
                            title="Download Sample CSV"
                        >
                            <FileText size={18} />
                        </motion.button>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="relative">
                            <input
                                id="csv-upload"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className={`flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-xl transition-all ${file ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50' : 'bg-transparent text-indigo-200/70 hover:text-white'}`}>
                                <Upload size={16} />
                                <span className="max-w-[150px] truncate">{file ? file.name : 'Upload CSV'}</span>
                            </button>
                        </div>
                        {file && (
                            <motion.button
                                whileHover={{ rotate: 180 }}
                                onClick={handleReset}
                                className="p-2 text-red-400/70 hover:text-red-400 transition-colors ml-1"
                                title="Clear file"
                            >
                                <RefreshCw size={16} />
                            </motion.button>
                        )}
                    </div>

                    {/* Settings Group */}
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-lg">
                        <div className="flex items-center gap-2 border-r border-white/10 pr-4 font-mono">
                            <span className="text-[10px] uppercase font-bold text-indigo-300/50">Length:</span>
                            <input
                                type="number"
                                min="0"
                                max="50"
                                className="w-10 bg-transparent border-none text-sm focus:ring-0 p-0 text-center font-bold text-white selection:bg-indigo-500"
                                value={minLength}
                                onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <motion.button
                            whileHover={{ y: -2 }}
                            whileTap={{ y: 0 }}
                            onClick={() => setUniqueOnly(!uniqueOnly)}
                            className={`flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all py-1.5 px-4 rounded-xl border-2 ${uniqueOnly
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-xl shadow-indigo-500/40'
                                : 'text-indigo-300/60 border-indigo-500/20 hover:text-white hover:border-indigo-500/50'
                                }`}
                        >
                            <UserCheck size={16} className={uniqueOnly ? 'opacity-100' : 'opacity-40'} />
                            {uniqueOnly ? 'Unique Only' : 'Include Dupes'}
                        </motion.button>
                    </div>

                    {/* Action Group */}
                    <div className="flex items-center gap-3 ml-auto">
                        <AnimatePresence>
                            {stats && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-1 shadow-lg backdrop-blur-md"
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                        onClick={handleExportReport}
                                        disabled={isExporting || !file}
                                        className="p-2.5 text-indigo-200 hover:text-white transition-all rounded-xl"
                                        title="Download Report"
                                    >
                                        <Download size={20} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                                        onClick={handleExportCSV}
                                        disabled={isExportingCSV || !file}
                                        className="p-2.5 text-indigo-200 hover:text-white transition-all rounded-xl"
                                        title="Download CSV"
                                    >
                                        <FileText size={20} />
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(99, 102, 241, 0.6)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAnalyze}
                            disabled={isLoading || !file}
                            className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${isLoading
                                ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl'
                                }`}
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                            {isLoading ? 'Processing...' : (stats ? 'Re-Analyze' : 'Analyze Now')}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Stats Cards Column */}
                <div className="grid grid-cols-1 gap-6 lg:col-span-1">
                    {[
                        { title: 'Campaign Size', value: stats?.total_sent_unique, icon: Mail, color: 'from-blue-500 to-indigo-500', label: 'Unique recipients' },
                        { title: 'Security Hits', value: stats?.total_matches, icon: Fingerprint, color: 'from-rose-500 to-orange-500', label: `Details >= ${minLength} chars` },
                        { title: 'Match Velocity', value: `${stats && stats.total_sent_unique > 0 ? ((stats.total_matches / stats.total_sent_unique) * 100).toFixed(1) : 0}%`, icon: Layers, color: 'from-amber-500 to-yellow-500', label: 'Overall match rate' }
                    ].map((card, i) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-xl overflow-hidden group cursor-default h-full">
                                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${card.color}`} />
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-white">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/50">{card.title}</CardTitle>
                                    <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                                        <card.icon size={16} className="text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-black tracking-tighter text-white mb-1">{card.value || 0}</div>
                                    <p className="text-[10px] font-bold text-indigo-200/40 uppercase tracking-widest">{card.label}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Analytics Graphics Column */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                            <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/20">
                                        <PieIcon size={18} className="text-indigo-400" />
                                    </div>
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Deliverability Distribution</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="h-[240px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <defs>
                                                    <linearGradient id="pieMatched" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                                                    </linearGradient>
                                                    <linearGradient id="pieUnmatched" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.4} />
                                                    </linearGradient>
                                                </defs>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    <Cell fill="url(#pieMatched)" />
                                                    <Cell fill="url(#pieUnmatched)" />
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-black text-white">{stats && stats.total_sent_unique > 0 ? ((stats.unique_matches / stats.total_sent_unique) * 100).toFixed(0) : 0}%</span>
                                            <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest">Matched</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3 mb-2">
                                                <CheckCircle2 size={16} className="text-indigo-400" />
                                                <span className="text-[10px] font-black uppercase text-white tracking-wider">Matched Reach</span>
                                            </div>
                                            <p className="text-2xl font-black text-white">{stats?.unique_matches || 0}</p>
                                            <p className="text-[10px] font-medium text-indigo-200/50 uppercase tracking-widest">Recipients found</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3 mb-2">
                                                <AlertCircle size={16} className="text-blue-400" />
                                                <span className="text-[10px] font-black uppercase text-white tracking-wider">Silent Baseline</span>
                                            </div>
                                            <p className="text-2xl font-black text-white">{Math.max(0, (stats?.total_sent_unique || 0) - (stats?.unique_matches || 0))}</p>
                                            <p className="text-[10px] font-medium text-indigo-200/50 uppercase tracking-widest">No trace in logs</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                            <CardHeader className="border-b border-white/5 pb-4 bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/20">
                                        <Layers size={18} className="text-purple-400" />
                                    </div>
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Relative Scale Analysis</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[280px] p-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#4f46e5" />
                                                <stop offset="100%" stopColor="#818cf8" />
                                            </linearGradient>
                                            <linearGradient id="matchGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#e11d48" />
                                                <stop offset="100%" stopColor="#fb7185" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60} animationBegin={500} animationDuration={1500} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>

            {/* Results Table Section */}
            {matches.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden mt-8">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4 bg-white/[0.02]">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100 italic">Detailed Match Manifest</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">{matches.length} matches</span>
                                <button
                                    onClick={() => setShowCleaned(!showCleaned)}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${showCleaned ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-indigo-300 hover:bg-white/10'
                                        }`}
                                >
                                    {showCleaned ? 'Standard View' : 'Raw Details'}
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.01]">
                                            <th className="px-6 py-4 text-[10px] font-black text-indigo-300/40 uppercase tracking-widest">Target Email</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-indigo-300/40 uppercase tracking-widest">Campaign Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-indigo-300/40 uppercase tracking-widest">Hit Timestamp</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-indigo-300/40 uppercase tracking-widest">Activity Trace</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {matches.map((match, idx) => (
                                            <motion.tr
                                                key={match.id + idx}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.1 + (idx * 0.05) }}
                                                className="hover:bg-white/[0.02] transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{match.email}</span>
                                                        <span className="text-[9px] font-medium text-indigo-200/30 italic">Target verified</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-indigo-100/60">{match.sent_at || '-'}</td>
                                                <td className="px-6 py-4 text-xs font-mono text-indigo-100/60">
                                                    {format(new Date(match.security_date), 'yyyy-MM-dd HH:mm:ss')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-md">
                                                        <p className="text-[11px] font-mono leading-relaxed text-indigo-200/80 bg-black/20 p-3 rounded-xl border border-white/5 group-hover:border-white/10 transition-all max-h-24 overflow-y-auto">
                                                            {showCleaned ? match.cleaned_details : match.input_details}
                                                        </p>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </motion.div>
    );
};
