
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
        { name: 'Total Emails', value: stats.total_sent_unique, fill: '#22c55e' },
        { name: 'Security Matches', value: stats.total_matches, fill: '#ef4444' }
    ] : [];

    const pieData = stats ? [
        { name: 'Matched', value: stats.unique_matches },
        { name: 'Unmatched', value: Math.max(0, stats.total_sent_unique - stats.unique_matches) }
    ] : [];

    const PIE_COLORS = ['#ef4444', '#f97316'];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 bg-black p-6 min-h-screen text-white"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase">
                        Comparison <span className="text-green-500">Analyser</span>
                    </h2>
                    <p className="text-zinc-400 text-lg mt-2 max-w-md font-bold">
                        High-contrast analysis of campaign reach vs. security hits.
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 items-center relative z-10">
                    {/* Input Group */}
                    <div className="flex items-center gap-2 p-1.5 bg-black border-2 border-zinc-700 rounded-xl">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleDownloadSample}
                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                            title="Download Sample CSV"
                        >
                            <FileText size={20} />
                        </motion.button>
                        <div className="h-6 w-0.5 bg-zinc-700" />
                        <div className="relative">
                            <input
                                id="csv-upload"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className={`flex items-center gap-2 px-6 py-2 text-sm font-black rounded-lg transition-all ${file ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-transparent text-zinc-400 hover:text-white border-2 border-zinc-800'}`}>
                                <Upload size={18} />
                                <span className="max-w-[150px] truncate">{file ? file.name : 'UPLOAD CSV'}</span>
                            </button>
                        </div>
                        {file && (
                            <motion.button
                                whileHover={{ rotate: 180, color: '#ef4444' }}
                                onClick={handleReset}
                                className="p-2 text-zinc-500 transition-colors ml-1"
                                title="Clear file"
                            >
                                <RefreshCw size={18} />
                            </motion.button>
                        )}
                    </div>

                    {/* Settings Group */}
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-black border-2 border-zinc-700 rounded-xl">
                        <div className="flex items-center gap-2 border-r-2 border-zinc-700 pr-4 font-mono">
                            <span className="text-xs uppercase font-black text-orange-500">LENGTH:</span>
                            <input
                                type="number"
                                min="0"
                                max="50"
                                className="w-12 bg-transparent border-none text-base focus:ring-0 p-0 text-center font-black text-white"
                                value={minLength}
                                onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <motion.button
                            whileHover={{ backgroundColor: uniqueOnly ? '#000' : '#f97316', color: uniqueOnly ? '#f97316' : '#fff' }}
                            onClick={() => setUniqueOnly(!uniqueOnly)}
                            className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all py-2 px-6 rounded-lg border-2 ${uniqueOnly
                                ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-900/50'
                                : 'text-zinc-400 border-zinc-700 hover:text-white'
                                }`}
                        >
                            <UserCheck size={18} />
                            {uniqueOnly ? 'UNIQUE ON' : 'DUPLICATES'}
                        </motion.button>
                    </div>

                    {/* Action Group */}
                    <div className="flex items-center gap-4 ml-auto">
                        <AnimatePresence>
                            {stats && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex bg-black border-2 border-zinc-700 rounded-xl overflow-hidden p-1 shadow-lg"
                                >
                                    <motion.button
                                        whileHover={{ backgroundColor: '#22c55e', color: '#fff' }}
                                        onClick={handleExportReport}
                                        disabled={isExporting || !file}
                                        className="p-3 text-zinc-400 transition-all rounded-lg"
                                        title="Download Word"
                                    >
                                        <Download size={22} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ backgroundColor: '#22c55e', color: '#fff' }}
                                        onClick={handleExportCSV}
                                        disabled={isExportingCSV || !file}
                                        className="p-3 text-zinc-400 transition-all rounded-lg"
                                        title="Download CSV"
                                    >
                                        <FileText size={22} />
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileHover={{ scale: 1.05, backgroundColor: '#22c55e' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAnalyze}
                            disabled={isLoading || !file}
                            className={`flex items-center gap-3 px-10 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-2xl border-2 ${isLoading
                                    ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                                    : 'bg-green-700 text-white border-green-500 shadow-green-900/40'
                                }`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                            {isLoading ? 'ANALYZING...' : (stats ? 'REFRESH' : 'ANALYZE NOW')}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Stats Cards Column */}
                <div className="grid grid-cols-1 gap-6 lg:col-span-1">
                    {[
                        { title: 'CAMPAIGN SIZE', value: stats?.total_sent_unique, icon: Mail, color: 'border-green-500 text-green-500', label: 'UNIQUE RECIPIENTS' },
                        { title: 'SECURITY HITS', value: stats?.total_matches, icon: Fingerprint, color: 'border-red-500 text-red-500', label: `DETAILS > ${minLength} CHARS` },
                        { title: 'MATCH VELOCITY', value: `${stats && stats.total_sent_unique > 0 ? ((stats.total_matches / stats.total_sent_unique) * 100).toFixed(1) : 0}%`, icon: Layers, color: 'border-orange-500 text-orange-500', label: 'HIT PERCENTAGE' }
                    ].map((card, i) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className={`bg-black border-4 ${card.color.split(' ')[0]} shadow-[0_0_20px_rgba(0,0,0,0.8)] h-full`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">{card.title}</CardTitle>
                                    <card.icon size={24} className={card.color.split(' ')[1]} />
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-5xl font-black tracking-tighter mb-1 ${card.color.split(' ')[1]}`}>{card.value || 0}</div>
                                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">{card.label}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Analytics Graphics Column */}
                <div className="lg:col-span-2 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="bg-black border-4 border-zinc-800 shadow-2xl overflow-hidden">
                            <CardHeader className="border-b-4 border-zinc-900 pb-4 bg-zinc-950">
                                <div className="flex items-center gap-3 text-white">
                                    <PieIcon size={24} className="text-orange-500" />
                                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">HIT DISTRIBUTION</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                    <div className="h-[280px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={10}
                                                    dataKey="value"
                                                    stroke="#000"
                                                    strokeWidth={4}
                                                >
                                                    <Cell fill="#ef4444" /> {/* Red for Matched */}
                                                    <Cell fill="#f97316" /> {/* Orange for Unmatched */}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#000', border: '2px solid #3f3f46', borderRadius: '0px', color: '#fff', fontSize: '12px', fontWeight: '900' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-4xl font-black text-white">{stats && stats.total_sent_unique > 0 ? ((stats.unique_matches / stats.total_sent_unique) * 100).toFixed(0) : 0}%</span>
                                            <span className="text-xs font-extrabold text-red-500 uppercase tracking-widest">MATCHED</span>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="p-6 rounded-none border-l-8 border-red-600 bg-zinc-950">
                                            <div className="flex items-center gap-3 mb-2">
                                                <CheckCircle2 size={20} className="text-red-500" />
                                                <span className="text-xs font-black uppercase text-white">SECURITY HITS</span>
                                            </div>
                                            <p className="text-4xl font-black text-white">{stats?.unique_matches || 0}</p>
                                        </div>
                                        <div className="p-6 rounded-none border-l-8 border-orange-600 bg-zinc-950">
                                            <div className="flex items-center gap-3 mb-2">
                                                <AlertCircle size={20} className="text-orange-500" />
                                                <span className="text-xs font-black uppercase text-white">SILENT BASELINE</span>
                                            </div>
                                            <p className="text-4xl font-black text-white">{Math.max(0, (stats?.total_sent_unique || 0) - (stats?.unique_matches || 0))}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="bg-black border-4 border-zinc-800 shadow-2xl overflow-hidden">
                            <CardHeader className="border-b-4 border-zinc-900 pb-4 bg-zinc-950">
                                <div className="flex items-center gap-3 text-white">
                                    <Layers size={24} className="text-green-500" />
                                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">COMPARISON SCALE</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[300px] p-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="0" vertical={false} stroke="#27272a" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={{ stroke: '#3f3f46', strokeWidth: 2 }}
                                            tickLine={false}
                                            tick={{ fill: '#fff', fontSize: 12, fontWeight: '900' }}
                                        />
                                        <YAxis
                                            axisLine={{ stroke: '#3f3f46', strokeWidth: 2 }}
                                            tickLine={false}
                                            tick={{ fill: '#fff', fontSize: 12, fontWeight: '900' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '2px solid #3f3f46', borderRadius: '0px', color: '#fff' }}
                                        />
                                        <Bar dataKey="value" strokeWidth={0} />
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
                    <Card className="bg-black border-4 border-zinc-800 shadow-2xl overflow-hidden mt-8">
                        <CardHeader className="flex flex-row items-center justify-between border-b-4 border-zinc-900 pb-4 bg-zinc-950">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white">DETAILED MATCH MANIFEST</CardTitle>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-black text-green-500 bg-green-900/20 px-4 py-1.5 border border-green-800">{matches.length} MATCHES</span>
                                <button
                                    onClick={() => setShowCleaned(!showCleaned)}
                                    className={`px-6 py-2 rounded-none text-xs font-black uppercase tracking-widest transition-all border-2 ${showCleaned ? 'bg-orange-600 text-white border-orange-500' : 'bg-black text-zinc-400 border-zinc-700 hover:border-white hover:text-white'
                                        }`}
                                >
                                    {showCleaned ? 'STANDARD VIEW' : 'RAW DETAILS'}
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-zinc-950 border-b-2 border-zinc-900">
                                            <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">TARGET EMAIL</th>
                                            <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">CAMPAIGN DATE</th>
                                            <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">HIT TIMESTAMP</th>
                                            <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">ACTIVITY TRACE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-zinc-900">
                                        {matches.map((match, idx) => (
                                            <motion.tr
                                                key={match.id + idx}
                                                className="bg-black hover:bg-zinc-900 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-white uppercase tracking-tight">{match.email}</span>
                                                        <span className="text-[10px] font-bold text-green-500">VERIFIED HIT</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono font-black text-white">{match.sent_at || '-'}</td>
                                                <td className="px-6 py-4 text-xs font-mono font-black text-orange-500">
                                                    {format(new Date(match.security_date), 'yyyy-MM-dd HH:mm:ss')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-md">
                                                        <p className="text-xs font-mono leading-relaxed text-zinc-300 bg-black p-4 border-2 border-zinc-800 max-h-32 overflow-y-auto">
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
