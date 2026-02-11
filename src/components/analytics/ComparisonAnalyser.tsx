
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Fingerprint, Mail, RefreshCw, Layers, Upload, FileText, UserCheck } from 'lucide-react';
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
        { name: 'CSV Total', value: stats.total_sent_unique, fill: 'hsl(var(--foreground))' },
        { name: 'Matches', value: stats.total_matches, fill: 'hsl(var(--foreground)/0.3)' }
    ] : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Comparison Analyser
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Upload Sent Campaign CSV to compare against Security Logs
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Input Group */}
                    <div className="flex items-center gap-2 p-1 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg shadow-sm">
                        <button
                            onClick={handleDownloadSample}
                            className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                            title="Download Sample CSV"
                        >
                            <FileText size={16} />
                        </button>
                        <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
                        <div className="relative">
                            <input
                                id="csv-upload"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${file ? 'text-black dark:text-white bg-black/5 dark:bg-white/5' : 'text-zinc-400 hover:text-black dark:hover:text-white'}`}>
                                <Upload size={14} />
                                <span className="max-w-[120px] truncate">{file ? file.name : 'Upload CSV'}</span>
                            </button>
                        </div>
                        {file && (
                            <button
                                onClick={handleReset}
                                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors ml-1"
                                title="Clear file"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>

                    {/* Settings Group */}
                    <div className="flex items-center gap-3 px-3 py-1 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 border-r border-black/10 dark:border-white/10 pr-3 font-mono">
                            <span className="text-[10px] uppercase font-bold text-zinc-500">Min:</span>
                            <input
                                type="number"
                                min="0"
                                max="50"
                                className="w-8 bg-transparent border-none text-xs focus:ring-0 p-0 text-center font-bold text-black dark:text-white"
                                value={minLength}
                                onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <button
                            onClick={() => setUniqueOnly(!uniqueOnly)}
                            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all py-1.5 px-3 rounded-md border ${uniqueOnly
                                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                                : 'text-zinc-400 border-transparent hover:text-black dark:hover:text-white'
                                }`}
                        >
                            <UserCheck size={14} className={uniqueOnly ? 'opacity-100' : 'opacity-40'} />
                            {uniqueOnly ? 'Unique' : 'All Logs'}
                        </button>
                    </div>

                    {/* Action Group */}
                    <div className="flex items-center gap-2 ml-auto">
                        {!stats && (
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading || !file}
                                className="flex items-center gap-2 px-6 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 active:scale-95 shadow-lg shadow-black/10 dark:shadow-white/5"
                            >
                                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                                Analyze
                            </button>
                        )}

                        {stats && (
                            <div className="flex bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden p-1 shadow-sm">
                                <button
                                    onClick={handleExportReport}
                                    disabled={isExporting || !file}
                                    className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-all rounded-md"
                                    title="Download Report"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    disabled={isExportingCSV || !file}
                                    className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-all rounded-md"
                                    title="Download CSV"
                                >
                                    <FileText size={16} />
                                </button>
                                <div className="h-6 w-px bg-black/10 dark:bg-white/10 mx-1 self-center" />
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isLoading || !file}
                                    className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-all rounded-md"
                                    title="Re-run Analysis"
                                >
                                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats & Graph Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 lg:col-span-1">
                    <Card className="bg-white dark:bg-zinc-900 border-black/5 dark:border-white/5 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">CSV Population</CardTitle>
                            <div className="h-1.5 w-1.5 rounded-full bg-black dark:bg-white" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-mono tracking-tighter">{stats?.total_sent_unique || 0}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-zinc-900 border-black/5 dark:border-white/5 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Security Hits</CardTitle>
                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-mono tracking-tighter">{stats?.total_matches || 0}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-zinc-900 border-black/5 dark:border-white/5 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Hit Radius</CardTitle>
                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-mono tracking-tighter">
                                {stats && stats.total_sent_unique > 0
                                    ? ((stats.total_matches / stats.total_sent_unique) * 100).toFixed(0)
                                    : 0}%
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Graph */}
                <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-black/5 dark:border-white/5 pb-4">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Activity Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[280px] pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.2} horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={80} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold'
                                    }}
                                    cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Comparison Table */}
            <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Matched Details</CardTitle>
                    <button
                        onClick={() => setShowCleaned(!showCleaned)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${showCleaned ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-muted border-border text-muted-foreground'}`}
                    >
                        {showCleaned ? 'Standard Format' : 'Clean Format'}
                    </button>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="p-4 font-medium text-muted-foreground">Email Address</th>
                                <th className="p-4 font-medium text-muted-foreground">Sent Date (CSV)</th>
                                <th className="p-4 font-medium text-muted-foreground">Security Log Date</th>
                                <th className="p-4 font-medium text-muted-foreground">Input Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {matches.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        {file ? "No filtered matches found in uploaded CSV." : "Upload a CSV file and click Analyze to see results."}
                                    </td>
                                </tr>
                            ) : (
                                matches.map((match, idx) => (
                                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4 font-medium">{match.email}</td>
                                        <td className="p-4 text-muted-foreground">
                                            {match.sent_at || '-'}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {match.security_date ? format(new Date(match.security_date), 'MMM dd, yyyy HH:mm') : '-'}
                                        </td>
                                        <td className="p-4 font-mono text-xs max-w-[300px] break-all">
                                            {showCleaned ? (match.cleaned_details || '-') : (match.input_details || '-')}
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
