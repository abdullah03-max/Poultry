import React, { useState, useEffect, useMemo } from 'react';
import { ChickenCustomer, ChickenCategory, ChickenSale } from './types';
import { chickenShopApi } from './api';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Scale,
  ShoppingCart,
  Calendar,
  Wallet,
  Receipt,
  FileText,
  User,
  AlertCircle,
} from 'lucide-react';

interface BillItemRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryUrduName: string;
  weightKg: string;
  ratePerKg: string;
}

interface CustomerKhataEntryModalProps {
  customer: ChickenCustomer | null;
  allCustomers?: ChickenCustomer[];
  categories: ChickenCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSale: ChickenSale) => void;
}

export const CustomerKhataEntryModal: React.FC<CustomerKhataEntryModalProps> = ({
  customer,
  allCustomers = [],
  categories,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customer?.id || '');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Initial Item Row
  const initialCategory = categories[0] || {
    id: 'cat-gosht',
    name: 'Chicken Gosht (Meat)',
    urdu_name: 'چکن گوشت',
    default_rate_per_kg: 400,
  };

  const [items, setItems] = useState<BillItemRow[]>([
    {
      id: 'row-1',
      categoryId: initialCategory.id,
      categoryName: initialCategory.name,
      categoryUrduName: initialCategory.urdu_name,
      weightKg: '',
      ratePerKg: String(initialCategory.default_rate_per_kg || 400),
    },
  ]);

  useEffect(() => {
    if (customer?.id) {
      setSelectedCustomerId(customer.id);
    } else if (allCustomers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(allCustomers[0].id);
    }
  }, [customer?.id, allCustomers]);

  const activeCustomer = useMemo(() => {
    return allCustomers.find(c => c.id === selectedCustomerId) || customer || null;
  }, [allCustomers, selectedCustomerId, customer]);

  if (!isOpen) return null;

  const handleCategoryChange = (rowId: string, catId: string) => {
    const foundCat = categories.find(c => c.id === catId);
    if (!foundCat) return;

    setItems(prev =>
      prev.map(item => {
        if (item.id === rowId) {
          return {
            ...item,
            categoryId: foundCat.id,
            categoryName: foundCat.name,
            categoryUrduName: foundCat.urdu_name,
            ratePerKg: foundCat.default_rate_per_kg ? String(foundCat.default_rate_per_kg) : item.ratePerKg,
          };
        }
        return item;
      })
    );
  };

  const handleWeightChange = (rowId: string, val: string) => {
    setItems(prev =>
      prev.map(item => (item.id === rowId ? { ...item, weightKg: val } : item))
    );
  };

  const handleRateChange = (rowId: string, val: string) => {
    setItems(prev =>
      prev.map(item => (item.id === rowId ? { ...item, ratePerKg: val } : item))
    );
  };

  const handleQuickAddWeight = (rowId: string, addKg: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === rowId) {
          const cur = Number(item.weightKg) || 0;
          return { ...item, weightKg: String(Number((cur + addKg).toFixed(2))) };
        }
        return item;
      })
    );
  };

  const handleAddItemRow = () => {
    const nextCat = categories[items.length % categories.length] || initialCategory;
    const newRow: BillItemRow = {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      categoryId: nextCat.id,
      categoryName: nextCat.name,
      categoryUrduName: nextCat.urdu_name,
      weightKg: '',
      ratePerKg: String(nextCat.default_rate_per_kg || 400),
    };
    setItems(prev => [...prev, newRow]);
  };

  const handleRemoveItemRow = (rowId: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== rowId));
  };

  // Calculations
  const calculatedItems = items.map(item => {
    const w = Number(item.weightKg) || 0;
    const r = Number(item.ratePerKg) || 0;
    const total = Math.round(w * r);
    return { ...item, numWeight: w, numRate: r, lineTotal: total };
  });

  const totalWeightKg = Number(
    calculatedItems.reduce((acc, it) => acc + it.numWeight, 0).toFixed(2)
  );
  const grandTotalAmount = calculatedItems.reduce((acc, it) => acc + it.lineTotal, 0);

  const previousBalance = activeCustomer?.current_balance || 0;
  // Mukammal Udhaar: 100% of bill amount is added to outstanding balance
  const expectedNewBalance = previousBalance + grandTotalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeCustomer) {
      alert('براہ کرم گاہک منتخب کریں');
      return;
    }

    const invalidItems = calculatedItems.filter(it => it.numWeight <= 0 || it.numRate <= 0);
    if (invalidItems.length > 0) {
      alert('براہ کرم تمام منتخب آئٹمز کا درست وزن اور ریٹ درج کریں');
      return;
    }

    try {
      setSaving(true);

      const saleItems = calculatedItems.map(it => ({
        product_id: it.categoryId,
        product_name: `${it.categoryName} (${it.categoryUrduName})`,
        urdu_name: it.categoryUrduName,
        category_id: it.categoryId,
        category_name: it.categoryName,
        weight_kg: it.numWeight,
        rate_per_kg: it.numRate,
        line_total: it.lineTotal,
      }));

      // Requirement 5: Mukammal Udhaar (Full Credit)
      const newSale = await chickenShopApi.createSale({
        customer_id: activeCustomer.id,
        customer_name: activeCustomer.name,
        phone: activeCustomer.phone,
        items: saleItems,
        payment_method: 'credit', // Mukammal Udhaar
        received_amount: 0,
        discount: 0,
        notes: notes || undefined,
        sale_date: saleDate,
      });

      onSuccess(newSale);
      onClose();
    } catch (err: any) {
      alert(`کھاتہ اندراج محفوظ کرنے میں خرابی: ${err.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">
              📝
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-urdu tracking-tight">
                گاہک کھاتہ میں نیا سودا / ادھار بل اندراج (Customer Khata Sale)
              </h3>
              <p className="text-xs text-amber-100 font-urdu">
                ایک ہی بل میں متعدد چکن کیٹیگریز منتخب کریں • مکمل ادھار کھاتے میں خودکار جمع
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Customer Selection & Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                  گاہک کھاتہ دار منتخب کریں (Customer) *
                </label>
                {customer ? (
                  <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 font-urdu flex items-center justify-between">
                    <span>{customer.name} {customer.shop_name ? `(${customer.shop_name})` : ''}</span>
                    <span className="text-[11px] font-mono text-slate-500">{customer.phone}</span>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 font-urdu"
                  >
                    <option value="">-- گاہک منتخب کریں --</option>
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.shop_name ? `(${c.shop_name})` : ''} — سابقہ بقایا: Rs.{c.current_balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                  بل تاریخ (Bill Date) *
                </label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {activeCustomer && (
              <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-amber-950 font-urdu">
                  سابقہ کھاتہ بقایا (Previous Due): <strong className="font-mono text-rose-700">Rs. {previousBalance.toLocaleString()}</strong>
                </span>
                <span className="text-amber-950 font-urdu">
                  فون: <strong className="font-mono text-slate-800">{activeCustomer.phone}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Multiple Items Bill Section (Requirement 4) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-sm text-slate-900 font-urdu">
                  چکن کیٹیگریز و وزن اندراج (Bill Items)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold font-urdu rounded-xl shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ مزید آئٹم شامل کریں (Add Item)</span>
              </button>
            </div>

            {/* Items Table / Cards */}
            <div className="space-y-2.5">
              {items.map((item, index) => {
                const w = Number(item.weightKg) || 0;
                const r = Number(item.ratePerKg) || 0;
                const lineTotal = Math.round(w * r);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-300 transition shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-amber-800 font-urdu flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <span>آئٹم #{index + 1}</span>
                      </span>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 transition font-urdu flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف کریں</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* 1. Category Dropdown */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-slate-700 font-urdu mb-1">
                          چکن کیٹیگری (Category) *
                        </label>
                        <select
                          required
                          value={item.categoryId}
                          onChange={e => handleCategoryChange(item.id, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 font-urdu"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.urdu_name} ({c.name})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Weight in KG */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 font-urdu mb-1">
                          وزن (KG) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.05"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={item.weightKg}
                            onChange={e => handleWeightChange(item.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-9 py-2 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-amber-600"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">
                            KG
                          </span>
                        </div>

                        {/* Quick increments */}
                        <div className="flex gap-1 mt-1">
                          {[0.5, 1, 2].map(addKg => (
                            <button
                              key={addKg}
                              type="button"
                              onClick={() => handleQuickAddWeight(item.id, addKg)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 text-[10px] font-mono rounded font-bold transition"
                            >
                              +{addKg}k
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Rate per KG */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 font-urdu mb-1">
                          ریٹ (Rs/KG) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          placeholder="400"
                          value={item.ratePerKg}
                          onChange={e => handleRateChange(item.id, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                        />
                      </div>

                      {/* 4. Line Total */}
                      <div className="sm:col-span-2 text-left sm:text-right p-2 bg-amber-50/60 rounded-xl border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 font-urdu block">
                          کل رقم:
                        </span>
                        <span className="text-sm font-mono font-black text-amber-900">
                          Rs. {lineTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total & Mukammal Udhaar Notice (Requirement 5) */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200">
              <div>
                <span className="text-xs text-slate-600 font-urdu">کل وزن (Total Weight):</span>
                <strong className="text-sm font-mono font-black text-slate-900 ml-2">
                  {totalWeightKg} KG
                </strong>
              </div>
              <div>
                <span className="text-xs text-slate-600 font-urdu">نئے سودے کا بل (Bill Amount):</span>
                <strong className="text-xl font-mono font-black text-amber-800 ml-2">
                  Rs. {grandTotalAmount.toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Mukammal Udhaar Mode Banner */}
            <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold font-urdu shadow-2xs">
                  📝 مکمل ادھار (Full Credit)
                </span>
                <span className="text-xs font-urdu text-slate-700 font-medium">
                  یہ کل بل گاہک کے کھاتے میں واجب الادا رقم کے طور پر جمع ہو گا۔
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-urdu block">نیا کل بقایا بیلنس:</span>
                <span className="text-sm font-mono font-black text-rose-700">
                  Rs. {expectedNewBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
              تفصیل / ریمارکس (Optional Notes)
            </label>
            <input
              type="text"
              placeholder="مثال: شام کی سپلائی / پارسل"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-urdu focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition font-urdu"
            >
              منسوخ (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving || grandTotalAmount <= 0}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md font-urdu disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'کھاتے میں محفوظ ہو رہا ہے...' : 'کھاتے میں محفوظ کریں (Save Khata Bill)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
