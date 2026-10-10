// =============================================================================
// SHAN POULTRY PROTEIN - Customer Daily Record Completion Status Engine
// Manages daily reset (Strictly resets to RED at 12:00 AM midnight), and
// previous entry short summary for illiterate/semi-literate field drivers
// =============================================================================

export interface PreviousEntryShort {
  date: string;
  time: string;
  friendlyDateText: string; // e.g. "آج 10:30 AM", "کل 4:26 PM", "08 Oct 3:15 PM"
  receiptNo?: string;
  totalWeight: number; // KG
  totalAmount: number; // PKR
  charbiWeight?: number;
  kacharaWeight?: number;
  charbiRate?: number;
  kacharaRate?: number;
}

export interface CustomerDailyStatus {
  customerId: string;
  isCompleted: boolean; // true = Green (completed TODAY), false = Red (pending TODAY)
  status: 'completed' | 'pending';
  labelUrdu: string; // 'مکمل' or 'بقایہ'
  labelEn: string; // 'Served Today' or 'Pending Today'
  badgeColor: 'green' | 'red';
  lastCompletedAt: Date | null;
  lastCompletedDateStr: string | null;
  lastReceiptNo: string | null;
  hoursAgo: number | null;
  isTodayServed: boolean;
  formattedTime: string | null;
  summaryText: string;
  previousEntryShort?: PreviousEntryShort | null;
  totalCollectionsCount: number;
}

export interface MinimalCollectionRecord {
  id?: string;
  customer_id: string;
  collection_date?: string;
  collection_time?: string;
  collection_timestamp?: string;
  created_at?: string;
  status?: string;
  receipt_no?: string;
  gross_weight?: number;
  tare_weight?: number;
  total_net_weight?: number;
  total_amount?: number;
  charbi_net?: number;
  charbi_gross?: number;
  charbi_rate?: number;
  kachara_net?: number;
  kachara_gross?: number;
  kachara_rate?: number;
  [key: string]: any;
}

export interface MinimalCustomerRecord {
  id: string;
  category_rates?: Record<string, any>;
  [key: string]: any;
}

/**
 * Returns current date string in local YYYY-MM-DD format (Pakistan/browser local time)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date into friendly 12-hour PKT/local time string e.g. "10:30 AM"
 */
