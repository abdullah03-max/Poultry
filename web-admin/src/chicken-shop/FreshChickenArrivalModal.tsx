// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Fresh Chicken Stock Arrival Modal
// Record live/fresh broiler arrivals with KG, Purchase Rate, and Selling Rate
// =============================================================================

import React, { useState, useEffect } from 'react';
import { chickenShopApi } from './api';
import { X, CheckCircle2, Loader2, Sparkles, Scale, DollarSign, Truck } from 'lucide-react';

interface FreshChickenArrivalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSellingRate?: number;
}

export const FreshChickenArrivalModal: React.FC<FreshChickenArrivalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentSellingRate = 440,
}) => {
  const [weightKg, setWeightKg] = useState<string>('');
  const [purchaseRate, setPurchaseRate] = useState<string>('380');
  const [totalCost, setTotalCost] = useState<string>('');
  const [sellingRate, setSellingRate] = useState<string>(String(currentSellingRate || 440));
  const [birdsCount, setBirdsCount] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setWeightKg('');
      setPurchaseRate('380');
      setTotalCost('');
      setSellingRate(String(currentSellingRate || 440));
      setBirdsCount('');
      setSupplierName('');
      setVehicleNo('');
      setDateStr(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, currentSellingRate]);

  // Auto-calculate total cost when weight or purchase rate changes
  const handleWeightChange = (val: string) => {
    setWeightKg(val);
    const w = Number(val) || 0;
    const r = Number(purchaseRate) || 0;
    if (w > 0 && r > 0) {
      setTotalCost(String(Math.round(w * r)));
    } else {
      setTotalCost('');
    }
  };

  const handlePurchaseRateChange = (val: string) => {
    setPurchaseRate(val);
    const w = Number(weightKg) || 0;
    const r = Number(val) || 0;
    if (w > 0 && r > 0) {
      setTotalCost(String(Math.round(w * r)));
    } else {
      setTotalCost('');
    }
  };

  if (!isOpen) return null;

  const wNum = Number(weightKg) || 0;
  const pRateNum = Number(purchaseRate) || 0;
  const sRateNum = Number(sellingRate) || 0;
  const costNum = Number(totalCost) || Math.round(wNum * pRateNum);
  const projectedRevenue = Math.round(wNum * sRateNum);
  const projectedMargin = projectedRevenue - costNum;
  const marginPerKg = sRateNum - pRateNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wNum <= 0) {
      alert('براہ کرم چکن کا درست وزن (KG) درج کریں');
      return;
    }
    if (pRateNum <= 0) {
      alert('براہ کرم خرید ریٹ فی کلو درج کریں');
      return;
    }
    if (sRateNum <= 0) {
      alert('براہ کرم فروخت ریٹ فی کلو درج کریں');
      return;
    }

    try {
      setSaving(true);
      const now = new Date();
      await chickenShopApi.saveFreshChickenArrival({
        date: dateStr,
        time: now.toTimeString().split(' ')[0],
        weight_kg: Number(wNum.toFixed(2)),
        rate_per_kg: pRateNum,
        total_cost: costNum,
        selling_rate_per_kg: sRateNum,
        supplier_name: supplierName.trim() || 'فارم سپلائی',
        birds_count: birdsCount ? Number(birdsCount) : null,
        vehicle_no: vehicleNo.trim() || null,
        notes: notes.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`تازہ چکن اسٹاک محفوظ کرنے میں مسئلہ: ${err.message || 'Error saving fresh chicken stock'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-xs">
              🐔
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight font-urdu">
                نیا تازہ چکن اسٹاک آمد (Fresh Chicken Arrival)
              </h3>
              <p className="text-xs text-amber-100 font-urdu mt-0.5">
                فارم / گاڑی سے موصول شدہ تازہ مرغی کا وزن اور قیمت کا اندراج
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Live Valuation Box */}
          {wNum > 0 && pRateNum > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-900 font-urdu">کل خرید لاگت (Total Purchase Cost):</span>
                <span className="font-mono text-sm text-amber-900 font-black">
                  Rs. {costNum.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-urdu font-bold">متوقع کل فروخت رقم:</span>
                <span className="font-mono text-sm text-emerald-800 font-black">
                  Rs. {projectedRevenue.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 font-urdu">متوقع منافع (مارجن):</span>
                <span className={`font-mono font-black ${projectedMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Rs. {projectedMargin.toLocaleString()} ({marginPerKg >= 0 ? `+Rs.${marginPerKg}` : `-Rs.${Math.abs(marginPerKg)}`}/KG)
                </span>
              </div>
            </div>
          )}

          {/* Weight & Purchase Rate (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                کل وزن (Weight in KG) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  required
                  value={weightKg}
                  onChange={e => handleWeightChange(e.target.value)}
                  placeholder="مثال: 150.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-9 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  KG
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                خرید ریٹ فی کلو (Purchase Rate/KG) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={purchaseRate}
                  onChange={e => handlePurchaseRateChange(e.target.value)}
                  placeholder="مثال: 380"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-12 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  PKR
                </span>
              </div>
            </div>
          </div>

          {/* Total Cost & Selling Rate (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                کل خرید لاگت (Total Purchase Cost) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={totalCost}
                  onChange={e => setTotalCost(e.target.value)}
                  placeholder="خودکار حساب"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-12 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  PKR
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">خودکار حساب: وزن × خرید ریٹ</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                مقررہ فروخت ریٹ (Selling Rate/KG) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={sellingRate}
                  onChange={e => setSellingRate(e.target.value)}
                  placeholder="مثال: 440"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-12 py-2.5 text-sm font-mono font-bold text-amber-700 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  PKR
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">گاہکوں کو اس ریٹ پر فروخت ہوگا</p>
            </div>
          </div>

          {/* Farm/Supplier & Vehicle (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                فارم / سپلائر کا نام (Supplier / Farm)
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                placeholder="مثال: پنجاب پولٹری فارم"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                گاڑی نمبر / ڈرائیور (Vehicle / Driver)
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
                placeholder="مثال: LEA-9024"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Birds Count & Date (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                مرغیوں کی تعداد (Birds Count - اختیاری)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={birdsCount}
                onChange={e => setBirdsCount(e.target.value)}
                placeholder="مثال: 65 مرغیاں"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                تاریخ آمد (Arrival Date) *
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
              اضافی تفصیل یا نوٹس (Notes / Remarks)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: صبح 8 بجے آمد، بہترین کوالٹی چکن"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              منسوخ کریں (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition active:scale-95 disabled:opacity-50 font-urdu"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>محفوظ ہو رہا ہے...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اسٹاک محفوظ کریں (Save Fresh Chicken)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
