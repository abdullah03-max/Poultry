// =============================================================================
// SHAN POULTRY PROTEIN - Customer Advance & Waste Deduction Ledger Utils
// =============================================================================

import { Customer, Collection, CustomerAdvanceRecord } from '../types/database';

export interface CustomerAdvanceBalance {
  customerId: string;
  customerName: string;
  totalAdvance: number;
  totalWasteWeight: number;
  totalWasteAmount: number;
  remainingAdvance: number;
  isExhausted: boolean;
  status: 'ACTIVE' | 'EXHAUSTED' | 'NO_ADVANCE';
}

export interface AdvanceLedgerEntry {
  id: string;
  date: string;
  type: 'ADVANCE_GIVEN' | 'WASTE_COLLECTED';
  title: string;
  description: string;
  weightKg?: number;
  amount: number;
  credit?: number; // Advance added (+)
  debit?: number;  // Waste deducted (-)
  runningBalance: number;
}

/**
 * Calculates real-time Advance Balance for a customer by subtracting
 * day-by-day collected waste amounts from total advance given.
 */
export function calculateCustomerAdvanceBalance(
  customer: Customer,
  collections: Collection[] = [],
  advanceRecords: CustomerAdvanceRecord[] = []
): CustomerAdvanceBalance {
  const custAdvances = advanceRecords.filter(r => r.customer_id === customer.id);
  const totalFromRecords = custAdvances.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const baseAdvance = Number(customer.advance_amount || 0);

  // Total advance given is either from records or base customer field (or sum if records added)
  const totalAdvance = Math.max(baseAdvance, totalFromRecords);

  const custCollections = collections.filter(
    c => c.customer_id === customer.id && c.status !== 'cancelled'
  );

  const totalWasteAmount = custCollections.reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);
  const totalWasteWeight = custCollections.reduce((acc, c) => acc + (Number(c.total_net_weight) || 0), 0);

  const remainingAdvance = totalAdvance - totalWasteAmount;
  const hasAdvance = totalAdvance > 0;
  const isExhausted = hasAdvance && remainingAdvance <= 0;

  let status: 'ACTIVE' | 'EXHAUSTED' | 'NO_ADVANCE' = 'NO_ADVANCE';
  if (hasAdvance) {
    status = remainingAdvance > 0 ? 'ACTIVE' : 'EXHAUSTED';
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    totalAdvance,
    totalWasteWeight: Number(totalWasteWeight.toFixed(2)),
    totalWasteAmount: Number(totalWasteAmount.toFixed(2)),
    remainingAdvance: Number(remainingAdvance.toFixed(2)),
    isExhausted,
    status,
  };
}

/**
 * Returns all active customers whose advance has ended (remaining <= 0).
 */
export function getExhaustedAdvanceCustomers(
  customers: Customer[],
  collections: Collection[] = [],
  advanceRecords: CustomerAdvanceRecord[] = []
): CustomerAdvanceBalance[] {
  return customers
    .filter(c => c.status === 'active' && !c.is_deleted)
    .map(c => calculateCustomerAdvanceBalance(c, collections, advanceRecords))
    .filter(bal => bal.isExhausted);
}

/**
 * Generates a chronological ledger of advances given and waste collections deducted.
 */
export function getCustomerAdvanceLedger(
  customer: Customer,
  collections: Collection[] = [],
  advanceRecords: CustomerAdvanceRecord[] = []
): AdvanceLedgerEntry[] {
  const custAdvances = advanceRecords.filter(r => r.customer_id === customer.id);
  const baseAdvance = Number(customer.advance_amount || 0);

  const entries: Omit<AdvanceLedgerEntry, 'runningBalance'>[] = [];

  // If customer has base advance but not yet in records, add it
  if (baseAdvance > 0 && custAdvances.length === 0) {
    entries.push({
      id: `base-adv-${customer.id}`,
      date: customer.advance_date || customer.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      type: 'ADVANCE_GIVEN',
      title: 'ابتدائی ایڈوانس ادائیگی (Initial Advance Given)',
      description: customer.advance_notes || 'Initial advance given to customer',
      amount: baseAdvance,
      credit: baseAdvance,
    });
  } else {
    custAdvances.forEach(adv => {
      entries.push({
        id: adv.id,
        date: adv.date || adv.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        type: 'ADVANCE_GIVEN',
        title: 'ایڈوانس رقم ادائیگی (Advance Given)',
        description: adv.notes || `Paid via ${adv.payment_method}`,
        amount: Number(adv.amount) || 0,
        credit: Number(adv.amount) || 0,
      });
    });
  }

  // Add daily waste collections
  const custCollections = collections.filter(
    c => c.customer_id === customer.id && c.status !== 'cancelled'
  );

  custCollections.forEach(col => {
    const cNet = Number(col.charbi_net || 0);
    const kNet = Number(col.kachara_net || (cNet === 0 ? col.total_net_weight : 0));
    let desc = `وصولی وزن: ${col.total_net_weight} KG`;
    if (cNet > 0 || kNet > 0) {
      desc = `چربی: ${cNet} KG, کچرا: ${kNet} KG`;
    }

    entries.push({
      id: col.id,
      date: col.collection_date || col.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      type: 'WASTE_COLLECTED',
      title: `روزانہ ویسٹ وصولی (Slip #${col.receipt_no || col.id.slice(-4)})`,
      description: desc,
      weightKg: col.total_net_weight,
      amount: Number(col.total_amount) || 0,
      debit: Number(col.total_amount) || 0,
    });
  });

  // Sort ascending by date
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let currentBalance = 0;
  const ledger: AdvanceLedgerEntry[] = entries.map(e => {
    if (e.type === 'ADVANCE_GIVEN') {
      currentBalance += e.amount;
    } else {
      currentBalance -= e.amount;
    }
    return {
      ...e,
      runningBalance: Number(currentBalance.toFixed(2)),
    };
  });

  return ledger;
}
