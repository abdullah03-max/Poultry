// =============================================================================
// SHAN POULTRY PROTEIN - Customer Daily Record Completion Status Engine
// Manages 24-hour rolling completion window, daily reset, and database persistence
// =============================================================================

export interface CustomerDailyStatus {
  customerId: string;
  isCompleted: boolean; // true = Green (completed/served), false = Red (pending)
  status: 'completed' | 'pending';
  labelUrdu: string; // 'مکمل' or 'بقایہ'
  labelEn: string; // 'Completed' or 'Pending'
  badgeColor: 'green' | 'red';
  lastCompletedAt: Date | null;
  lastCompletedDateStr: string | null;
  lastReceiptNo: string | null;
  hoursAgo: number | null;
  isWithin24Hours: boolean;
  isTodayServed: boolean;
  formattedTime: string | null;
  summaryText: string;
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
  [key: string]: any;
}

export interface MinimalCustomerRecord {
  id: string;
  category_rates?: Record<string, any>;
  [key: string]: any;
}

/**
 * Returns current date string in local YYYY-MM-DD format
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
 * Computes the Daily Completion Status for a single customer.
 * 
 * Rules:
 * 1. GREEN (Completed): If record completed for today OR completed within last 24 hours.
 * 2. RED (Pending): If no record exists for today and last record was > 24 hours ago (or never).
 * 3. Daily Reset: Automatically flips back to RED once 24h expires without today's record.
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

  // 2. Find latest collection timestamp and receipt
  let latestTimestamp: Date | null = null;
  let latestDateStr: string | null = null;
  let latestReceiptNo: string | null = null;
  let hasTodayRecord = false;

  for (const col of relevantCols) {
    let colDate: Date | null = null;
    if (col.collection_timestamp) {
      const parsed = new Date(col.collection_timestamp);
      if (!isNaN(parsed.getTime())) colDate = parsed;
    }
    if (!colDate && col.created_at) {
      const parsed = new Date(col.created_at);
      if (!isNaN(parsed.getTime())) colDate = parsed;
    }
    if (!colDate && col.collection_date) {
      const tStr = col.collection_time ? col.collection_time.slice(0, 8) : '12:00:00';
      const parsed = new Date(`${col.collection_date}T${tStr}`);
      if (!isNaN(parsed.getTime())) colDate = parsed;
    }

    if (colDate) {
      if (!latestTimestamp || colDate.getTime() > latestTimestamp.getTime()) {
        latestTimestamp = colDate;
        latestDateStr = col.collection_date || getLocalDateString(colDate);
        latestReceiptNo = col.receipt_no || null;
      }
    }

    // Check if recorded for today
    if (col.collection_date === todayStr) {
      hasTodayRecord = true;
    } else if (colDate && getLocalDateString(colDate) === todayStr) {
      hasTodayRecord = true;
    }
  }

  // 3. Also check database-persisted daily_record_status on customer record
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

  // 4. Calculate 24-hour window
  let isWithin24Hours = false;
  let hoursAgo: number | null = null;
  let formattedTime: string | null = null;

  if (latestTimestamp) {
    const diffMs = referenceDate.getTime() - latestTimestamp.getTime();
    if (diffMs >= 0) {
      hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
      isWithin24Hours = diffMs < 24 * 60 * 60 * 1000;
    }

    const timeStr = formatFriendlyTime(latestTimestamp);
    const dateStr = getLocalDateString(latestTimestamp);
    if (dateStr === todayStr) {
      formattedTime = `آج ${timeStr}`;
    } else {
      formattedTime = `کل ${timeStr}`;
    }
  }

  // 5. Final completion decision
  const isCompleted = hasTodayRecord || isWithin24Hours;

  let summaryText = '';
  if (isCompleted) {
    if (hasTodayRecord) {
      summaryText = `آج کا ریکارڈ مکمل ہے (${formattedTime || 'Served'})`;
    } else {
      summaryText = `گزشتہ 24 گھنٹوں میں مکمل (${hoursAgo ?? 0} گھنٹے قبل)`;
    }
  } else {
    summaryText = 'آج کا ریکارڈ بقایہ ہے (Pending Record)';
  }

  return {
    customerId: customer.id,
    isCompleted,
    status: isCompleted ? 'completed' : 'pending',
    labelUrdu: isCompleted ? 'مکمل' : 'بقایہ',
    labelEn: isCompleted ? 'Completed' : 'Pending',
    badgeColor: isCompleted ? 'green' : 'red',
    lastCompletedAt: latestTimestamp,
    lastCompletedDateStr: latestDateStr,
    lastReceiptNo: latestReceiptNo,
    hoursAgo,
    isWithin24Hours,
    isTodayServed: hasTodayRecord,
    formattedTime,
    summaryText,
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
