// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Bulk Walk-in Cash Sale Modal
// Allows entering all walk-in counter sales altogether by meat cuts
// Completely separate from Khata customers, with automated stock maal deduction
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { ChickenProduct } from './types';
import { chickenShopApi } from './api';
import {
  X,
  ShoppingCart,
  Scale,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  Layers,
  Sparkles,
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
  availableStock: number;
  weightKg: string;
  ratePerKg: string;
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
  const [notes, setNotes] = useState<string>('کاؤنٹر واک ان خریداروں کی مجموعی نقد فروخت');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize rows with active products
  useEffect(() => {
    if (isOpen) {
      setSaleDate(defaultDate || todayStr);
      setErrorMsg(null);
      const initialRows: ProductWalkinRow[] = products
        .filter(p => p.is_active)
        .map(p => ({
          productId: p.id,
          productName: p.name,
          urduName: p.urdu_name || p.name,
          category: p.category || 'Chicken Cuts',
          availableStock: Number(p.stock_kg) || 0,
          weightKg: '',
          ratePerKg: String(p.rate_per_kg || 0),
        }));
      setRows(initialRows);
    }
  }, [isOpen, products, defaultDate, todayStr]);

  if (!isOpen) return null;

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
      const max = next[index].availableStock;
      const updated = Math.min(max, Number((cur + addAmount).toFixed(2)));
      next[index] = { ...next[index], weightKg: String(updated) };
      return next;
    });
  };

  const handleSetAllStock = (index: number) => {
    setRows(prev => {
      const next = [...prev];
      const max = next[index].availableStock;
      next[index] = { ...next[index], weightKg: String(max) };
      return next;
    });
  };

  const handleClearRow = (index: number) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], weightKg: '' };
      return next;
    });
  };

  // Calculations
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

  // Validation
  const hasOverStockError = rows.some(r => {
    const w = Number(r.weightKg) || 0;
    return w > r.availableStock;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeItemsToSell.length === 0) {
      setErrorMsg('براہ کرم کم از کم ایک پروڈکٹ کا فروخت شدہ وزن درج کریں۔');
      return;
    }

    if (hasOverStockError) {
      setErrorMsg('کچھ پروڈکٹس کا درج شدہ وزن موجودہ دستیاب اسٹاک سے زیادہ ہے!');
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
        customer_id: null, // No Khata link - 100% walk-in cash sale
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-right">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 to-orange-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight">
                  کاؤنٹر واک ان نقد سیلز (مجموعی اندراج)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-urdu">
                  100% نقد کاؤنٹر • کھاتہ سے الگ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-urdu">
                عام خریداروں کو دن بھر میں بیچے گئے تمام کٹس کا مجموعی وزن اور ریٹ ایک ساتھ درج کریں
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Guidance Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/70 px-5 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-950 font-urdu">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>نوٹ:</strong> گاہک بائی گاہک الگ پرچی بنانے کی ضرورت نہیں۔ یہاں کل کلو لکھیں، رقم نقد کیش میں جمع ہو جائے گی اور مال اسٹاک سے کاٹ لیا جائے گا۔
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded-xl border border-amber-200">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] text-slate-500">تاریخ:</span>
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
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-urdu">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Products Table (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 font-urdu">
                <tr>
                  <th className="py-3 px-3">پروڈکٹ / گوشت کٹ</th>
                  <th className="py-3 px-3 text-center">دستیاب اسٹاک</th>
                  <th className="py-3 px-3 text-center w-56">کتنا کلو بیچا؟ (وزن)</th>
                  <th className="py-3 px-3 text-center w-32">ریٹ فی کلو</th>
                  <th className="py-3 px-3 text-left">ٹوٹل رقم</th>
                  <th className="py-3 px-3 text-center">مال کٹوتی پریویو</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {rows.map((row, idx) => {
                  const weight = Number(row.weightKg) || 0;
                  const rate = Number(row.ratePerKg) || 0;
                  const lineTotal = Math.round(weight * rate);
                  const isOver = weight > row.availableStock;
                  const remaining = Math.max(0, Number((row.availableStock - weight).toFixed(2)));

                  return (
                    <tr
                      key={row.productId}
                      className={`transition ${
                        weight > 0 ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Product Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs font-urdu">
                          {row.urduName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {row.productName} • <span className="text-slate-500">{row.category}</span>
                        </div>
                      </td>

                      {/* Available Stock */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                            row.availableStock <= 0
                              ? 'bg-slate-100 text-slate-400'
                              : row.availableStock <= 10
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {row.availableStock} KG
                        </span>
                      </td>

                      {/* Weight Input & Quick Pills */}
                      <td className="py-3 px-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={row.availableStock}
                            step="0.05"
                            value={row.weightKg}
                            onChange={e => handleWeightChange(idx, e.target.value)}
                            placeholder={row.availableStock > 0 ? '0.00' : 'اسٹاک ختم'}
                            disabled={row.availableStock <= 0}
                            className={`w-full border rounded-xl pl-3 pr-8 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                              row.availableStock <= 0
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isOver
                                ? 'bg-rose-50 border-rose-500 text-rose-700'
                                : weight > 0
                                ? 'bg-white border-amber-500 text-slate-900 ring-2 ring-amber-100'
                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
                            }`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                            KG
                          </span>
                        </div>

                        {/* Quick Add Pills */}
                        {row.availableStock > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleQuickAddWeight(idx, 1)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[9px] font-mono font-bold rounded border border-slate-200 transition"
                            >
                              +1k
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAddWeight(idx, 5)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[9px] font-mono font-bold rounded border border-slate-200 transition"
                            >
                              +5k
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAddWeight(idx, 10)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[9px] font-mono font-bold rounded border border-slate-200 transition"
                            >
                              +10k
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAllStock(idx)}
                              className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[9px] font-urdu font-bold rounded transition"
                              title="موجودہ تمام دستیاب مال فروخت درج کریں"
                            >
                              سب مال
                            </button>
                            {weight > 0 && (
                              <button
                                type="button"
                                onClick={() => handleClearRow(idx)}
                                className="px-1.5 py-0.5 text-rose-500 hover:bg-rose-50 text-[9px] rounded font-bold transition"
                                title="صاف کریں"
                              >
                                صاف
                              </button>
                            )}
                          </div>
                        )}

                        {isOver && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1 font-urdu">
                            ⚠️ دستیاب اسٹاک سے زیادہ ہے!
                          </div>
                        )}
                      </td>

                      {/* Selling Rate Input */}
                      <td className="py-3 px-3 text-center">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.ratePerKg}
                            onChange={e => handleRateChange(idx, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 text-center"
                          />
                        </div>
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-3 text-left">
                        <div className="font-mono font-black text-slate-900 text-xs">
                          Rs. {lineTotal.toLocaleString()}
                        </div>
                      </td>

                      {/* Maal Deduction Preview */}
                      <td className="py-3 px-3 text-center">
                        {weight > 0 ? (
                          <div className="text-[11px] font-mono space-y-0.5">
                            <span className="text-rose-600 font-black">-{weight} KG</span>
                            <div className="text-[9px] text-slate-400 font-urdu">
                              باقی: {remaining} KG
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Optional Notes */}
          <div className="mt-4">
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
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Summary KPIs */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <span className="text-[10px] text-slate-500 font-urdu block">
                کل فروخت کٹس:
              </span>
              <span className="font-bold text-slate-900 font-urdu">
                {activeItemsToSell.length} اقسام
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-urdu block">
                مجموعی فروخت شدہ وزن:
              </span>
              <span className="font-mono font-black text-blue-700 text-sm">
                {totalWeightKg} KG
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-urdu block">
                اوسط ریٹ فی کلو:
              </span>
              <span className="font-mono font-bold text-emerald-700">
                Rs. {avgRate} / KG
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-urdu block">
                کل نقد وصولی رقم:
              </span>
              <span className="font-mono font-black text-slate-900 text-base text-amber-700">
                Rs. {totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-urdu font-bold text-xs transition"
            >
              منسوخ کریں
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || totalWeightKg <= 0 || hasOverStockError}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-urdu font-black text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving
                  ? 'محفوظ ہو رہا ہے...'
                  : `محفوظ کریں (Rs. ${totalRevenue.toLocaleString()})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
