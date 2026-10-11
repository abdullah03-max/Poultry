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
 * Returns current date string in Pakistan Standard Time (PKT, UTC+5) in YYYY-MM-DD format
 */
export function getPKTDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date); // Strictly YYYY-MM-DD in PKT
  } catch {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const pktDate = new Date(utc + (5 * 3600000));
    const y = pktDate.getFullYear();
    const m = String(pktDate.getMonth() + 1).padStart(2, '0');
    const d = String(pktDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Returns current date string in local YYYY-MM-DD format (Pakistan/browser local time)
 */
export function getLocalDateString(date: Date = new Date()): string {
  return getPKTDateString(date);
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
 * Extracts YYYY-MM-DD string in PKT from a collection record
 */
export function getCollectionPKTDate(col: MinimalCollectionRecord): string | null {
  if (col.collection_date && typeof col.collection_date === 'string' && col.collection_date.trim()) {
    return col.collection_date.trim().substring(0, 10);
  }
  const dateObj = parseColDate(col);
  if (dateObj) {
    return getPKTDateString(dateObj);
  }
  return null;
}

/**
 * Formats a Date into friendly Urdu/PKT date & time string:
 * - Same day -> "آج 10:30 AM"
 * - Yesterday -> "کل 4:26 PM"
 * - Older -> "08 Oct 04:26 PM"
 */
export function formatFriendlyDateTime(date: Date, referenceDate: Date = new Date()): string {
  const timeStr = formatFriendlyTime(date);
  const dateStr = getPKTDateString(date);
  const refStr = getPKTDateString(referenceDate);

  if (dateStr === refStr) {
    return `آج ${timeStr}`;
  }

  // Check if yesterday in calendar dates
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = getPKTDateString(yesterday);
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
 * Strict Dynamic Rules:
 * 1. GREEN (Completed/Served): A valid collection entry exists for this customer on TODAY'S date in PKT.
 * 2. RED (Pending): No valid collection entry exists for this customer on TODAY'S date in PKT.
 * 3. Never permanently saved on customer. Derived 100% dynamically from active collections.
 *    If today's record is deleted, it IMMEDIATELY turns back to RED.
 */
export function getCustomerDailyStatus(
  customer: MinimalCustomerRecord,
  collections: MinimalCollectionRecord[] = [],
  referenceDate: Date = new Date()
): CustomerDailyStatus {
  const todayStr = getPKTDateString(referenceDate);

  // 1. Filter valid non-cancelled collections for this customer
  const relevantCols = collections.filter(c => {
    if (!c || c.customer_id !== customer.id) return false;
    const s = String(c.status || '').toLowerCase();
    return s !== 'cancelled' && s !== 'draft' && s !== 'deleted';
  });

  // 2. Sort collections by timestamp descending (newest first)
  const sortedCols = [...relevantCols].sort((a, b) => {
    return parseColTimestamp(b) - parseColTimestamp(a);
  });

  // 3. Filter valid collections for TODAY in Pakistan Standard Time (PKT)
  const todayCols = relevantCols.filter(col => {
    const cDate = getCollectionPKTDate(col);
    return cDate === todayStr;
  });

  // Dynamic Rule: Completed ONLY if at least one valid collection exists for TODAY in PKT!
  const hasTodayRecord = todayCols.length > 0;
  const isCompleted = hasTodayRecord;

  // Newest collection overall
  let latestTimestamp: Date | null = null;
  let latestDateStr: string | null = null;
  let latestReceiptNo: string | null = null;

  if (sortedCols.length > 0) {
    const newestCol = sortedCols[0];
    latestTimestamp = parseColDate(newestCol);
    latestDateStr = getCollectionPKTDate(newestCol);
    latestReceiptNo = newestCol.receipt_no || null;
  }

  let formattedTime: string | null = null;
  let hoursAgo: number | null = null;

  // If completed today, formattedTime shows today's collection time
  if (isCompleted && todayCols.length > 0) {
    const sortedToday = [...todayCols].sort((a, b) => parseColTimestamp(b) - parseColTimestamp(a));
    const latestTodayCol = sortedToday[0];
    const tDate = parseColDate(latestTodayCol);
    if (tDate) {
      formattedTime = formatFriendlyTime(tDate);
    } else if (latestTodayCol.collection_time) {
      formattedTime = latestTodayCol.collection_time.substring(0, 5);
    }
  } else if (latestTimestamp) {
    formattedTime = formatFriendlyDateTime(latestTimestamp, referenceDate);
  }

  if (latestTimestamp) {
    const diffMs = referenceDate.getTime() - latestTimestamp.getTime();
    if (diffMs >= 0) {
      hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
    }
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
  }

  let summaryText = '';
  if (isCompleted) {
    summaryText = `آج کا ریکارڈ مکمل ہے (${formattedTime || 'Completed'})`;
  } else {
    summaryText = latestTimestamp
      ? `آج بقایہ ہے (آخری اینٹری: ${formattedTime})`
      : 'آج کا ریکارڈ بقایہ ہے (Pending)';
  }

  return {
    customerId: customer.id,
    isCompleted,
    status: isCompleted ? 'completed' : 'pending',
    labelUrdu: isCompleted ? 'مکمل' : 'بقایہ',
    labelEn: isCompleted ? 'Completed (Served)' : 'Pending',
    badgeColor: isCompleted ? 'green' : 'red',
    lastCompletedAt: latestTimestamp,
    lastCompletedDateStr: latestDateStr,
    lastReceiptNo: latestReceiptNo,
    hoursAgo,
    isTodayServed: isCompleted,
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
