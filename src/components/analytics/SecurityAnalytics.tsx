
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Shield, AlertTriangle, Search, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface SecurityLog {
    id: string;
    email: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    input_details: string;
}

interface SecurityStats {
    top_ips: { ip_address: string; count: number }[];
    recent_logs: SecurityLog[];
}

export function SecurityAnalytics() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["security-stats"],
        queryFn: async () => {
            const response = await api.get("/security/stats");
            return response.data as SecurityStats;
        },
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            await api.post("/security/import", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Security logs imported successfully",
            });
            setFile(null);
            queryClient.invalidateQueries({ queryKey: ["security-stats"] });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to import logs",
                variant: "destructive",
            });
        },
        onSettled: () => {
            setIsUploading(false);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (file) {
            setIsUploading(true);
            uploadMutation.mutate(file);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Import Security Logs</CardTitle>
                    <CardDescription>Upload a CSV file containing security logs for analysis</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <Button onClick={handleUpload} disabled={!file || isUploading}>
                            {isUploading ? "Uploading..." : "Import CSV"}
                            <Upload className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                    {file && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Suspicious IPs</CardTitle>
                        <CardDescription>IP addresses with the most failed attempts</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {stats && stats.top_ips.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.top_ips} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="ip_address" width={120} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'hsl(var(--card))' }}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]}>
                                        {stats.top_ips.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Shield className="h-8 w-8 mb-2 opacity-50" />
                                <p>No data available</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Security Events</CardTitle>
                        <CardDescription>Latest logged security incidents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats?.recent_logs.slice(0, 5).map((log) => (
                                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card/50">
                                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">{log.email || 'Unknown User'}</p>
                                        <div className="text-xs text-muted-foreground flex gap-2">
                                            <span>{log.ip_address}</span>
                                            <span>•</span>
                                            <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!stats?.recent_logs.length && (
                                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                                    <p>No logs found</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Security Log Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Input Details</TableHead>
                                <TableHead className="text-right">User Agent</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats?.recent_logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>{log.email}</TableCell>
                                    <TableCell>{log.ip_address}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={log.input_details}>
                                        {log.input_details || '-'}
                                    </TableCell>
                                    <TableCell className="text-right max-w-[200px] truncate text-muted-foreground" title={log.user_agent}>
                                        {log.user_agent}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!stats?.recent_logs.length && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No logs found. Upload a CSV to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
