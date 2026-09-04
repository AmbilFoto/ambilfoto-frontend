import { useMemo, useState } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BayanOpenGalleryDate } from '@/services/api/bayan-open.service';
import { fNum } from '../lib/format';

interface GalleryFiltersProps {
  dates: BayanOpenGalleryDate[];
  isLoading: boolean;
  selectedDate?: string;
  onSelectDate: (date: string | undefined) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [10, 20, 50];

export function GalleryFilters({
  dates,
  isLoading,
  selectedDate,
  onSelectDate,
  limit,
  onLimitChange,
}: GalleryFiltersProps) {
  const [open, setOpen] = useState(false);

  const availableDateSet = useMemo(() => new Set(dates.map((d) => d.date)), [dates]);
  const availableDateObjs = useMemo(() => dates.map((d) => parseISO(d.date)), [dates]);

  const selectedDateObj = selectedDate ? parseISO(selectedDate) : undefined;
  const selectedCount = selectedDate
    ? dates.find((d) => d.date === selectedDate)?.photos
    : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onSelectDate(undefined);
      setOpen(false);
      return;
    }
    const iso = format(date, 'yyyy-MM-dd');
    onSelectDate(availableDateSet.has(iso) ? iso : undefined);
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={isLoading}
              className={cn(
                'group min-w-[200px] justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background',
                !selectedDate && 'text-muted-foreground',
              )}
            >
              <span className={cn('truncate', !selectedDate && 'text-muted-foreground')}>
                {selectedDateObj
                  ? `${format(selectedDateObj, 'PPP')}${
                      selectedCount !== undefined ? ` · ${fNum(selectedCount)} photos` : ''
                    }`
                  : 'Semua Tanggal'}
              </span>
              <CalendarIcon
                size={16}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground/80 transition-colors group-hover:text-foreground"
                aria-hidden="true"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <Calendar
              mode="single"
              selected={selectedDateObj}
              onSelect={handleSelect}
              disabled={(date) => !availableDateSet.has(format(date, 'yyyy-MM-dd'))}
              defaultMonth={availableDateObjs[availableDateObjs.length - 1]}
            />
          </PopoverContent>
        </Popover>
        {selectedDate && (
          <button
            onClick={() => onSelectDate(undefined)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear filter
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-xs text-muted-foreground">Per Halaman</span>
        {LIMIT_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => onLimitChange(opt)}
            className={`text-xs px-2 py-1 rounded-md border transition-smooth ${
              limit === opt
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}