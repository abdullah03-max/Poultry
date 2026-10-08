// =============================================================================
// SHAN POULTRY PROTEIN - Fast Weight Entry / New Collection Modal
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Customer, WeightCategory, Collection } from '../../types/database';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import { Scale, Check, AlertCircle, Loader2 } from 'lucide-react';

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (collection: Collection) => void;
  initialCustomerId?: string;
  initialDate?: string;
}

export const NewCollectionModal: React.FC<NewCollectionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialCustomerId,
  initialDate,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>('');
  const [collectionTime, setCollectionTime] = useState<string>('');

  const [charbiGross, setCharbiGross] = useState<string>('');
  const [charbiTare, setCharbiTare] = useState<string>('0');
  const [charbiRate, setCharbiRate] = useState<string>('55');

  const [kacharaGross, setKacharaGross] = useState<string>('');
  const [kacharaTare, setKacharaTare] = useState<string>('0');
  const [kacharaRate, setKacharaRate] = useState<string>('45');

  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    try {
      setLoadingInitial(true);
      setErrorMsg(null);
      const [custList, catList] = await Promise.all([
        api.getCustomers(),
        api.getWeightCategories(),
      ]);

      setCustomers(custList);
      setCategories(catList);

      const today = new Date();
      const defaultDate = initialDate || today.toISOString().split('T')[0];
      const defaultTime = today.toTimeString().split(' ')[0].substring(0, 5);

      setCollectionDate(defaultDate);
      setCollectionTime(defaultTime);

      const targetId = initialCustomerId || (custList.length > 0 ? custList[0].id : '');
      setSelectedCustomerId(targetId);
      const targetCust = custList.find(c => c.id === targetId);
      if (targetCust) {
        setCharbiRate((targetCust.rate_charbi || 55).toString());
        setKacharaRate((targetCust.rate_kachara || targetCust.rate_per_kg || 45).toString());
      }
      setCharbiGross('');
      setCharbiTare('0');
      setKacharaGross('');
      setKacharaTare('0');
      setNotes('');
    } catch (err) {
      console.error('Failed to load form data:', err);
      setErrorMsg('Failed to load customers or weight categories.');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setCharbiRate((cust.rate_charbi || 55).toString());
      setKacharaRate((cust.rate_kachara || cust.rate_per_kg || 45).toString());
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Compute calculated weights (Charbi & Kachara)
  const cGross = parseFloat(charbiGross) || 0;
  const cTare = parseFloat(charbiTare) || 0;
  const cRate = parseFloat(charbiRate) || 0;
  const cNet = Math.max(0, cGross - cTare);
  const cTotal = Math.round(cNet * cRate);

  const kGross = parseFloat(kacharaGross) || 0;
  const kTare = parseFloat(kacharaTare) || 0;
  const kRate = parseFloat(kacharaRate) || 0;
  const kNet = Math.max(0, kGross - kTare);
  const kTotal = Math.round(kNet * kRate);

  const totalGrossWeight = cGross + kGross;
  const totalTareWeight = cTare + kTare;
  const effectiveNetWeight = cNet + kNet;
  const totalAmount = cTotal + kTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer.');
      return;
    }

    if (effectiveNetWeight <= 0) {
      setErrorMsg('Please enter a valid weight greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Generate a valid RFC4122 UUID v4 for PostgreSQL client_uuid column
      const clientUuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      // Find category UUIDs dynamically from loaded categories
      const charbiCat = categories.find(c => c.code === 'charbi' || c.code === 'fat');
      const kacharaCat = categories.find(c => c.code === 'kachara' || c.code === 'waste');

      // Build category item entries with valid UUID category_id
      const items = [
        ...(cNet > 0 && charbiCat ? [{
          category_id: charbiCat.id,
          weight: cNet,
          rate: cRate,
          amount: cTotal,
        }] : []),
        ...(kNet > 0 && kacharaCat ? [{
          category_id: kacharaCat.id,
          weight: kNet,
          rate: kRate,
          amount: kTotal,
        }] : []),
      ];

      const newSlip = await api.createCollection(
        {
          customer_id: selectedCustomerId,
          worker_id: null,
          collection_date: collectionDate,
          collection_time: `${collectionTime}:00`,
          gross_weight: totalGrossWeight > 0 ? totalGrossWeight : effectiveNetWeight,
          tare_weight: totalTareWeight,
          total_net_weight: effectiveNetWeight,
          rate_per_kg: kRate || cRate || 45,
          total_amount: totalAmount,
          notes: notes.trim() || null,
          client_uuid: clientUuid,
          charbi_gross: cGross,
          charbi_tare: cTare,
          charbi_net: cNet,
          charbi_rate: cRate,
          charbi_total: cTotal,
          kachara_gross: kGross,
          kachara_tare: kTare,
          kachara_net: kNet,
          kachara_rate: kRate,
          kachara_total: kTotal,
        },
        items
      );

      onCreated(newSlip);
      onClose();
    } catch (err: any) {
      console.error('Error creating collection:', err);
      setErrorMsg(err.message || 'Failed to save collection slip. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Collection Slip"
      subtitle="Record poultry waste weight for shop/customer"
      maxWidth="lg"
    >
      {loadingInitial ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          <p className="text-xs font-medium text-slate-500">Loading customer directory...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Customer / Shop *
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => handleCustomerSelect(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} — {c.name} ({c.area}) - چربی: Rs. {c.rate_charbi || 55} | کچرا: Rs. {c.rate_kachara || c.rate_per_kg || 45}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Collection Date *
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Collection Time *
              </label>
              <input
                type="time"
                value={collectionTime}
                onChange={e => setCollectionTime(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
              />
            </div>
          </div>

          {/* Charbi Weight Card */}
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-600" /> چربی وزن (Charbi Weight)
              </span>
              <span className="text-xs font-bold text-emerald-800 font-mono">
                خالص: {cNet.toFixed(1)} KG | رقم: Rs. {cTotal.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gross (کل وزن KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={charbiGross}
                  onChange={e => setCharbiGross(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tare (تار / برتن KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={charbiTare}
                  onChange={e => setCharbiTare(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate (ریٹ PKR/KG)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="55"
                  value={charbiRate}
                  onChange={e => setCharbiRate(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Kachara Weight Card */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-600" /> کچرا وزن (Kachara Weight)
              </span>
              <span className="text-xs font-bold text-amber-800 font-mono">
                خالص: {kNet.toFixed(1)} KG | رقم: Rs. {kTotal.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gross (کل وزن KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={kacharaGross}
                  onChange={e => setKacharaGross(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tare (تار / برتن KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={kacharaTare}
                  onChange={e => setKacharaTare(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate (ریٹ PKR/KG)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="45"
                  value={kacharaRate}
                  onChange={e => setKacharaRate(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Auto Computed Totals Badge */}
          <div className="p-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl shadow-xs flex items-center justify-between font-mono">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">TOTAL NET WEIGHT (کل خالص وزن)</p>
              <p className="text-xl font-black text-blue-700 mt-0.5">{effectiveNetWeight.toFixed(1)} KG</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500">TOTAL BILL (کل رقم)</p>
              <p className="text-xl font-black text-amber-700 mt-0.5">Rs. {totalAmount.toLocaleString()}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Quality inspection, morning pickup"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || effectiveNetWeight <= 0}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Slip...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Collection Slip</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
