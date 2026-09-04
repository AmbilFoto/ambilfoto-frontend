import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ScanFace } from 'lucide-react';
import { FaceDailyPoint } from '@/hooks/bayan-open/useBayanOpenStats';
import { ChartStateWrapper } from './ChartStateWrapper';
import { fAxisTick, fDateLong, fNum } from '../lib/format';

interface FaceGrowthChartProps {
  data: FaceDailyPoint[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-soft text-xs">
      <p className="text-muted-foreground mb-0.5">{fDateLong(label)}</p>
      <p className="font-semibold">{fNum(payload[0].value)} faces added</p>
    </div>
  );
};

export function FaceGrowthChart({ data, isLoading, error, onRetry }: FaceGrowthChartProps) {
  const periodTotal = data.reduce((sum, d) => sum + d.faces_added, 0);

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ScanFace className="h-4 w-4 text-violet-600" />
          Database Wajah Tersimpan
        </CardTitle>
        {!isLoading && !error && data.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-secondary font-medium">+{fNum(periodTotal)}</span> Wajah ditambahkan pada periode ini
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ChartStateWrapper isLoading={isLoading} error={error} isEmpty={data.length === 0} onRetry={onRetry}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={fAxisTick}
                minTickGap={20}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="faces_added" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartStateWrapper>
      </CardContent>
    </Card>
  );
}
