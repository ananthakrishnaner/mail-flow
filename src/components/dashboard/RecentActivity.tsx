
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
    id: string;
    email: string;
    campaign_name: string;
    status: "sent" | "failed";
    created_at: string;
}

export function RecentActivity() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ["recent-activity"],
        queryFn: async () => {
            const response = await api.get("/stats/recent-activity");
            return response.data as ActivityLog[];
        },
        refetchInterval: 10000,
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                    No recent activity found
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs?.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{log.email}</TableCell>
                                    <TableCell>{log.campaign_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                                            {log.status === "sent" ? "Data has been sent" : "Failed to send data"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
