// =============================================================================
// SHAN POULTRY PROTEIN - Edit Collection Slip Modal
// Allows Admin to modify weights, rate, customer, date/time, and notes
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Customer, WeightCategory, Collection } from '../../types/database';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import { Scale, Check, AlertCircle, Loader2 } from 'lucide-react';

interface EditCollectionModalProps {
  isOpen: boolean;
  collection: Collection | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditCollectionModal: React.FC<EditCollectionModalProps> = ({
  isOpen,
  collection,
  onClose,
  onSaved,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Form State
  const [customerId, setCustomerId] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>('');
  const [collectionTime, setCollectionTime] = useState<string>('');
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [tareWeight, setTareWeight] = useState<string>('0');
  const [ratePerKg, setRatePerKg] = useState<string>('45');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<'submitted' | 'verified' | 'cancelled'>('submitted');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && collection) {
      loadFormData();
    }
  }, [isOpen, collection]);

  const loadFormData = async () => {
    if (!collection) return;
    try {
      setLoadingInitial(true);
      setErrorMsg(null);
      const [custList, catList] = await Promise.all([
        api.getCustomers(),
        api.getWeightCategories(),
      ]);

      setCustomers(custList);
      setCategories(catList);

      setCustomerId(collection.customer_id);
      setCollectionDate(collection.collection_date);
      setCollectionTime(collection.collection_time || '08:00:00');
      setGrossWeight(collection.gross_weight.toString());
      setTareWeight(collection.tare_weight.toString());
      setRatePerKg(collection.rate_per_kg.toString());
      setNotes(collection.notes || '');
      setStatus((collection.status as any) || 'submitted');
    } catch (err: any) {
      setErrorMsg('Failed to load collection data.');
    } finally {
      setLoadingInitial(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === customerId);

  // Auto-fill customer agreed rate when changing customer
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setRatePerKg(cust.rate_per_kg.toString());
    }
  };

  // Calculations
  const grossNum = parseFloat(grossWeight) || 0;
  const tareNum = parseFloat(tareWeight) || 0;
  const netWeight = Math.max(0, Number((grossNum - tareNum).toFixed(2)));
  const rateNum = parseFloat(ratePerKg) || 0;
  const totalAmount = Math.round(netWeight * rateNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection) return;

    if (!customerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    if (netWeight <= 0) {
      setErrorMsg('Net weight must be greater than 0 KG.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await api.updateCollection(collection.id, {
        customer_id: customerId,
        collection_date: collectionDate,
        collection_time: collectionTime,
        gross_weight: grossNum,
        tare_weight: tareNum,
        total_net_weight: netWeight,
        rate_per_kg: rateNum,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        status,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update collection slip.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!collection) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Collection Slip: ${collection.receipt_no}`}
      subtitle="Modify weight measurements, customer rate, date, and status"
      maxWidth="lg"
    >
      {loadingInitial ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Loading collection details...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Selection & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer / Poultry Shop *
              </label>
              <select
                required
                value={customerId}
                onChange={e => handleCustomerChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.customer_code} — {c.name} ({c.area}) [Rate: Rs. {c.rate_per_kg}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
              >
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Collection Date *
              </label>
              <input
                type="date"
                required
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Collection Time
              </label>
              <input
                type="time"
                value={collectionTime}
                onChange={e => setCollectionTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          {/* Weight & Billing Form */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>Weight & Rate Calculation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gross Weight (KG) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={grossWeight}
                  onChange={e => setGrossWeight(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tare / Crates Deduction (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={tareWeight}
                  onChange={e => setTareWeight(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rate per KG (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={ratePerKg}
                  onChange={e => setRatePerKg(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Live Calculation Summary Banner */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Calculated Net Weight</span>
                <span className="text-base font-black text-blue-600">{netWeight.toFixed(2)} KG</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Calculated Total Amount</span>
                <span className="text-base font-black text-amber-600">Rs. {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Remarks / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Crate deposit adjusted, weight verified with shop owner..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{submitting ? 'Updating Slip...' : 'Save Slip Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
