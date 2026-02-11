
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Fingerprint, Mail, RefreshCw, Layers, Upload, FileText } from 'lucide-react';
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
    total_matches_unique: number;
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

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Please upload a CSV file first.");
            return;
        }

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
            toast.success("Analysis complete");
        } catch (error) {
            console.error('Failed to fetch comparison data', error);
            toast.error('Failed to analyze data. Ensure CSV has an "email" column.');
        } finally {
            setIsLoading(false);
        }
    };

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
        { name: 'CSV Emails', value: stats.total_sent_unique, fill: '#0ea5e9' },
        { name: 'Security Matches', value: stats.total_matches_unique, fill: '#ef4444' }
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
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleDownloadSample}
                        className="flex items-center gap-2 px-3 py-2 text-xs bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        <FileText size={14} /> Download Sample CSV
                    </button>

                    <div className="relative">
                        <input
                            id="csv-upload"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button className={`flex items-center gap-2 px-4 py-2 border border-border rounded-lg transition-colors ${file ? 'bg-primary/10 border-primary text-primary' : 'bg-card hover:bg-muted'}`}>
                            <Upload size={16} />
                            {file ? file.name : 'Upload CSV'}
                        </button>
                    </div>

                    {file && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-lg transition-colors"
                        >
                            Reset
                        </button>
                    )}

                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-border rounded-lg">
                        <span className="text-xs text-muted-foreground">Min Length:</span>
                        <input
                            type="number"
                            min="0"
                            max="50"
                            className="w-12 bg-transparent border-none text-xs focus:ring-0 p-0 text-center"
                            value={minLength}
                            onChange={(e) => setMinLength(parseInt(e.target.value) || 0)}
                        />
                    </div>

                    <button
                        onClick={() => setUniqueOnly(!uniqueOnly)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs border rounded-lg transition-all ${uniqueOnly ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-border text-muted-foreground hover:text-white'}`}
                        title="Show only most recent log for each email"
                    >
                        {uniqueOnly ? 'Unique Emails: ON' : 'Unique Emails: OFF'}
                    </button>

                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !file}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        {stats ? 'Re-Compare' : 'Analyze'}
                    </button>

                    <div className="flex gap-1">
                        <button
                            onClick={handleExportReport}
                            disabled={isExporting || !file}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-l-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-r border-white/10"
                            title="Export Word Report"
                        >
                            <Download size={16} className={isExporting ? 'animate-pulse' : ''} />
                            {isExporting ? '...' : 'RTF'}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            disabled={isExportingCSV || !file}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-r-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export CSV Data"
                        >
                            <FileText size={16} className={isExportingCSV ? 'animate-pulse' : ''} />
                            {isExportingCSV ? '...' : 'CSV'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats & Graph Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 lg:col-span-1">
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Emails in CSV</CardTitle>
                            <Mail className="h-4 w-4 text-sky-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_sent_unique || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Unique emails processed</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Security Matches</CardTitle>
                            <Fingerprint className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{stats?.total_matches_unique || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Matched logs with details {'>'}= {minLength} chars</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Match Rate</CardTitle>
                            <Layers className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-500">
                                {stats && stats.total_sent_unique > 0
                                    ? ((stats.total_matches_unique / stats.total_sent_unique) * 100).toFixed(1)
                                    : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">CSV to Security Log ratio</p>
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
