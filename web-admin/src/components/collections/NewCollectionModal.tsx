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
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [tareWeight, setTareWeight] = useState<string>('0');
  const [categoryWeights, setCategoryWeights] = useState<Record<string, string>>({});
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

      if (initialCustomerId) {
        setSelectedCustomerId(initialCustomerId);
      } else if (custList.length > 0) {
        setSelectedCustomerId(custList[0].id);
      }

      // Initialize category weights
      const initialCatWeights: Record<string, string> = {};
      catList.forEach(c => {
        initialCatWeights[c.id] = '';
      });
      setCategoryWeights(initialCatWeights);
      setGrossWeight('');
      setTareWeight('0');
      setNotes('');
    } catch (err) {
      console.error('Failed to load form data:', err);
      setErrorMsg('Failed to load customers or weight categories.');
    } finally {
      setLoadingInitial(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Compute calculated weights
  const grossNum = parseFloat(grossWeight) || 0;
  const tareNum = parseFloat(tareWeight) || 0;
  const calculatedNetWeight = Math.max(0, grossNum - tareNum);

  // Sum of category weights
  const sumCategoryWeights = Object.values(categoryWeights).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );

  // If user entered category weights directly without gross/tare, suggest auto-filling gross
  const effectiveNetWeight = calculatedNetWeight > 0 ? calculatedNetWeight : sumCategoryWeights;
  const ratePerKg = selectedCustomer?.rate_per_kg || 0;
  const totalAmount = Number((effectiveNetWeight * ratePerKg).toFixed(2));

  const handleCategoryWeightChange = (catId: string, val: string) => {
    setCategoryWeights(prev => ({ ...prev, [catId]: val }));
  };

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

      // Build category item entries
      const items = Object.entries(categoryWeights)
        .filter(([_, w]) => parseFloat(w) > 0)
        .map(([catId, w]) => {
          const weightNum = parseFloat(w);
          return {
            category_id: catId,
            weight: weightNum,
            rate: ratePerKg,
            amount: Number((weightNum * ratePerKg).toFixed(2)),
          };
        });

      const newSlip = await api.createCollection(
        {
          customer_id: selectedCustomerId,
          collection_date: collectionDate,
          collection_time: `${collectionTime}:00`,
          gross_weight: grossNum > 0 ? grossNum : effectiveNetWeight,
          tare_weight: tareNum,
          total_net_weight: effectiveNetWeight,
          rate_per_kg: ratePerKg,
          total_amount: totalAmount,
          notes: notes.trim() || null,
          client_uuid: `web-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
        items
      );

      onCreated(newSlip);
      onClose();
    } catch (err: any) {
      console.error('Error creating collection:', err);
      setErrorMsg(err.message || 'Failed to save collection slip. Please try again.');
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
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <p className="text-xs">Loading customer directory...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Customer / Shop *
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} — {c.name} ({c.area}) - Rate: {c.rate_per_kg} PKR/KG
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Collection Date *
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Collection Time *
              </label>
              <input
                type="time"
                value={collectionTime}
                onChange={e => setCollectionTime(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Dynamic Weight Categories Input */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Weight Categories (KG)
            </span>

            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <div key={cat.id}>
                  <label className="block text-xs font-medium text-slate-300 mb-1 truncate">
                    {cat.name}
                    {cat.urdu_name && <span className="text-[10px] text-slate-500 ml-1 font-urdu">({cat.urdu_name})</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={categoryWeights[cat.id] || ''}
                    onChange={e => handleCategoryWeightChange(cat.id, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>

            {/* Gross / Tare Alternative */}
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Scale Gross Weight</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Optional Gross"
                  value={grossWeight}
                  onChange={e => setGrossWeight(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Crate Tare Weight</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={tareWeight}
                  onChange={e => setTareWeight(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Auto Computed Totals Badge */}
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Net Weight</p>
              <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">{formatWeight(effectiveNetWeight)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Amount ({ratePerKg} PKR/KG)</p>
              <p className="text-xl font-black text-amber-400 font-mono mt-0.5">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Clean quality, special crate pickup"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || effectiveNetWeight <= 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
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
