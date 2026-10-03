// =============================================================================
// SHAN POULTRY PROTEIN - Display Formatters (Asia/Karachi & PKR)
// =============================================================================

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
};

export const formatTime = (timeString?: string | null): string => {
  if (!timeString) return '—';
  try {
    // If it's a HH:MM or HH:MM:SS string
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      const d = new Date();
      d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10));
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const d = new Date(timeString);
    return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return timeString;
  }
};

export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateString;
  }
};

export const formatWeight = (val?: number | null, unit: string = 'KG'): string => {
  if (val === undefined || val === null) return `0.00 ${unit}`;
  return `${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
};

export const formatCurrency = (val?: number | null, symbol: string = 'Rs.'): string => {
  if (val === undefined || val === null) return `${symbol} 0.00`;
  return `${symbol} ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getDaysInMonth = (year: number, monthIndex: number): number => {
  // monthIndex: 0 = Jan, 8 = Sep, 9 = Oct
  return new Date(year, monthIndex + 1, 0).getDate();
};