export function formatFriendlyTime(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a Date into friendly Urdu/PKT date & time string:
 * - Same day -> "آج 10:30 AM"
 * - Yesterday -> "کل 4:26 PM"
 * - Older -> "08 Oct 04:26 PM"
 */
export function formatFriendlyDateTime(date: Date, referenceDate: Date = new Date()): string {
  const timeStr = formatFriendlyTime(date);
  const dateStr = getLocalDateString(date);
  const refStr = getLocalDateString(referenceDate);

  if (dateStr === refStr) {
    return `آج ${timeStr}`;
  }

  // Check if yesterday in calendar dates
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = getLocalDateString(yesterday);
  if (dateStr === yestStr) {
    return `کل ${timeStr}`;
  }

  // Format e.g. "08 Oct 04:26 PM"
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  return `${day} ${month} ${timeStr}`;
}

function parseColDate(col: MinimalCollectionRecord): Date | null {
  if (col.collection_timestamp) {
    const p = new Date(col.collection_timestamp);
    if (!isNaN(p.getTime())) return p;
  }
  if (col.created_at) {
    const p = new Date(col.created_at);
    if (!isNaN(p.getTime())) return p;
  }
  if (col.collection_date) {
    const tStr = col.collection_time ? col.collection_time.slice(0, 8) : '12:00:00';
    const p = new Date(`${col.collection_date}T${tStr}`);
    if (!isNaN(p.getTime())) return p;
  }
  return null;
}

function parseColTimestamp(col: MinimalCollectionRecord): number {
  const d = parseColDate(col);
  return d ? d.getTime() : 0;
}

/**
 * Computes the Daily Completion Status for a single customer.
 * 
 * Strict Daily Reset Rules:
 * 1. GREEN (Completed): An entry was saved on TODAY'S calendar date (between 12:00 AM and 11:59 PM today).
 * 2. RED (Pending): No entry exists for TODAY. (Resets back to RED automatically after 12:00 AM midnight).
 * 3. Shows previous entry in short (آخری اینٹری کا وزن، رقم اور تاریخ) so field workers can easily identify shops.
 */
export function getCustomerDailyStatus(
  customer: MinimalCustomerRecord,
  collections: MinimalCollectionRecord[] = [],
  referenceDate: Date = new Date()
): CustomerDailyStatus {
  const todayStr = getLocalDateString(referenceDate);

  // 1. Filter valid non-cancelled collections for this customer
  const relevantCols = collections.filter(c => {
    if (c.customer_id !== customer.id) return false;
    const s = (c.status || '').toLowerCase();
    return s !== 'cancelled' && s !== 'draft';
  });

  // 2. Sort collections by timestamp descending (newest first)
  const sortedCols = [...relevantCols].sort((a, b) => {
    return parseColTimestamp(b) - parseColTimestamp(a);
  });

  let hasTodayRecord = false;
  let latestTimestamp: Date | null = null;
  let latestDateStr: string | null = null;
  let latestReceiptNo: string | null = null;

  for (const col of relevantCols) {
    const colDate = parseColDate(col);
    const cDateStr = col.collection_date || (colDate ? getLocalDateString(colDate) : null);

    // Strict Today's Calendar Date Check (Matches YYYY-MM-DD local)
    if (cDateStr === todayStr) {
      hasTodayRecord = true;
    }

    if (colDate) {
      if (!latestTimestamp || colDate.getTime() > latestTimestamp.getTime()) {
        latestTimestamp = colDate;
        latestDateStr = cDateStr;
        latestReceiptNo = col.receipt_no || null;
      }
    }
  }

  // Also check database-persisted daily_record_status on customer record
  const persistedDaily = customer.category_rates?.daily_record_status;
  if (persistedDaily && typeof persistedDaily === 'object') {
    if (persistedDaily.last_collection_date === todayStr) {
      hasTodayRecord = true;
    }
    if (persistedDaily.last_completed_at) {
      const pDate = new Date(persistedDaily.last_completed_at);
      if (!isNaN(pDate.getTime())) {
        if (!latestTimestamp || pDate.getTime() > latestTimestamp.getTime()) {
          latestTimestamp = pDate;
          latestDateStr = persistedDaily.last_collection_date || getLocalDateString(pDate);
          latestReceiptNo = persistedDaily.receipt_no || latestReceiptNo;
        }
      }
    }
  }

  // 3. Strict 12:00 AM Midnight Reset Decision:
  // Is it completed? ONLY if recorded TODAY. If yesterday or older, it is strictly RED (Pending).
  const isCompleted = Boolean(hasTodayRecord);

  let formattedTime: string | null = null;
  let hoursAgo: number | null = null;

  if (latestTimestamp) {
    const diffMs = referenceDate.getTime() - latestTimestamp.getTime();
    if (diffMs >= 0) {
      hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
    }
    formattedTime = formatFriendlyDateTime(latestTimestamp, referenceDate);
  }

  // 4. Previous entry short summary (آخری اینٹری کا خلاصہ)
  const latestCol = sortedCols[0];
  let previousEntryShort: PreviousEntryShort | null = null;

  if (latestCol) {
    const lDate = parseColDate(latestCol);
    const friendlyDateText = lDate ? formatFriendlyDateTime(lDate, referenceDate) : (latestCol.collection_date || '');
    let charbiNet = Number(latestCol.charbi_net || 0);
    let kacharaNet = Number(latestCol.kachara_net || 0);
    let charbiRate = latestCol.charbi_rate;
    let kacharaRate = latestCol.kachara_rate;

    if (!charbiNet && !kacharaNet && Array.isArray(latestCol.items) && latestCol.items.length > 0) {
      for (const it of latestCol.items) {
        const cat = (it.category_code || it.category_id || it.category_name || '').toLowerCase();
        if (cat.includes('charbi')) {
          charbiNet += Number(it.weight || 0);
          charbiRate = it.rate ?? charbiRate;
        } else if (cat.includes('kachara')) {
          kacharaNet += Number(it.weight || 0);
          kacharaRate = it.rate ?? kacharaRate;
        }
      }
    }

    const netWeight = Number(latestCol.total_net_weight || (charbiNet + kacharaNet) || latestCol.gross_weight || 0);
    const amount = Number(latestCol.total_amount || 0);

    previousEntryShort = {
      date: latestCol.collection_date || '',
      time: latestCol.collection_time || '',
      friendlyDateText,
      receiptNo: latestCol.receipt_no,
      totalWeight: Number(netWeight.toFixed(1)),
      totalAmount: Math.round(amount),
      charbiWeight: charbiNet > 0 ? Number(charbiNet.toFixed(1)) : undefined,
      kacharaWeight: kacharaNet > 0 ? Number(kacharaNet.toFixed(1)) : undefined,
      charbiRate,
      kacharaRate,
    };
  } else if (persistedDaily && (persistedDaily.last_collection_date || persistedDaily.last_completed_at)) {
    const pDate = persistedDaily.last_completed_at ? new Date(persistedDaily.last_completed_at) : null;
    const friendlyDateText = pDate && !isNaN(pDate.getTime())
      ? formatFriendlyDateTime(pDate, referenceDate)
      : (persistedDaily.last_collection_date || 'پچھلی تاریخ');
    const pWeight = Number(persistedDaily.total_net_weight || customer.category_rates?.total_waste_weight || 0);
    const pAmount = Number(persistedDaily.total_amount || 0);

    if (pWeight > 0 || pAmount > 0 || persistedDaily.receipt_no) {
      previousEntryShort = {
        date: persistedDaily.last_collection_date || '',
        time: '',
        friendlyDateText,
        receiptNo: persistedDaily.receipt_no,
        totalWeight: Number(pWeight.toFixed(1)),
        totalAmount: Math.round(pAmount),
        charbiWeight: persistedDaily.charbi_net ? Number(persistedDaily.charbi_net.toFixed(1)) : undefined,
        kacharaWeight: persistedDaily.kachara_net ? Number(persistedDaily.kachara_net.toFixed(1)) : undefined,
        charbiRate: persistedDaily.charbi_rate,
        kacharaRate: persistedDaily.kachara_rate,
      };
    }
  }

  let summaryText = '';
  if (isCompleted) {
    summaryText = `آج کا ریکارڈ مکمل ہے (${formattedTime || 'Served Today'})`;
  } else {
    summaryText = latestTimestamp
      ? `آج بقایہ ہے (آخری اینٹری: ${formattedTime})`
      : 'آج کا ریکارڈ بقایہ ہے (Pending Record)';
  }

  return {
    customerId: customer.id,
    isCompleted,
    status: isCompleted ? 'completed' : 'pending',
    labelUrdu: isCompleted ? 'مکمل' : 'بقایہ',
    labelEn: isCompleted ? 'Served Today' : 'Pending Today',
    badgeColor: isCompleted ? 'green' : 'red',
    lastCompletedAt: latestTimestamp,
    lastCompletedDateStr: latestDateStr,
    lastReceiptNo: latestReceiptNo,
    hoursAgo,
    isTodayServed: hasTodayRecord,
    formattedTime,
    summaryText,
    previousEntryShort,
    totalCollectionsCount: relevantCols.length,
  };
}

/**
 * Calculates summary metrics across all customers (Completed count vs Pending count)
 */
export function getDailyStatusSummary(
  customers: MinimalCustomerRecord[],
  collections: MinimalCollectionRecord[] = [],
  referenceDate: Date = new Date()
) {
  let completedCount = 0;
  let pendingCount = 0;
  const statusMap = new Map<string, CustomerDailyStatus>();

  for (const c of customers) {
    const status = getCustomerDailyStatus(c, collections, referenceDate);
    statusMap.set(c.id, status);
    if (status.isCompleted) {
      completedCount++;
    } else {
      pendingCount++;
    }
  }

  return {
    total: customers.length,
    completedCount,
    pendingCount,
    statusMap,
  };
}
