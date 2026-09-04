import { ScanFace, Users, Images, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BayanOpenSummary } from '@/services/api/bayan-open.service';
import { fNum } from '../lib/format';

interface StatsCardsProps {
  data: BayanOpenSummary | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

interface CardDef {
  label: string;
  value: number;
  todayLabel: string;
  todayValue: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

export function StatsCards({ data, isLoading, error, onRetry }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="shadow-soft border-destructive/30">
        <CardContent className="pt-6 pb-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{error ?? 'Unable to load summary statistics.'}</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const cards: CardDef[] = [
    {
      label: 'Total Scan Wajah User',
      value: data.total_users,
      todayLabel: 'hari ini',
      todayValue: data.today.users,
      icon: Users,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Database Wajah Tersimpan',
      value: data.total_faces,
      todayLabel: 'faces hari ini',
      todayValue: data.today.faces_added,
      icon: ScanFace,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Total foto di Galeri',
      value: data.total_photos,
      todayLabel: 'foto hari ini',
      todayValue: data.today.photos,
      icon: Images,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="shadow-soft">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
                <c.icon className={`h-5 w-5 ${c.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold leading-tight">{fNum(c.value)}</p>
              </div>
            </div>
            {c.todayValue > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                <span className="text-secondary font-medium">+{fNum(c.todayValue)}</span> {c.todayLabel}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
