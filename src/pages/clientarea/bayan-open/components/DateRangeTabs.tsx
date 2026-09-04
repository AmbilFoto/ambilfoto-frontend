import { Button } from '@/components/ui/button';

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

interface DateRangeTabsProps {
  value: number;
  onChange: (days: number) => void;
}

export function DateRangeTabs({ value, onChange }: DateRangeTabsProps) {
  return (
    <div className="flex gap-1.5">
      {RANGES.map((r) => (
        <Button
          key={r.days}
          variant={value === r.days ? 'default' : 'outline'}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(r.days)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
