// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Dedicated Worker Application
// Strictly Isolated: 3 Core Responsibilities Only
// 1. Daily Sales  2. Customer Khata  3. Wasooli (Payment Collection)
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChickenShopWorker,
  ChickenCustomer,
  ChickenCategory,
  ChickenSale,
  ChickenPayment,
} from '../types';
import { chickenShopApi, DEFAULT_CHICKEN_CATEGORIES, FRESH_CHICKEN_PRODUCT_ID } from '../api';
import { CustomerKhataEntryModal } from '../CustomerKhataEntryModal';
import { CustomerLedgerModal } from '../CustomerLedgerModal';
import { SaleReceiptModal } from '../SaleReceiptModal';
import { PaymentModal } from '../PaymentModal';
import { formatDate } from '../../utils/formatters';
import {
  ShoppingCart,
  BookOpen,
  Banknote,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Phone,
  Scale,
  Calendar,
  Wallet,
  Receipt,
  User,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  Clock,
  Printer,
  Share2,
  Download,
} from 'lucide-react';

interface BillItemRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryUrduName: string;
  weightKg: string;
  ratePerKg: string;
}

export const ChickenWorkerApp: React.FC = () => {
  // Authentication State
  const [currentWorker, setCurrentWorker] = useState<ChickenShopWorker | null>(() => {
    try {
      const saved = localStorage.getItem('cs_worker_active_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login Form State
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [showLoginPass, setShowLoginPass] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab: 'sales' | 'khata' | 'wasooli'
  const [activeTab, setActiveTab] = useState<'sales' | 'khata' | 'wasooli'>('sales');

  // Core Data
  const [customers, setCustomers] = useState<ChickenCustomer[]>([]);
  const [categories, setCategories] = useState<ChickenCategory[]>([]);
  const [sales, setSales] = useState<ChickenSale[]>([]);
  const [payments, setPayments] = useState<ChickenPayment[]>([]);
  const [freshStockKg, setFreshStockKg] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Modals
  const [khataEntryModalOpen, setKhataEntryModalOpen] = useState<boolean>(false);
  const [khataEntryCustomer, setKhataEntryCustomer] = useState<ChickenCustomer | null>(null);
  const [ledgerModalCustomer, setLedgerModalCustomer] = useState<ChickenCustomer | null>(null);
  const [receiptModalSale, setReceiptModalSale] = useState<ChickenSale | null>(null);
  const [wasooliModalOpen, setWasooliModalOpen] = useState<boolean>(false);
  const [wasooliCustomer, setWasooliCustomer] = useState<ChickenCustomer | null>(null);

  // Fast Daily Sales Form State (Within Daily Sales Tab)
  const [posCustomerId, setPosCustomerId] = useState<string>('');
  const [posSaleDate, setPosSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [posItems, setPosItems] = useState<BillItemRow[]>([
    {
      id: 'row-1',
      categoryId: 'cat-gosht',
      categoryName: 'Chicken Gosht (Meat)',
      categoryUrduName: 'چکن گوشت',
      weightKg: '',
      ratePerKg: '400',
    },
  ]);
  const [posNotes, setPosNotes] = useState<string>('');
  const [posSaving, setPosSaving] = useState<boolean>(false);

  // Customer Khata Search
  const [khataSearch, setKhataSearch] = useState<string>('');

  // Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    document.title = 'شان چکن شاپ - ورکر پورٹل (Daily Sales & Khata)';
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = '/chicken_shop_icon.png';
    }

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [cList, catList, sList, pList, prodList] = await Promise.all([
        chickenShopApi.getCustomers(),
        chickenShopApi.getCategories(),
        chickenShopApi.getSales(),
        chickenShopApi.getPayments(),
        chickenShopApi.getProducts(),
      ]);
      setCustomers(cList);
      setCategories(catList.length > 0 ? catList : DEFAULT_CHICKEN_CATEGORIES);
      setSales(sList);
      setPayments(pList);
      const fProd = prodList.find(
        p => p.id === FRESH_CHICKEN_PRODUCT_ID || p.category === 'Fresh Live Chicken' || (p.urdu_name && p.urdu_name.includes('تازہ'))
      );
      if (fProd) {
        setFreshStockKg(Number(fProd.stock_kg) || 0);
      }
    } catch (err) {
      console.warn('[CS Worker] Failed to load data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentWorker) {
      loadData();
    }
  }, [currentWorker]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginPhone.trim() || !loginPass.trim()) {
      setLoginError('براہ کرم فون نمبر اور پاس ورڈ درج کریں');
      return;
    }

    try {
      setLoginLoading(true);
      const res = await chickenShopApi.loginWorker(loginPhone, loginPass);
      if (res.success && res.worker) {
        setCurrentWorker(res.worker);
        localStorage.setItem('cs_worker_active_session', JSON.stringify(res.worker));
      } else {
        setLoginError(res.error || 'لاگ ان کی معلومات درست نہیں ہیں۔');
      }
    } catch (err: any) {
      setLoginError(err.message || 'لاگ ان کرنے میں خرابی پیش آئی');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('کیا آپ لاگ آؤٹ کرنا چاہتے ہیں؟')) {
      localStorage.removeItem('cs_worker_active_session');
      setCurrentWorker(null);
    }
  };

  // ---------------------------------------------------------------------------
  // POS Daily Sales Row Helpers
  // ---------------------------------------------------------------------------
  const handlePosCategoryChange = (rowId: string, catId: string) => {
    const foundCat = categories.find(c => c.id === catId);
    if (!foundCat) return;

    setPosItems(prev =>
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

  const handlePosWeightChange = (rowId: string, val: string) => {
    setPosItems(prev => prev.map(item => (item.id === rowId ? { ...item, weightKg: val } : item)));
  };

  const handlePosRateChange = (rowId: string, val: string) => {
    setPosItems(prev => prev.map(item => (item.id === rowId ? { ...item, ratePerKg: val } : item)));
  };

  const handlePosQuickWeight = (rowId: string, addKg: number) => {
    setPosItems(prev =>
      prev.map(item => {
        if (item.id === rowId) {
          const cur = Number(item.weightKg) || 0;
          return { ...item, weightKg: String(Number((cur + addKg).toFixed(2))) };
        }
        return item;
      })
    );
  };

  const handleAddPosRow = () => {
    const nextCat = categories[posItems.length % categories.length] || categories[0];
    const newRow: BillItemRow = {
      id: 'row-' + Date.now(),
      categoryId: nextCat?.id || 'cat-gosht',
      categoryName: nextCat?.name || 'Chicken Gosht',
      categoryUrduName: nextCat?.urdu_name || 'چکن گوشت',
      weightKg: '',
      ratePerKg: String(nextCat?.default_rate_per_kg || 400),
    };
    setPosItems(prev => [...prev, newRow]);
  };

  const handleRemovePosRow = (rowId: string) => {
    if (posItems.length <= 1) return;
    setPosItems(prev => prev.filter(item => item.id !== rowId));
  };

  // Pos Calculations
  const calculatedPosItems = posItems.map(item => {
    const w = Number(item.weightKg) || 0;
    const r = Number(item.ratePerKg) || 0;
    const total = Math.round(w * r);
    return { ...item, numWeight: w, numRate: r, lineTotal: total };
  });

  const posTotalWeightKg = Number(
    calculatedPosItems.reduce((acc, it) => acc + it.numWeight, 0).toFixed(2)
  );
  const posGrandTotal = calculatedPosItems.reduce((acc, it) => acc + it.lineTotal, 0);

  const posSelectedCustomer = useMemo(() => {
    return customers.find(c => c.id === posCustomerId) || null;
  }, [customers, posCustomerId]);

  const handleSavePosSale = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalid = calculatedPosItems.filter(it => it.numWeight <= 0 || it.numRate <= 0);
    if (invalid.length > 0) {
      alert('براہ کرم تمام آئٹمز کا درست وزن اور ریٹ درج کریں');
      return;
    }

    if (freshStockKg > 0 && posTotalWeightKg > freshStockKg) {
      alert(`⚠️ غلطی: فروخت کا کل وزن (${posTotalWeightKg} KG) موجودہ دستیاب اسٹاک (${freshStockKg} KG) سے زیادہ ہے!\n\nآپ دستیاب اسٹاک سے زیادہ چکن فروخت نہیں کر سکتے۔ براہ کرم وزن درست فرمائیں۔\n(Cannot sell ${posTotalWeightKg} KG. Available stock is only ${freshStockKg} KG)`);
      return;
    }

    try {
      setPosSaving(true);
      const isCreditSale = Boolean(posCustomerId);

      const saleItems = calculatedPosItems.map(it => ({
        product_id: it.categoryId,
        product_name: `${it.categoryName} (${it.categoryUrduName})`,
        urdu_name: it.categoryUrduName,
        category_id: it.categoryId,
        category_name: it.categoryName,
        weight_kg: it.numWeight,
        rate_per_kg: it.numRate,
        line_total: it.lineTotal,
      }));

      const newSale = await chickenShopApi.createSale({
        customer_id: posCustomerId || null,
        customer_name: posSelectedCustomer ? posSelectedCustomer.name : 'نقد خریدار (Cash Sale)',
        phone: posSelectedCustomer?.phone || null,
        items: saleItems,
        payment_method: isCreditSale ? 'credit' : 'cash',
        received_amount: isCreditSale ? 0 : posGrandTotal,
        discount: 0,
        notes: (currentWorker ? `[ورکر: ${currentWorker.name}] ${posNotes || ''}`.trim() : posNotes) || undefined,
        sale_date: posSaleDate,
      });

      // Reload
      await loadData();

      // Reset form
      setPosCustomerId('');
      setPosItems([
        {
          id: 'row-1',
          categoryId: categories[0]?.id || 'cat-gosht',
          categoryName: categories[0]?.name || 'Chicken Gosht',
          categoryUrduName: categories[0]?.urdu_name || 'چکن گوشت',
          weightKg: '',
          ratePerKg: String(categories[0]?.default_rate_per_kg || 400),
        },
      ]);
      setPosNotes('');

      // Open receipt modal
      setReceiptModalSale(newSale);
    } catch (err: any) {
      alert(`سیل محفوظ کرنے میں خرابی: ${err.message || 'Error'}`);
    } finally {
      setPosSaving(false);
    }
  };

  // Today's Sales & Wasooli lists
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySalesList = useMemo(() => sales.filter(s => s.sale_date === todayStr), [sales, todayStr]);
  const todayPaymentsList = useMemo(() => payments.filter(p => p.payment_date === todayStr), [payments, todayStr]);

  const todaySalesTotal = useMemo(() => todaySalesList.reduce((s, r) => s + r.total_amount, 0), [todaySalesList]);
  const todaySalesWeight = useMemo(() => Number(todaySalesList.reduce((s, r) => s + r.total_weight_kg, 0).toFixed(2)), [todaySalesList]);
  const todayWasooliTotal = useMemo(() => todayPaymentsList.reduce((s, p) => s + p.amount, 0), [todayPaymentsList]);

  // Filtered Khata Customers
  const filteredKhataCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = khataSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.shop_name && c.shop_name.toLowerCase().includes(q)) ||
        c.phone.includes(q)
      );
    });
  }, [customers, khataSearch]);

  // ---------------------------------------------------------------------------
  // 1. LOGIN SCREEN (When not logged in)
  // ---------------------------------------------------------------------------
  if (!currentWorker) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg p-2">
              <img
                src="/chicken_shop_icon.png"
                alt="Chicken Shop Logo"
                className="w-full h-full object-contain drop-shadow"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-3xl">🍗</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-urdu">
              شان چکن شاپ و گوشت سینٹر
            </h1>
            <p className="text-xs text-amber-400 font-urdu font-bold">
              چکن شاپ ورکر ایپ (Staff Portal)
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-urdu font-bold text-center">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 font-urdu mb-1.5">
                موبائل فون نمبر / یوزرنیم (Phone / ID) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="03001234567"
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-3.5 pr-10 py-3 text-sm font-mono text-white focus:outline-none focus:border-amber-500 transition"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 font-urdu mb-1.5">
                پاس ورڈ یا پن کوڈ (Password / PIN) *
              </label>
              <div className="relative">
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  required
                  placeholder="پاس ورڈ درج کریں"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-3.5 pr-10 py-3 text-sm font-mono text-white focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-bold text-sm font-urdu rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{loginLoading ? 'لاگ ان ہو رہا ہے...' : 'ورکر لاگ ان کریں (Sign In)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const counterStaff: ChickenShopWorker = {
                  id: 'worker-counter-1',
                  name: 'کاؤنٹر سیلزمین (Counter Staff)',
                  phone: '03001234567',
                  role: 'worker',
                  can_daily_sales: true,
                  can_khata: true,
                  can_wasooli: true,
                  is_active: true,
                };
                setCurrentWorker(counterStaff);
                localStorage.setItem('cs_worker_active_session', JSON.stringify(counterStaff));
              }}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-bold text-xs font-urdu rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <span>⚡ فوری کاؤنٹر سیل شروع کریں (Direct Quick Access)</span>
            </button>
          </form>

          <div className="text-center text-[11px] text-slate-500 font-urdu">
            صرف چکن شاپ عملہ کے لیے • نیا ورکر ایڈمن پینل سے بنائیں
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-urdu text-[11px]">کیا آپ دکان کے مالک / ایڈمن ہیں؟</span>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#chicken-management';
                }}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl font-bold font-urdu transition active:scale-95 text-xs flex items-center gap-1.5"
              >
                <span>👑 ایڈمن پینل کھولیں</span>
              </button>
            </div>

            <a
              href="/ShanChickenShop.apk"
              download="ShanChickenShop.apk"
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 rounded-xl text-amber-400 text-xs font-bold font-urdu transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>📱 موبائل ایپ (ShanChickenShop.apk) ڈاؤن لوڈ کریں</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. MAIN LOGGED-IN WORKER APP (3 Tabs Only)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans overflow-x-hidden overflow-y-auto pb-24 [overscroll-behavior-y:contain]">
      {/* Top App Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg shrink-0 shadow-xs">
              🍗
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black font-urdu leading-tight">
                شان چکن شاپ
              </h1>
              <p className="text-[10px] text-amber-400 font-urdu font-bold">
                ورکر: {currentWorker.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-xl text-slate-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentTime} PKT</span>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.hash = '#chicken-management';
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold font-urdu transition border border-amber-500/30 cursor-pointer"
              title="ایڈمن پورٹل پر سوئچ کریں"
            >
              <span>👑 ایڈمن</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold font-urdu transition border border-rose-500/30 cursor-pointer"
              title="لاگ آؤٹ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">لاگ آؤٹ</span>
            </button>
          </div>
        </div>

        {/* 3 Core Responsibilities Tabs Header */}
        <div className="max-w-5xl mx-auto px-4 flex border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold font-urdu flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'sales'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>1. روزانہ سیلز (Daily Sales)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold font-urdu flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'khata'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>2. گاہک کھاتہ (Customer Khata)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wasooli')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold font-urdu flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'wasooli'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>3. رقم وصولی (Wasooli)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5">
        {/* =================================================================== */}
        {/* TAB 1: DAILY SALES (روزانہ سیلز)                                     */}
        {/* =================================================================== */}
        {activeTab === 'sales' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Today Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-urdu block">
                  آج کی فروخت (Today Sales)
                </span>
                <p className="text-lg sm:text-xl font-black font-mono text-amber-700 mt-1">
                  Rs. {todaySalesTotal.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400">{todaySalesList.length} بلز</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-urdu block">
                  کل بیچا گیا وزن (Total Sold)
                </span>
                <p className="text-lg sm:text-xl font-black font-mono text-emerald-700 mt-1">
                  {todaySalesWeight} KG
                </p>
                <span className="text-[10px] text-emerald-600 font-urdu font-bold">آج کا میزان</span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-urdu block">
                  آج کل وصولی (Today Cash)
                </span>
                <p className="text-lg sm:text-xl font-black font-mono text-blue-700 mt-1">
                  Rs. {todayWasooliTotal.toLocaleString()}
                </p>
                <span className="text-[10px] text-blue-600 font-urdu font-bold">{todayPaymentsList.length} وصولیاں</span>
              </div>
            </div>

            {/* Fast Daily Sales Form with Multiple Items */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 font-urdu flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-amber-600" />
                    <span>فاسٹ کاؤنٹر سیل بل (Fast Sales Counter)</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-urdu mt-0.5">
                    کیٹیگری اور وزن درج کر کے فوری نقد یا ادھار بل بنائیں
                  </p>
                </div>
                <input
                  type="date"
                  value={posSaleDate}
                  onChange={e => setPosSaleDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold"
                />
              </div>

              <form onSubmit={handleSavePosSale} className="space-y-4">
                {/* Customer Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-urdu mb-1">
                    گاہک منتخب کریں (نقد کسٹمر کے لیے خالی چھوڑیں):
                  </label>
                  <select
                    value={posCustomerId}
                    onChange={e => setPosCustomerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 font-urdu focus:outline-none focus:border-amber-600"
                  >
                    <option value="">-- نقد خریدار (Direct Counter Cash Sale) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.shop_name ? `(${c.shop_name})` : ''} — سابقہ بقایا: Rs.{c.current_balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multiple Items Box */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 font-urdu">
                      چکن اقسام و وزن (Items):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddPosRow}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold font-urdu transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ مزید آئٹم</span>
                    </button>
                  </div>

                  {posItems.map((item, idx) => {
                    const rowTotal = Math.round((Number(item.weightKg) || 0) * (Number(item.ratePerKg) || 0));

                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>آئٹم #{idx + 1}</span>
                          {posItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePosRow(item.id)}
                              className="text-rose-600 hover:text-rose-700 font-urdu"
                            >
                              حذف
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                          {/* Category */}
                          <div className="sm:col-span-5">
                            <select
                              value={item.categoryId}
                              onChange={e => handlePosCategoryChange(item.id, e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 font-urdu"
                            >
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.urdu_name} ({c.name})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Weight */}
                          <div className="sm:col-span-3">
                            <div className="relative">
                              <input
                                type="number"
                                min="0.05"
                                step="0.01"
                                required
                                placeholder="وزن (KG)"
                                value={item.weightKg}
                                onChange={e => handlePosWeightChange(item.id, e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-xl pl-2.5 pr-8 py-2 text-sm font-mono font-black"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">
                                KG
                              </span>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {[0.5, 1, 2].map(addKg => (
                                <button
                                  key={addKg}
                                  type="button"
                                  onClick={() => handlePosQuickWeight(item.id, addKg)}
                                  className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-mono rounded font-bold"
                                >
                                  +{addKg}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Rate */}
                          <div className="sm:col-span-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              placeholder="ریٹ"
                              value={item.ratePerKg}
                              onChange={e => handlePosRateChange(item.id, e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-mono font-bold"
                            />
                          </div>

                          {/* Total */}
                          <div className="sm:col-span-2 text-left sm:text-right font-mono font-black text-amber-800 text-sm">
                            Rs. {rowTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grand Total & Payment Mode */}
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-600 font-urdu">کل وزن: <strong>{posTotalWeightKg} KG</strong></span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="text-xs text-slate-600 font-urdu">کل بل: <strong className="text-base text-amber-900 font-mono">Rs. {posGrandTotal.toLocaleString()}</strong></span>
                  </div>

                  <div>
                    {posCustomerId ? (
                      <span className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold font-urdu shadow-2xs">
                        📝 مکمل ادھار (Full Credit)
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold font-urdu shadow-2xs">
                        💵 نقد بل (Cash Sale)
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Limit Warning Banner */}
                {posTotalWeightKg > freshStockKg && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-urdu shadow-2xs">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <strong className="block font-bold">غلطی: چکن کا وزن موجودہ دستیاب اسٹاک سے زیادہ ہے!</strong>
                      <span>
                        آپ نے <strong>{posTotalWeightKg} KG</strong> درج کیا ہے جبکہ دستیاب اسٹاک صرف <strong>{freshStockKg} KG</strong> ہے۔ آپ اسٹاک سے زیادہ وزن فروخت نہیں کر سکتے۔
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={posSaving || posGrandTotal <= 0 || posTotalWeightKg > freshStockKg || freshStockKg <= 0}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white font-bold text-sm font-urdu rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {posTotalWeightKg > freshStockKg
                      ? `اسٹاک ناکافی ہے (دستیاب: ${freshStockKg} KG)`
                      : posSaving
                      ? 'بل محفوظ ہو رہا ہے...'
                      : 'بل محفوظ کریں اور رسید پرنٹ کریں'}
                  </span>
                </button>
              </form>
            </div>

            {/* Today's Sales Log */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-900 font-urdu mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>آج کی کٹی ہوئی رسیدیں ({todaySalesList.length})</span>
              </h3>

              {todaySalesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-urdu">
                  آج ابھی تک کوئی سیل ریکارڈ نہیں ہوئی۔
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {todaySalesList.map(sale => (
                    <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sale.customer_name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{sale.invoice_no}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            sale.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {sale.payment_method === 'cash' ? 'نقد' : 'ادھار'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {sale.total_weight_kg} KG • {sale.items.map(i => i.product_name).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-black text-slate-900">
                          Rs. {sale.total_amount.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReceiptModalSale(sale)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                          title="رسید دیکھیں"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: CUSTOMER KHATA (گاہک کھاتہ)                                   */}
        {/* =================================================================== */}
        {activeTab === 'khata' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={khataSearch}
                  onChange={e => setKhataSearch(e.target.value)}
                  placeholder="گاہک تلاش کریں (نام یا فون نمبر)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-urdu focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setKhataEntryCustomer(null);
                  setKhataEntryModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-bold text-xs font-urdu rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ نیا کھاتہ بل درج کریں</span>
              </button>
            </div>

            {/* Customers Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredKhataCustomers.map(cust => (
                <div
                  key={cust.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500 font-mono">
                        {cust.phone}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        cust.current_balance > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {cust.current_balance > 0 ? 'بقایا واجب الادا' : 'کلیئر'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-base font-urdu">
                      {cust.name}
                    </h4>
                    {cust.shop_name && (
                      <p className="text-xs text-slate-500 font-urdu">{cust.shop_name}</p>
                    )}

                    <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-urdu text-slate-600">باقی کھاتہ بیلنس:</span>
                      <span className="text-base font-mono font-black text-rose-700">
                        Rs. {cust.current_balance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setKhataEntryCustomer(cust);
                        setKhataEntryModalOpen(true);
                      }}
                      className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold font-urdu transition border border-amber-200 flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ نیا سودا</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLedgerModalCustomer(cust)}
                      className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold font-urdu transition border border-purple-200 flex items-center justify-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>کھاتہ لیجر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWasooliCustomer(cust);
                        setWasooliModalOpen(true);
                      }}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition border border-emerald-200"
                      title="رقم وصول کریں"
                    >
                      <Banknote className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredKhataCustomers.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-xs font-urdu bg-white rounded-3xl border border-slate-200">
                کوئی گاہک کھاتہ دار نہیں ملا۔
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: WASOOLI (رقم وصولی)                                           */}
        {/* =================================================================== */}
        {activeTab === 'wasooli' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900 font-urdu flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span>رقم وصولی رجسٹر (Payment Wasooli)</span>
                </h2>
                <p className="text-xs text-slate-500 font-urdu mt-0.5">
                  گاہکوں سے موصول شدہ کیش یا آن لائن رقوم ریکارڈ کریں — کھاتہ خودکار کم ہو جائے گا
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWasooliCustomer(null);
                  setWasooliModalOpen(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs font-urdu rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ نئی رقم وصولی درج کریں</span>
              </button>
            </div>

            {/* Today Wasooli List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-900 font-urdu mb-3">
                آج کی موصول شدہ وصولیاں ({todayPaymentsList.length})
              </h3>

              {todayPaymentsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-urdu">
                  آج ابھی تک کوئی وصولی درج نہیں ہوئی۔ نئی وصولی کے لیے اوپر بٹن دبائیں۔
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {todayPaymentsList.map(pay => (
                    <div key={pay.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{pay.customer_name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{pay.voucher_no}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-bold uppercase font-mono">
                            {pay.payment_method}
                          </span>
                        </div>
                        {pay.notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 font-urdu">{pay.notes}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-700 text-sm block">
                          Rs. {pay.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          باقی: Rs. {pay.new_balance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Shared Modals */}
      <CustomerKhataEntryModal
        isOpen={khataEntryModalOpen}
        customer={khataEntryCustomer}
        allCustomers={customers}
        categories={categories}
        availableStock={freshStockKg}
        onClose={() => setKhataEntryModalOpen(false)}
        onSuccess={newSale => {
          loadData();
          setReceiptModalSale(newSale);
        }}
      />

      <CustomerLedgerModal
        customer={ledgerModalCustomer}
        onClose={() => setLedgerModalCustomer(null)}
        onRecordPayment={c => {
          setWasooliCustomer(c);
          setWasooliModalOpen(true);
        }}
        onNewSale={c => {
          setKhataEntryCustomer(c);
          setKhataEntryModalOpen(true);
        }}
        onCustomerUpdated={loadData}
      />

      {receiptModalSale && (
        <SaleReceiptModal
          sale={receiptModalSale}
          onClose={() => setReceiptModalSale(null)}
        />
      )}

      {wasooliModalOpen && (
        <PaymentModal
          isOpen={wasooliModalOpen}
          initialCustomer={wasooliCustomer}
          onClose={() => setWasooliModalOpen(false)}
          onSuccess={() => {
            loadData();
            setWasooliModalOpen(false);
          }}
        />
      )}

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 flex items-center justify-around py-2 px-2 shadow-2xl safe-area-bottom">
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition ${
            activeTab === 'sales'
              ? 'text-amber-400 font-bold bg-amber-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[11px] font-urdu font-black">1. کاؤنٹر سیل</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('khata')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition ${
            activeTab === 'khata'
              ? 'text-purple-400 font-bold bg-purple-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px] font-urdu font-black">2. گاہک کھاتہ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wasooli')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition ${
            activeTab === 'wasooli'
              ? 'text-emerald-400 font-bold bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Banknote className="w-5 h-5" />
          <span className="text-[11px] font-urdu font-black">3. رقم وصولی</span>
        </button>
      </nav>
    </div>
  );
};
