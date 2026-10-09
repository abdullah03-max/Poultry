// =============================================================================
// SHAN POULTRY PROTEIN - Edit Collection Slip Modal
// Allows Admin to modify Charbi and Kachara weights, rates, customer, date/time, status
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

  // Charbi
  const [charbiGross, setCharbiGross] = useState<string>('');
  const [charbiTare, setCharbiTare] = useState<string>('0');
  const [charbiRate, setCharbiRate] = useState<string>('55');

  // Kachara
  const [kacharaGross, setKacharaGross] = useState<string>('');
  const [kacharaTare, setKacharaTare] = useState<string>('0');
  const [kacharaRate, setKacharaRate] = useState<string>('45');

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

      const isLegacy = collection.charbi_net == null && collection.kachara_net == null;

      const cGross = collection.charbi_gross != null ? collection.charbi_gross : 0;
      const cTare = collection.charbi_tare != null ? collection.charbi_tare : 0;
      const cRate = collection.charbi_rate != null ? collection.charbi_rate : 55;

      const kGross = collection.kachara_gross != null ? collection.kachara_gross : (isLegacy ? collection.gross_weight : 0);
      const kTare = collection.kachara_tare != null ? collection.kachara_tare : (isLegacy ? collection.tare_weight : 0);
      const kRate = collection.kachara_rate != null ? collection.kachara_rate : (isLegacy ? collection.rate_per_kg : 45);

      setCharbiGross(cGross ? cGross.toString() : '');
      setCharbiTare(cTare ? cTare.toString() : '0');
      setCharbiRate(cRate.toString());

      setKacharaGross(kGross ? kGross.toString() : '');
      setKacharaTare(kTare ? kTare.toString() : '0');
      setKacharaRate(kRate.toString());

      setNotes(collection.notes || '');
      setStatus((collection.status as any) || 'submitted');
    } catch (err: any) {
      setErrorMsg('Failed to load collection data.');
    } finally {
      setLoadingInitial(false);
    }
  };

  // Auto-fill customer agreed rates when changing customer
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setCharbiRate((cust.rate_charbi || 55).toString());
      setKacharaRate((cust.rate_kachara || cust.rate_per_kg || 45).toString());
    }
  };

  // Calculations
  const cG = parseFloat(charbiGross) || 0;
  const cT = parseFloat(charbiTare) || 0;
  const cR = parseFloat(charbiRate) || 0;
  const cNet = Math.max(0, Number((cG - cT).toFixed(2)));
  const cTotal = Math.round(cNet * cR);

  const kG = parseFloat(kacharaGross) || 0;
  const kT = parseFloat(kacharaTare) || 0;
  const kR = parseFloat(kacharaRate) || 0;
  const kNet = Math.max(0, Number((kG - kT).toFixed(2)));
  const kTotal = Math.round(kNet * kR);

  const totalGross = Number((cG + kG).toFixed(2));
  const totalTare = Number((cT + kT).toFixed(2));
  const totalNet = Number((cNet + kNet).toFixed(2));
  const totalAmount = cTotal + kTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection) return;

    if (!customerId) {
      setErrorMsg('Please select a customer.');
      return;
    }
    if (totalNet <= 0) {
      setErrorMsg('Total net weight must be greater than 0 KG.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await api.updateCollection(collection.id, {
        customer_id: customerId,
        collection_date: collectionDate,
        collection_time: collectionTime,
        gross_weight: totalGross > 0 ? totalGross : totalNet,
        tare_weight: totalTare,
        total_net_weight: totalNet,
        rate_per_kg: kR || cR || 45,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        status,
        charbi_gross: cG,
        charbi_tare: cT,
        charbi_net: cNet,
        charbi_rate: cR,
        charbi_total: cTotal,
        kachara_gross: kG,
        kachara_tare: kT,
        kachara_net: kNet,
        kachara_rate: kR,
        kachara_total: kTotal,
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
      subtitle="Modify Charbi & Kachara measurements, rates, date, and status"
      maxWidth="2xl"
    >
      {loadingInitial ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
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
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-600"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.customer_code} — {c.name} ({c.area}) [Charbi: Rs. {c.rate_charbi || 55} | Kachara: Rs. {c.rate_kachara || c.rate_per_kg || 45}]
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
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-600 font-semibold"
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
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-600 font-mono"
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
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-600 font-mono"
              />
            </div>
          </div>

          {/* 1. Charbi Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                چربی وزن (Charbi Weight)
              </span>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                Net: {cNet.toFixed(2)} KG | Subtotal: Rs. {cTotal.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gross (کل وزن)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={charbiGross}
                  onChange={e => setCharbiGross(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tare (تار / برتن)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={charbiTare}
                  onChange={e => setCharbiTare(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate / KG (Rs.)</label>
                <input
                  type="number"
                  step="any"
                  value={charbiRate}
                  onChange={e => setCharbiRate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* 2. Kachara Card */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                کچرا وزن (Kachara Weight)
              </span>
              <span className="text-xs font-bold text-amber-700 font-mono">
                Net: {kNet.toFixed(2)} KG | Subtotal: Rs. {kTotal.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gross (کل وزن)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={kacharaGross}
                  onChange={e => setKacharaGross(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tare (تار / برتن)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={kacharaTare}
                  onChange={e => setKacharaTare(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate / KG (Rs.)</label>
                <input
                  type="number"
                  step="any"
                  value={kacharaRate}
                  onChange={e => setKacharaRate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Live Calculation Summary Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Net Weight</span>
              <span className="text-lg font-black text-blue-700">{totalNet.toFixed(2)} KG</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Amount</span>
              <span className="text-lg font-black text-amber-700">Rs. {totalAmount.toLocaleString()}</span>
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
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-600"
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
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
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
