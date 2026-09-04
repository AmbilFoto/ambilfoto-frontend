import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const fNum = (v: number) => new Intl.NumberFormat('id-ID').format(v);

/** "2026-09-04" → "04 Sep 2026" */
export const fDateShort = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

/** "2026-09-04" → "4 September 2026" (chart tooltips) */
export const fDateLong = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'd MMMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

/** ISO timestamp → "04 Sep 2026, 14:32" */
export const fDateTime = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

/** "2026-09-04" → axis tick "04 Sep" */
export const fAxisTick = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'dd MMM', { locale: idLocale });
  } catch {
    return dateStr.slice(5);
  }
};
