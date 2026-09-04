import { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartStateWrapperProps {
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage?: string;
  onRetry: () => void;
  height?: number;
  children: ReactNode;
}

export function ChartStateWrapper({
  isLoading,
  error,
  isEmpty,
  emptyMessage = 'No data available for this period.',
  onRetry,
  height = 240,
  children,
}: ChartStateWrapperProps) {
  if (isLoading) {
    return <Skeleton className="rounded-lg w-full" style={{ height }} />;
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-center px-4"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
}
