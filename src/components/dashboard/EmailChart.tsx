import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface DailyStat {
  date: string;
  sent: number;
  failed: number;
}

interface EmailChartProps {
  dailyStats?: DailyStat[];
}

export function EmailChart({ dailyStats = [] }: EmailChartProps) {
  const chartData = dailyStats.map((stat) => ({
    date: format(new Date(stat.date), 'EEE'),
    sent: stat.sent,
    failed: stat.failed,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Email Activity</h3>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(173 80% 40%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(173 80% 40%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="hsl(220 10% 45%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(220 10% 45%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220 25% 12%)',
                border: 'none',
                borderRadius: '8px',
                color: 'hsl(220 15% 95%)',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="sent"
              stroke="hsl(173 80% 40%)"
              strokeWidth={2}
              fill="url(#sentGradient)"
              name="Sent"
            />
            <Area
              type="monotone"
              dataKey="failed"
              stroke="hsl(0 72% 51%)"
              strokeWidth={2}
              fill="url(#failedGradient)"
              name="Failed"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
