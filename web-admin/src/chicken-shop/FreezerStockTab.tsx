// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Freezer Stock Section
// Dedicated, Isolated Freezer Inventory & Fast Sales (Completely Separate from Fresh Chicken)
// =============================================================================

import React, { useState, useMemo } from 'react';
import { FreezerProduct, ChickenCustomer, ChickenSale } from './types';
import { chickenShopApi } from './api';
import {
  Snowflake,
  Plus,
  Edit2,
  Trash2,
  ShoppingCart,
  TrendingUp,
  Package,
  Layers,
  Search,
  Scale,
  X,
  Check,
  AlertTriangle,
  Receipt,
  Tag,
} from 'lucide-react';

interface FreezerStockTabProps {
  freezerProducts: FreezerProduct[];
  customers: ChickenCustomer[];
  sales: ChickenSale[];
  onRefresh: () => Promise<void>;
  onOpenReceipt: (sale: ChickenSale) => void;
}

export const FreezerStockTab: React.FC<FreezerStockTabProps> = ({
  freezerProducts,
  customers,
  sales,
  onRefresh,
  onOpenReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FreezerProduct | null>(null);

  // Form state for add/edit product
  const [formName, setFormName] = useState('');
  const [formUrduName, setFormUrduName] = useState('');
  const [formStockKg, setFormStockKg] = useState('');
  const [formRatePerKg, setFormRatePerKg] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Quick Add Stock modal state
  const [stockModalProduct, setStockModalProduct] = useState<FreezerProduct | null>(null);
  const [addStockKg, setAddStockKg] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  // Quick Sell modal state
  const [sellModalProduct, setSellModalProduct] = useState<FreezerProduct | null>(null);
  const [sellWeightKg, setSellWeightKg] = useState('');
  const [sellRatePerKg, setSellRatePerKg] = useState('');
  const [sellCustomerId, setSellCustomerId] = useState('');
  const [sellPaymentMethod, setSellPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [sellSaving, setSellSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // Calculations
  // ---------------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return freezerProducts;
    return freezerProducts.filter(
      p => p.name.toLowerCase().includes(q) || (p.urdu_name && p.urdu_name.toLowerCase().includes(q))
    );
  }, [freezerProducts, searchQuery]);

  const kpis = useMemo(() => {
    const totalCount = freezerProducts.length;
    const totalStock = Number(freezerProducts.reduce((sum, p) => sum + (p.stock_kg || 0), 0).toFixed(2));
    const totalValuation = Math.round(
      freezerProducts.reduce((sum, p) => sum + (p.stock_kg || 0) * (p.rate_per_kg || 0), 0)
    );

    // Today's freezer sales
    let todaySoldKg = 0;
    let todaySoldRevenue = 0;
    const freezerProductIds = new Set(freezerProducts.map(p => p.id));

    sales
      .filter(s => s.sale_date === todayStr)
      .forEach(s => {
        s.items.forEach(item => {
          if (item.is_freezer || freezerProductIds.has(item.product_id) || item.product_name.toLowerCase().includes('freezer')) {
            todaySoldKg += Number(item.weight_kg || 0);
            todaySoldRevenue += Number(item.line_total || 0);
          }
        });
      });

    return {
      totalCount,
      totalStock,
      totalValuation,
      todaySoldKg: Number(todaySoldKg.toFixed(2)),
      todaySoldRevenue,
    };
  }, [freezerProducts, sales, todayStr]);

  // Recent freezer sales
  const recentFreezerSales = useMemo(() => {
    const freezerProductIds = new Set(freezerProducts.map(p => p.id));
    const list: {
      sale: ChickenSale;
      item: {
        product_name: string;
        urdu_name?: string;
        weight_kg: number;
        rate_per_kg: number;
        line_total: number;
      };
    }[] = [];

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.is_freezer || freezerProductIds.has(item.product_id) || item.product_name.toLowerCase().includes('freezer')) {
          list.push({ sale, item });
        }
      });
    });

    return list.slice(0, 15);
  }, [sales, freezerProducts]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormUrduName('');
    setFormStockKg('');
    setFormRatePerKg('');
    setAddEditModalOpen(true);
  };

  const handleOpenEditModal = (p: FreezerProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormUrduName(p.urdu_name || '');
    setFormStockKg(String(p.stock_kg || ''));
    setFormRatePerKg(String(p.rate_per_kg || ''));
    setAddEditModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('براہ کرم پروڈکٹ کا نام درج کریں');
      return;
    }
    const rate = Number(formRatePerKg);
    const stock = Number(formStockKg) || 0;
    if (rate <= 0) {
      alert('براہ کرم درست فروخت ریٹ درج کریں');
      return;
    }

    try {
      setFormSaving(true);
      await chickenShopApi.saveFreezerProduct({
        id: editingProduct?.id,
        name: formName.trim(),
        urdu_name: formUrduName.trim() || formName.trim(),
        rate_per_kg: rate,
        stock_kg: stock,
      });
      await onRefresh();
      setAddEditModalOpen(false);
    } catch (err: any) {
      alert(`پروڈکٹ محفوظ کرنے میں مسئلہ: ${err.message}`);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteProduct = async (p: FreezerProduct) => {
    if (!confirm(`کیا آپ واقعی فریزر پروڈکٹ "${p.name} (${p.urdu_name})" کو حذف کرنا چاہتے ہیں؟`)) {
      return;
    }
    try {
      await chickenShopApi.deleteFreezerProduct(p.id);
      await onRefresh();
    } catch (err: any) {
      alert(`پروڈکٹ حذف کرنے میں مسئلہ: ${err.message}`);
    }
  };

  const handleOpenAddStock = (p: FreezerProduct) => {
    setStockModalProduct(p);
    setAddStockKg('');
  };

  const handleSaveAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    const kg = Number(addStockKg);
    if (!kg || kg <= 0) {
      alert('براہ کرم درست وزن درج کریں');
      return;
    }
    try {
      setStockSaving(true);
      const newStock = Number(((stockModalProduct.stock_kg || 0) + kg).toFixed(2));
      await chickenShopApi.updateFreezerStock(stockModalProduct.id, newStock);
      await onRefresh();
      setStockModalProduct(null);
    } catch (err: any) {
      alert(`اسٹاک شامل کرنے میں مسئلہ: ${err.message}`);
    } finally {
      setStockSaving(false);
    }
  };

  const handleOpenSell = (p: FreezerProduct) => {
    setSellModalProduct(p);
    setSellWeightKg('');
    setSellRatePerKg(String(p.rate_per_kg));
    setSellCustomerId('');
    setSellPaymentMethod('cash');
  };

  const handleSaveSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellModalProduct) return;
    const weight = Number(sellWeightKg);
    const rate = Number(sellRatePerKg);
    if (!weight || weight <= 0) {
      alert('براہ کرم درست وزن درج کریں');
      return;
    }
    if (!rate || rate <= 0) {
      alert('براہ کرم درست ریٹ درج کریں');
      return;
    }

    const available = Number(sellModalProduct.stock_kg || 0);
    if (weight > available) {
      if (!confirm(`خبردار: آپ کے پاس فریزر میں صرف ${available} KG دستیاب ہے، جبکہ آپ ${weight} KG فروخت کر رہے ہیں۔ کیا پھر بھی سیل محفوظ کرنی ہے؟`)) {
        return;
      }
    }

    const selCustomer = customers.find(c => c.id === sellCustomerId);
    if (sellPaymentMethod === 'credit' && !selCustomer) {
      alert('ادھار سیل کے لیے براہ کرم گاہک کا کھاتہ منتخب کریں');
      return;
    }

    try {
      setSellSaving(true);
      const lineTotal = Math.round(weight * rate);
      const newSale = await chickenShopApi.createSale({
        customer_id: selCustomer ? selCustomer.id : null,
        customer_name: selCustomer ? selCustomer.name : 'فریزر نقد خریدار (Walk-in)',
        phone: selCustomer?.phone || null,
        items: [
          {
            product_id: sellModalProduct.id,
            product_name: sellModalProduct.name,
            urdu_name: sellModalProduct.urdu_name,
            weight_kg: weight,
            rate_per_kg: rate,
          },
        ],
        payment_method: sellPaymentMethod,
        received_amount: sellPaymentMethod === 'cash' ? lineTotal : 0,
        notes: 'فریزر اسٹاک کاؤنٹر سیل',
      });

      await onRefresh();
      setSellModalProduct(null);
      if (newSale) {
        onOpenReceipt(newSale);
      }
    } catch (err: any) {
      alert(`فروخت محفوظ کرنے میں مسئلہ: ${err.message}`);
    } finally {
      setSellSaving(false);
    }
  };

  const handleDeleteFreezerSale = async (sale: ChickenSale) => {
    const isConfirmed = window.confirm(
      `کیا آپ واقعی یہ فریزر سیل انوائس #${sale.invoice_no} (${sale.customer_name} - Rs.${sale.total_amount.toLocaleString()}) حذف کرنا چاہتے ہیں؟\n\nاس عمل سے بیچے گئے فریزر پروڈکٹ کا اسٹاک خودکار بحال ہو جائے گا۔`
    );
    if (!isConfirmed) return;

    try {
      await chickenShopApi.deleteSale(sale.id);
      await onRefresh();
      alert(`انوائس #${sale.invoice_no} کامیابی سے حذف ہو گئی اور فریزر اسٹاک بحال ہو گیا۔`);
    } catch (err: any) {
      alert(`سیل حذف کرنے میں خرابی: ${err.message || 'Error deleting sale'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-cyan-900 via-sky-900 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center text-3xl shrink-0 shadow-inner">
              <Snowflake className="w-7 h-7 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black font-urdu tracking-tight">
                  فریزر اسٹاک مینجمنٹ (Freezer Stock)
                </h2>
                <span className="text-[10px] bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 px-2.5 py-0.5 rounded-full font-bold">
                  منجمد اشیاء رجسٹر
                </span>
              </div>
              <p className="text-xs text-slate-300 font-urdu mt-1">
                یہاں بون لیس، تیکہ کٹ، ونگز، ڈرم اسٹکس اور دیگر فریز شدہ پروڈکٹس کا اسٹاک اور فوری فروخت علیحدہ محفوظ کی جاتی ہے
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-black font-urdu transition active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ نیا فریزر پروڈکٹ شامل کریں</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-urdu">
              کل فریزر پروڈکٹس
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-cyan-800 font-mono tracking-tight">
              {kpis.totalCount} <span className="text-xs font-normal text-slate-500">آئٹمز</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-urdu">فعال فریزر کٹس</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-urdu">
              مجموعی فریزر اسٹاک
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-blue-700 font-mono tracking-tight">
              {kpis.totalStock} <span className="text-xs font-sans text-slate-500">KG</span>
            </p>
            <p className="text-[10px] text-blue-600 mt-0.5 font-urdu">دستیاب منجمد مال</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-urdu">
              کل مالیت (ٹوٹل ویلیو)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
              Rs. {kpis.totalValuation.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-urdu">موجودہ اسٹاک کی قیمت</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider font-urdu">
              آج فریزر فروخت
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-purple-700 font-mono tracking-tight">
              {kpis.todaySoldKg} <span className="text-xs font-sans text-slate-500">KG</span>
            </p>
            <p className="text-[10px] text-purple-600 mt-0.5 font-urdu">
              رقم: Rs. {kpis.todaySoldRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content: Products Grid & Search */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 font-urdu flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-cyan-600" />
              <span>فریزر اشیاء اور اسٹاک لسٹ (Freezer Products)</span>
            </h3>
            <p className="text-xs text-slate-500 font-urdu mt-0.5">
              ہر آئٹم کا وزن دیکھیں، ریٹ سیٹ کریں یا ایک کلک پر فروخت درج کریں
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="تلاش نام یا اردو نام..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center text-xl mb-2">
              <Snowflake className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-800 font-urdu">کوئی فریزر پروڈکٹ شامل نہیں ہے</h4>
            <p className="text-xs text-slate-500 font-urdu mt-1 max-w-sm mx-auto">
              بون لیس، ڈرم اسٹکس، یا ونگز وغیرہ شامل کرنے کے لیے اوپر دیے گئے بٹن (+ نیا فریزر پروڈکٹ شامل کریں) پر کلک کریں۔
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-xs"
            >
              + پہلا فریزر پروڈکٹ شامل کریں
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => {
              const stockValuation = Math.round((p.stock_kg || 0) * (p.rate_per_kg || 0));
              const isLowStock = (p.stock_kg || 0) <= 5;
              return (
                <div
                  key={p.id}
                  className="p-5 rounded-3xl border border-slate-200/90 hover:border-cyan-300 bg-white hover:shadow-sm transition flex flex-col justify-between group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-base font-black text-slate-900 block truncate group-hover:text-cyan-700 transition">
                          {p.name}
                        </span>
                        <span className="text-xs text-slate-500 font-urdu block truncate">
                          {p.urdu_name || p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition"
                          title="ایڈٹ کریں"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stock & Rate Info */}
                    <div className="my-4 p-3.5 bg-gradient-to-br from-slate-50 to-cyan-50/30 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-urdu block">موجودہ اسٹاک:</span>
                        <p className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                          {p.stock_kg || 0} <span className="text-xs font-normal text-slate-500">KG</span>
                        </p>
                        {isLowStock && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 font-urdu">
                            کم اسٹاک
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-urdu block">فروخت ریٹ:</span>
                        <p className="text-sm font-black font-mono text-cyan-800 mt-0.5">
                          Rs. {p.rate_per_kg} <span className="text-[10px] font-normal">/KG</span>
                        </p>
                        <span className="text-[10px] text-emerald-700 font-mono font-bold block mt-1">
                          مالیت: Rs. {stockValuation.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenSell(p)}
                      className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black font-urdu transition active:scale-95 shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>فروخت کریں ⚡</span>
                    </button>

                    <button
                      onClick={() => handleOpenAddStock(p)}
                      className="py-2.5 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200/80 rounded-xl text-xs font-bold font-urdu transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-600" />
                      <span>+ اسٹاک ڈالیں</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Freezer Sales Activity */}
      {recentFreezerSales.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
          <h3 className="text-sm font-black text-slate-900 font-urdu flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-cyan-600" />
            <span>حالیہ فریزر فروخت ریکارڈ (Recent Freezer Sales)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">تاریخ</th>
                  <th className="py-2.5 px-3">انوائس #</th>
                  <th className="py-2.5 px-3">گاہک</th>
                  <th className="py-2.5 px-3">پروڈکٹ</th>
                  <th className="py-2.5 px-3 text-center">وزن (KG)</th>
                  <th className="py-2.5 px-3 text-center">ریٹ</th>
                  <th className="py-2.5 px-3 text-center">کل رقم</th>
                  <th className="py-2.5 px-3 text-center">طریقہ</th>
                  <th className="py-2.5 px-3 text-center w-20">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFreezerSales.map(({ sale, item }, idx) => (
                  <tr key={`${sale.id}-${idx}`} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-slate-600">{sale.sale_date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">#{sale.invoice_no}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{sale.customer_name}</td>
                    <td className="py-2.5 px-3 font-medium text-cyan-900">{item.product_name}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{item.weight_kg} KG</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">Rs. {item.rate_per_kg}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-700">
                      Rs. {item.line_total.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        sale.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sale.payment_method === 'cash' ? 'نقد' : 'ادھار'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenReceipt(sale)}
                          className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition"
                          title="رسید دیکھیں"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFreezerSale(sale)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="سیل ڈیلیٹ کریں (اسٹاک خودکار واپس بحال ہوگا)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT FREEZER PRODUCT                                    */}
      {/* ===================================================================== */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-cyan-700 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-sm font-urdu">
                  {editingProduct ? 'فریزر پروڈکٹ ایڈٹ کریں' : 'نیا فریزر پروڈکٹ شامل کریں'}
                </h3>
              </div>
              <button
                onClick={() => setAddEditModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                  پروڈکٹ نام (Product Name - English) *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Chicken Boneless, Wings, Drumsticks"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                  اردو نام (Urdu Name)
                </label>
                <input
                  type="text"
                  value={formUrduName}
                  onChange={e => setFormUrduName(e.target.value)}
                  placeholder="مثلاً چکن بون لیس، ونگز، ڈرم اسٹکس"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium font-urdu focus:outline-none focus:border-cyan-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                    اسٹاک مقدار (Stock KG) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      required
                      value={formStockKg}
                      onChange={e => setFormStockKg(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      KG
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                    فروخت ریٹ فی کلو (Price / KG) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={formRatePerKg}
                      onChange={e => setFormRatePerKg(e.target.value)}
                      placeholder="650"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      Rs.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold font-urdu transition active:scale-95 shadow-xs disabled:opacity-60"
                >
                  {formSaving ? 'محفوظ ہو رہا ہے...' : 'پروڈکٹ محفوظ کریں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: QUICK ADD STOCK                                              */}
      {/* ===================================================================== */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-cyan-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-sm font-urdu">فریزر اسٹاک شامل کریں</h3>
              </div>
              <button
                onClick={() => setStockModalProduct(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddStock} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <span className="text-slate-500 font-urdu block">پروڈکٹ:</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {stockModalProduct.name} ({stockModalProduct.urdu_name})
                </span>
                <span className="text-slate-500 font-urdu block mt-1">
                  موجودہ اسٹاک: <strong className="font-mono text-cyan-800">{stockModalProduct.stock_kg} KG</strong>
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                  نیا شامل کردہ وزن (New Arrived KG) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    required
                    value={addStockKg}
                    onChange={e => setAddStockKg(e.target.value)}
                    placeholder="مثال: 10"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    KG
                  </span>
                </div>
              </div>

              {Number(addStockKg) > 0 && (
                <div className="p-2.5 bg-cyan-50 rounded-xl text-xs text-cyan-900 font-urdu flex justify-between">
                  <span>اسٹاک کے بعد کل مال ہوگا:</span>
                  <strong className="font-mono font-black">
                    {Number(((stockModalProduct.stock_kg || 0) + Number(addStockKg)).toFixed(2))} KG
                  </strong>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockModalProduct(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={stockSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold font-urdu transition active:scale-95 shadow-xs disabled:opacity-60"
                >
                  {stockSaving ? 'محفوظ ہو رہا ہے...' : 'اسٹاک جمع کریں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: QUICK SELL FREEZER ITEM                                      */}
      {/* ===================================================================== */}
      {sellModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm font-urdu">فریزر آئٹم فروخت کریں (Record Sale)</h3>
              </div>
              <button
                onClick={() => setSellModalProduct(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSell} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {sellModalProduct.name} ({sellModalProduct.urdu_name})
                  </span>
                  <span className="text-slate-500 font-urdu block mt-0.5">
                    دستیاب اسٹاک: <strong className="font-mono text-emerald-800">{sellModalProduct.stock_kg} KG</strong>
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                  Rs. {sellModalProduct.rate_per_kg}/KG
                </span>
              </div>

              {/* Weight & Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                    فروخت وزن (Sold Weight KG) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      required
                      value={sellWeightKg}
                      onChange={e => setSellWeightKg(e.target.value)}
                      placeholder="وزن درج کریں"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      KG
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                    ریٹ فی کلو (PKR) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={sellRatePerKg}
                      onChange={e => setSellRatePerKg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      Rs.
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Price Preview */}
              {Number(sellWeightKg) > 0 && Number(sellRatePerKg) > 0 && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="text-emerald-950 font-bold font-urdu">کل بل رقم (Total Amount):</span>
                  <span className="text-base font-black font-mono text-emerald-800">
                    Rs. {Math.round(Number(sellWeightKg) * Number(sellRatePerKg)).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Customer selection & Payment method */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                    ادائیگی کا طریقہ (Payment Method)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSellPaymentMethod('cash')}
                      className={`py-2 text-xs font-bold rounded-xl transition ${
                        sellPaymentMethod === 'cash'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      💵 نقد (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellPaymentMethod('credit')}
                      className={`py-2 text-xs font-bold rounded-xl transition ${
                        sellPaymentMethod === 'credit'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      📝 ادھار کھاتہ (Credit)
                    </button>
                  </div>
                </div>

                {sellPaymentMethod === 'credit' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                      گاہک منتخب کریں (Select Customer) *
                    </label>
                    <select
                      value={sellCustomerId}
                      onChange={e => setSellCustomerId(e.target.value)}
                      required={sellPaymentMethod === 'credit'}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-600"
                    >
                      <option value="">-- گاہک منتخب کریں --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.shop_name ? `(${c.shop_name})` : ''} — سابقہ بقایا: Rs.{c.current_balance}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSellModalProduct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={sellSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black font-urdu transition active:scale-95 shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {sellSaving ? (
                    'محفوظ ہو رہا ہے...'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>بل بنائیں اور اسٹاک کاٹیں</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
