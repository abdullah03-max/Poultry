// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Bulk Walk-in Cash Sale Modal
// Mobile-Responsive, Streamlined Counter Sales for Chicken Shop
// Dedicated Fresh Chicken Box with Optional Expandable Other Cuts
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { ChickenProduct } from './types';
import { chickenShopApi, FRESH_CHICKEN_PRODUCT_ID } from './api';
import {
  X,
  ShoppingCart,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface BulkWalkinSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ChickenProduct[];
  onSaveSuccess: () => Promise<void>;
  defaultDate?: string;
}

interface ProductWalkinRow {
  productId: string;
  productName: string;
  urduName: string;
  category: string;
  weightKg: string;
  ratePerKg: string;
  isFreshChicken: boolean;
}

export const BulkWalkinSaleModal: React.FC<BulkWalkinSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  onSaveSuccess,
  defaultDate,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [saleDate, setSaleDate] = useState<string>(defaultDate || todayStr);
  const [rows, setRows] = useState<ProductWalkinRow[]>([]);
  const [showOtherCuts, setShowOtherCuts] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('کاؤنٹر واک ان خریداروں کی مجموعی نقد فروخت');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize rows with active products
  useEffect(() => {
    if (isOpen) {
      setSaleDate(defaultDate || todayStr);
      setErrorMsg(null);

      // Make sure Fresh Chicken product exists
      const activeProducts = products.filter(p => p.is_active);
      const hasFresh = activeProducts.some(
        p => p.id === FRESH_CHICKEN_PRODUCT_ID || p.name.toLowerCase().includes('fresh chicken')
      );

      const prodsToMap = hasFresh
        ? activeProducts
        : [
            {
              id: FRESH_CHICKEN_PRODUCT_ID,
              name: 'Fresh Chicken',
              urdu_name: 'تازہ مرغی (زندہ / ہول چکن)',
              category: 'Fresh Live Chicken',
              unit: 'KG',
              rate_per_kg: 450,
              is_active: true,
            } as ChickenProduct,
            ...activeProducts,
          ];

      const initialRows: ProductWalkinRow[] = prodsToMap.map(p => {
        const isFresh = Boolean(
          p.id === FRESH_CHICKEN_PRODUCT_ID ||
          p.name.toLowerCase().includes('fresh chicken') ||
          (p.urdu_name && p.urdu_name.includes('تازہ'))
        );

        return {
          productId: p.id,
          productName: p.name,
          urduName: p.urdu_name || p.name,
          category: p.category || (isFresh ? 'Fresh Live Chicken' : 'Chicken Cuts'),
          weightKg: '',
          ratePerKg: String(p.rate_per_kg || (isFresh ? 450 : 0)),
          isFreshChicken: isFresh,
        };
      });

      // Sort so fresh chicken is always first
      initialRows.sort((a, b) => (b.isFreshChicken ? 1 : 0) - (a.isFreshChicken ? 1 : 0));
      setRows(initialRows);
      setShowOtherCuts(false);
    }
  }, [isOpen, products, defaultDate, todayStr]);

  if (!isOpen) return null;

  const freshRowIndex = rows.findIndex(r => r.isFreshChicken);
  const freshRow = freshRowIndex !== -1 ? rows[freshRowIndex] : null;
  const otherRows = rows.map((r, i) => ({ ...r, originalIndex: i })).filter(r => !r.isFreshChicken);

  const handleWeightChange = (index: number, val: string) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], weightKg: val };
      return next;
    });
  };

  const handleRateChange = (index: number, val: string) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ratePerKg: val };
      return next;
    });
  };

  const handleQuickAddWeight = (index: number, addAmount: number) => {
    setRows(prev => {
      const next = [...prev];
      const cur = Number(next[index].weightKg) || 0;
      const updated = Number((cur + addAmount).toFixed(2));
      next[index] = { ...next[index], weightKg: String(updated) };
      return next;
    });
  };

  const handleClearWeight = (index: number) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], weightKg: '' };
      return next;
    });
  };

  // Calculations
  const freshProd = useMemo(() => {
    return products.find(
      p => p.id === FRESH_CHICKEN_PRODUCT_ID || p.category === 'Fresh Live Chicken' || (p.urdu_name && p.urdu_name.includes('تازہ'))
    );
  }, [products]);
  const availableFreshStock = freshProd ? (Number(freshProd.stock_kg) || 0) : 0;

  const activeItemsToSell = rows.filter(r => Number(r.weightKg) > 0);

  const totalWeightKg = Number(
    activeItemsToSell.reduce((sum, r) => sum + (Number(r.weightKg) || 0), 0).toFixed(2)
  );

  const totalRevenue = activeItemsToSell.reduce((sum, r) => {
    const w = Number(r.weightKg) || 0;
    const rate = Number(r.ratePerKg) || 0;
    return sum + Math.round(w * rate);
  }, 0);

  const avgRate = totalWeightKg > 0 ? Math.round(totalRevenue / totalWeightKg) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeItemsToSell.length === 0) {
      setErrorMsg('براہ کرم کم از کم ایک پروڈکٹ کا فروخت شدہ وزن درج کریں۔');
      return;
    }

    const currentFreshWeight = Number(freshRow?.weightKg) || 0;
    if (currentFreshWeight > availableFreshStock) {
      setErrorMsg(`⚠️ غلطی: واک ان تازہ چکن کا وزن (${currentFreshWeight} KG) موجودہ دستیاب اسٹاک (${availableFreshStock} KG) سے زیادہ ہے! آپ دستیاب اسٹاک سے زیادہ وزن فروخت نہیں کر سکتے۔`);
      return;
    }

    try {
      setSaving(true);

      const items = activeItemsToSell.map(r => ({
        product_id: r.productId,
        product_name: r.productName,
        urdu_name: r.urduName,
        weight_kg: Number(r.weightKg),
        rate_per_kg: Number(r.ratePerKg),
      }));

      await chickenShopApi.createSale({
        customer_id: null, // 100% walk-in cash sale
        customer_name: 'واک ان کاؤنٹر نقد فروخت (Daily Walk-in Total)',
        phone: null,
        items,
        payment_method: 'cash',
        received_amount: totalRevenue,
        discount: 0,
        notes: notes.trim() || 'واک ان کاؤنٹر نقد فروخت',
        sale_date: saleDate,
      });

      await onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('[BulkWalkin] Error saving:', err);
      setErrorMsg(err.message || 'سیل محفوظ کرنے میں خرابی پیش آگئی');
    } finally {
      setSaving(false);
    }
  };

  const freshWeight = Number(freshRow?.weightKg) || 0;
  const freshRate = Number(freshRow?.ratePerKg) || 0;
  const freshTotal = Math.round(freshWeight * freshRate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-right">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-xs shrink-0">
              🛒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-urdu tracking-tight">
                  کاؤنٹر واک ان نقد سیلز (مجموعی اندراج)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold font-urdu">
                  100% نقد کیش
                </span>
              </div>
              <p className="text-[11px] text-amber-100 mt-0.5 font-urdu">
                عام خریداروں کی دن بھر کی مجموعی نقد فروخت ایک ساتھ درج کریں
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date and Guidance Banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 font-urdu">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>ہدایت:</strong> کل بیچا گیا وزن اور ریٹ لکھیں۔ رقم نقد کیش میں جمع ہو جائے گی۔
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] text-slate-500 font-urdu">تاریخ:</span>
            <input
              type="date"
              max={todayStr}
              value={saleDate}
              onChange={e => setSaleDate(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
            />
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-urdu">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* =============================================================== */}
          {/* 1. DEDICATED PROMINENT FRESH CHICKEN HERO BOX                   */}
          {/* =============================================================== */}
          {freshRow && (
            <div className="bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-100/50 rounded-3xl p-4 sm:p-5 border-2 border-amber-400 shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🐔</span>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-amber-950 font-urdu">
                      تازہ مرغی نقد سیل (Live Fresh Chicken)
                    </h4>
                    <p className="text-[11px] text-slate-600 font-urdu">
                      کاؤنٹر پر عام واک ان گاہکوں کو فروخت کی گئی تازہ مرغی کا مجموعی وزن
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-amber-200/90 rounded-full text-amber-950 font-bold text-xs font-urdu shrink-0">
                  بنیادی کاؤنٹر سیل
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {/* Weight Input */}
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-800 font-urdu block mb-1">
                    کتنا کلو بیچا؟ (وزن KG) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.05"
                      value={freshRow.weightKg}
                      onChange={e => handleWeightChange(freshRowIndex, e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border-2 border-amber-400 rounded-2xl pl-3 pr-9 py-2.5 text-base font-mono font-black text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-700">
                      KG
                    </span>
                  </div>

                  {/* Quick Pills for Fresh Chicken */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {[1, 2, 5, 10, 20, 50].map(addKg => (
                      <button
                        key={addKg}
                        type="button"
                        onClick={() => handleQuickAddWeight(freshRowIndex, addKg)}
                        className="px-2 py-0.5 bg-white hover:bg-amber-200 text-amber-950 text-[10px] font-mono font-bold rounded-lg border border-amber-300 transition shadow-2xs active:scale-95"
                      >
                        +{addKg}k
                      </button>
                    ))}
                    {freshWeight > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearWeight(freshRowIndex)}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-urdu font-bold rounded-lg border border-rose-200 transition"
                      >
                        صاف
                      </button>
                    )}
                  </div>
                </div>

                {/* Selling Rate */}
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-800 font-urdu block mb-1">
                    فروخت ریٹ فی کلو (Rs / KG)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rs.
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={freshRow.ratePerKg}
                      onChange={e => handleRateChange(freshRowIndex, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-2xl pl-9 pr-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Fresh Chicken Total Amount */}
                <div className="sm:col-span-1 bg-white p-3 rounded-2xl border border-amber-300 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] text-slate-500 font-urdu font-bold block">
                    تازہ مرغی کل رقم:
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1">
                    Rs. {freshTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 2. OTHER MEAT CUTS (COLLAPSIBLE / OPTIONAL)                     */}
          {/* =============================================================== */}
          {otherRows.length > 0 && (
            <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setShowOtherCuts(!showOtherCuts)}
                className="w-full p-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-right transition border-b border-slate-200/80"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold">
                    🍗
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 font-urdu">
                      دیگر چکن کٹس شامل کریں (اختیاری)
                    </span>
                    <span className="text-[10px] text-slate-500 block font-urdu">
                      {otherRows.length} کٹس دستیاب (بون لیس، ونگز، لیگز، کلیجی وغیرہ)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold font-urdu bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <span>{showOtherCuts ? '− کٹس چھپائیں' : `+ کٹس کھولیں (${otherRows.length})`}</span>
                  {showOtherCuts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showOtherCuts && (
                <div className="p-3 sm:p-4 space-y-3 bg-white">
                  {/* Mobile-friendly view: Stacked Cards for each cut */}
                  <div className="sm:hidden space-y-3">
                    {otherRows.map(row => {
                      const idx = row.originalIndex;
                      const w = Number(row.weightKg) || 0;
                      const r = Number(row.ratePerKg) || 0;
                      const lineTot = Math.round(w * r);

                      return (
                        <div
                          key={row.productId}
                          className={`p-3 rounded-2xl border transition ${
                            w > 0 ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50/70 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-black text-xs text-slate-900 font-urdu block">
                                {row.urduName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-sans">
                                {row.productName}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 font-urdu block">ٹوٹل:</span>
                              <span className="font-mono font-black text-xs text-emerald-700">
                                Rs. {lineTot.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 items-end">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 font-urdu block mb-0.5">
                                فروخت وزن (KG)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.05"
                                  value={row.weightKg}
                                  onChange={e => handleWeightChange(idx, e.target.value)}
                                  placeholder="0.00"
                                  className="w-full bg-white border border-slate-300 rounded-xl pl-2 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                                  KG
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 font-urdu block mb-0.5">
                                ریٹ فی کلو (Rs)
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={row.ratePerKg}
                                onChange={e => handleRateChange(idx, e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 text-center"
                              />
                            </div>
                          </div>

                          {/* Quick buttons */}
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {[1, 2, 5].map(addKg => (
                              <button
                                key={addKg}
                                type="button"
                                onClick={() => handleQuickAddWeight(idx, addKg)}
                                className="px-1.5 py-0.5 bg-white hover:bg-amber-100 text-slate-700 text-[9px] font-mono font-bold rounded border border-slate-200 transition"
                              >
                                +{addKg}k
                              </button>
                            ))}
                            {w > 0 && (
                              <button
                                type="button"
                                onClick={() => handleClearWeight(idx)}
                                className="px-1.5 py-0.5 text-rose-600 hover:bg-rose-50 text-[9px] font-urdu font-bold rounded transition"
                              >
                                صاف
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop view: Clean Table */}
                  <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                        <tr>
                          <th className="py-2.5 px-3">پروڈکٹ / کٹ کا نام</th>
                          <th className="py-2.5 px-3 text-center w-52">فروخت شدہ وزن (KG)</th>
                          <th className="py-2.5 px-3 text-center w-32">ریٹ فی کلو</th>
                          <th className="py-2.5 px-3 text-left">ٹوٹل رقم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {otherRows.map(row => {
                          const idx = row.originalIndex;
                          const w = Number(row.weightKg) || 0;
                          const r = Number(row.ratePerKg) || 0;
                          const lineTot = Math.round(w * r);

                          return (
                            <tr
                              key={row.productId}
                              className={`transition ${
                                w > 0 ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 font-urdu block">
                                  {row.urduName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans">
                                  {row.productName} • {row.category}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <div className="relative inline-block w-full">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.05"
                                    value={row.weightKg}
                                    onChange={e => handleWeightChange(idx, e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white text-center"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                    KG
                                  </span>
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  {[1, 2, 5].map(addKg => (
                                    <button
                                      key={addKg}
                                      type="button"
                                      onClick={() => handleQuickAddWeight(idx, addKg)}
                                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 text-[9px] font-mono font-bold rounded border border-slate-200 transition"
                                    >
                                      +{addKg}k
                                    </button>
                                  ))}
                                  {w > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearWeight(idx)}
                                      className="px-1.5 py-0.5 text-rose-500 hover:bg-rose-50 text-[9px] rounded font-bold transition font-urdu"
                                    >
                                      صاف
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={row.ratePerKg}
                                  onChange={e => handleRateChange(idx, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 text-center"
                                />
                              </td>

                              <td className="py-2.5 px-3 text-left">
                                <span className="font-mono font-black text-slate-900 text-xs">
                                  Rs. {lineTot.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-bold text-slate-600 font-urdu block mb-1">
              اضافی ریمارکس / نوٹس (اختیاری):
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثلاً: صبح اور شام کی مجموعی کاؤنٹر سیل..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {/* Modal Footer Summary & Submit */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Summary KPIs */}
          <div className="flex items-center gap-3 sm:gap-6 text-xs w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <span className="text-[10px] text-slate-500 font-urdu block">کل وزن:</span>
              <span className="font-mono font-black text-blue-700 text-sm sm:text-base">
                {totalWeightKg} KG
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-urdu block">اوسط ریٹ:</span>
              <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                Rs. {avgRate} / KG
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-urdu block">کل نقد کیش:</span>
              <span className="font-mono font-black text-emerald-700 text-base sm:text-lg">
                Rs. {totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-urdu font-bold text-xs transition"
            >
              منسوخ کریں
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                saving ||
                totalWeightKg <= 0 ||
                freshWeight > availableFreshStock
              }
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-urdu font-black text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving
                  ? 'محفوظ ہو رہا ہے...'
                  : `نقد سیل محفوظ کریں (Rs. ${totalRevenue.toLocaleString()})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
