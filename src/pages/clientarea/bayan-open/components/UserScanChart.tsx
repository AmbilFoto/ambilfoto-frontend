import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Activity } from 'lucide-react';
import { UserDailyPoint } from '@/hooks/bayan-open/useBayanOpenStats';
import { ChartStateWrapper } from './ChartStateWrapper';
import { DateRangeTabs } from './DateRangeTabs';
import { fAxisTick, fDateLong, fNum } from '../lib/format';

interface UserScanChartProps {
  data: UserDailyPoint[];
  isLoading: boolean;
  error: string | null;
  days: number;
  onDaysChange: (days: number) => void;
  onRetry: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-soft text-xs">
      <p className="text-muted-foreground mb-0.5">{fDateLong(label)}</p>
      <p className="font-semibold">{fNum(payload[0].value)} users</p>
    </div>
  );
};

export function UserScanChart({ data, isLoading, error, days, onDaysChange, onRetry }: UserScanChartProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Aktivitas Scan Wajah User
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Jumlah user yang melakukan scan per hari</p>
        </div>
        <DateRangeTabs value={days} onChange={onDaysChange} />
      </CardHeader>
      <CardContent>
        <ChartStateWrapper isLoading={isLoading} error={error} isEmpty={data.length === 0} onRetry={onRetry}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userScanFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={fAxisTick}
                minTickGap={24}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#userScanFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartStateWrapper>
      </CardContent>
    </Card>
  );
}
