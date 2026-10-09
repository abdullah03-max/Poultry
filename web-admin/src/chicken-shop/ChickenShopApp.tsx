// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Standalone Portal
// Fully Isolated from Poultry Waste Management
// Inspired by Digi Khata: Clean, Professional, Simple & Powerful
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChickenProduct,
  ChickenCustomer,
  ChickenSale,
  ChickenPayment,
  ChickenStockLog,
} from './types';
import { chickenShopApi, DEFAULT_CHICKEN_PRODUCTS } from './api';
import { SaleReceiptModal } from './SaleReceiptModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { PaymentModal } from './PaymentModal';
import { StockModal } from './StockModal';
import { CustomerEditModal } from './CustomerEditModal';
import { ProductEditModal } from './ProductEditModal';
import { formatDate } from '../utils/formatters';
import {
  Store,
  ShoppingCart,
  Users,
  Package,
  Layers,
  History,
  TrendingUp,
  Plus,
  Search,
  Printer,
  Share2,
  Trash2,
  Edit2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Banknote,
  Receipt,
  Download,
  Loader2,
  RefreshCw,
  Phone,
  Tag,
  Scale,
} from 'lucide-react';

interface ChickenShopAppProps {
  onBackToWaste?: () => void;
  standalone?: boolean;
}

type TabType = 'dashboard' | 'pos' | 'customers' | 'products' | 'stock' | 'sales_history';

export const ChickenShopApp: React.FC<ChickenShopAppProps> = ({ onBackToWaste, standalone = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  // Core Data
  const [products, setProducts] = useState<ChickenProduct[]>([]);
  const [customers, setCustomers] = useState<ChickenCustomer[]>([]);
  const [sales, setSales] = useState<ChickenSale[]>([]);
  const [payments, setPayments] = useState<ChickenPayment[]>([]);
  const [stockLogs, setStockLogs] = useState<ChickenStockLog[]>([]);

  // Modals State
  const [receiptModalSale, setReceiptModalSale] = useState<ChickenSale | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<ChickenCustomer | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [paymentCustomer, setPaymentCustomer] = useState<ChickenCustomer | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState<boolean>(false);
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<ChickenCustomer | null>(null);
  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ChickenProduct | null>(null);

  // POS State
  const [posCustomerType, setPosCustomerType] = useState<'walkin' | 'registered'>('walkin');
  const [posCustomerId, setPosCustomerId] = useState<string>('');
  const [posWalkinName, setPosWalkinName] = useState<string>('نقد خریدار (Walk-in)');
  const [posWalkinPhone, setPosWalkinPhone] = useState<string>('');
  const [posItems, setPosItems] = useState<{
    product_id: string;
    product_name: string;
    weight_kg: string;
    rate_per_kg: string;
  }[]>([
    { product_id: 'prod-gosht', product_name: 'Gosht (Chicken Meat)', weight_kg: '', rate_per_kg: '420' },
  ]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'credit' | 'partial'>('cash');
  const [posReceivedAmount, setPosReceivedAmount] = useState<string>('');
  const [posDiscount, setPosDiscount] = useState<string>('0');
  const [posNotes, setPosNotes] = useState<string>('');
  const [posSaleDate, setPosSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [posSaving, setPosSaving] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [salesDateFilter, setSalesDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'due' | 'clear'>('all');

  // Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' PKT'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [pList, cList, sList, payList, logs] = await Promise.all([
        chickenShopApi.getProducts(),
        chickenShopApi.getCustomers(),
        chickenShopApi.getSales(),
        chickenShopApi.getPayments(),
        chickenShopApi.getStockLogs(),
      ]);
      setProducts(pList);
      setCustomers(cList);
      setSales(sList);
      setPayments(payList);
      setStockLogs(logs);

      // Set default product in POS if available
      if (pList.length > 0 && posItems.length === 1 && !posItems[0].weight_kg) {
        const defaultP = pList.find(p => p.id === 'prod-gosht') || pList[0];
        setPosItems([
          {
            product_id: defaultP.id,
            product_name: defaultP.name,
            weight_kg: '',
            rate_per_kg: String(defaultP.rate_per_kg),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load chicken shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ---------------------------------------------------------------------------
  // KPI Calculations
  // ---------------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySalesList = useMemo(() => sales.filter(s => s.sale_date === todayStr), [sales, todayStr]);

  const kpis = useMemo(() => {
    const todaySales = todaySalesList.reduce((s, r) => s + r.total_amount, 0);
    const todayCash = todaySalesList.reduce((s, r) => s + r.received_amount, 0);
    const todayCredit = todaySalesList.reduce((s, r) => s + r.remaining_due, 0);
    const todayWeight = todaySalesList.reduce((s, r) => s + r.total_weight_kg, 0);
    const marketDue = customers.reduce((s, c) => s + (c.current_balance || 0), 0);
    const totalStock = products.reduce((s, p) => s + (p.stock_kg || 0), 0);
    const lowStockCount = products.filter(p => p.stock_kg <= p.min_stock_alert).length;

    return {
      todaySales,
      todayCash,
      todayCredit,
      todayWeight: Number(todayWeight.toFixed(2)),
      marketDue,
      totalStock: Number(totalStock.toFixed(2)),
      lowStockCount,
      todayBillsCount: todaySalesList.length,
    };
  }, [todaySalesList, customers, products]);

  // ---------------------------------------------------------------------------
  // POS Calculations
  // ---------------------------------------------------------------------------
  const posSubtotal = useMemo(() => {
    return posItems.reduce((sum, item) => {
      const w = Number(item.weight_kg) || 0;
      const r = Number(item.rate_per_kg) || 0;
      return sum + Math.round(w * r);
    }, 0);
  }, [posItems]);

  const posTotalWeight = useMemo(() => {
    return Number(posItems.reduce((sum, item) => sum + (Number(item.weight_kg) || 0), 0).toFixed(2));
  }, [posItems]);

  const posFinalTotal = useMemo(() => {
    const disc = Number(posDiscount) || 0;
    return Math.max(0, posSubtotal - disc);
  }, [posSubtotal, posDiscount]);

  const posSelectedCustomer = useMemo(() => {
    if (posCustomerType === 'registered' && posCustomerId) {
      return customers.find(c => c.id === posCustomerId) || null;
    }
    return null;
  }, [posCustomerType, posCustomerId, customers]);

  // Auto-fill received amount if cash
  useEffect(() => {
    if (posPaymentMethod === 'cash') {
      setPosReceivedAmount(String(posFinalTotal));
    } else if (posPaymentMethod === 'credit') {
      setPosReceivedAmount('0');
    }
  }, [posPaymentMethod, posFinalTotal]);

  const posRemainingDue = useMemo(() => {
    const rec = Number(posReceivedAmount) || 0;
    return Math.max(0, posFinalTotal - rec);
  }, [posFinalTotal, posReceivedAmount]);

  // Add / Remove POS row
  const handleAddPosRow = () => {
    const p = products[0] || DEFAULT_CHICKEN_PRODUCTS[0];
    setPosItems(prev => [
      ...prev,
      {
        product_id: p.id,
        product_name: p.name,
        weight_kg: '',
        rate_per_kg: String(p.rate_per_kg),
      },
    ]);
  };

  const handleRemovePosRow = (index: number) => {
    if (posItems.length <= 1) return;
    setPosItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePosProductChange = (index: number, productId: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    setPosItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: p.id,
        product_name: p.name,
        rate_per_kg: String(p.rate_per_kg),
      };
      return copy;
    });
  };

  const handlePosRowValueChange = (index: number, field: 'weight_kg' | 'rate_per_kg', val: string) => {
    setPosItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Submit POS Sale
  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (posItems.some(i => !i.weight_kg || Number(i.weight_kg) <= 0)) {
      alert('براہ کرم تمام آئٹمز کا درست وزن (KG) درج کریں');
      return;
    }
    if (posCustomerType === 'registered' && !posCustomerId) {
      alert('براہ کرم رجسٹرڈ گاہک منتخب کریں یا واک اِن کسٹمر کا انتخاب کریں');
      return;
    }

    const customerName = posCustomerType === 'registered' && posSelectedCustomer
      ? posSelectedCustomer.name
      : (posWalkinName.trim() || 'نقد گاہک');
    const customerPhone = posCustomerType === 'registered' && posSelectedCustomer
      ? posSelectedCustomer.phone
      : (posWalkinPhone.trim() || null);

    try {
      setPosSaving(true);
      const newSale = await chickenShopApi.createSale({
        customer_id: posCustomerType === 'registered' ? posCustomerId : null,
        customer_name: customerName,
        phone: customerPhone,
        items: posItems.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          weight_kg: Number(i.weight_kg),
          rate_per_kg: Number(i.rate_per_kg),
        })),
        payment_method: posPaymentMethod,
        received_amount: Number(posReceivedAmount) || 0,
        discount: Number(posDiscount) || 0,
        notes: posNotes || undefined,
        sale_date: posSaleDate,
      });

      // Reload data
      await loadAllData();

      // Reset POS inputs
      const defaultP = products[0] || DEFAULT_CHICKEN_PRODUCTS[0];
      setPosItems([
        {
          product_id: defaultP.id,
          product_name: defaultP.name,
          weight_kg: '',
          rate_per_kg: String(defaultP.rate_per_kg),
        },
      ]);
      setPosWalkinName('نقد خریدار (Walk-in)');
      setPosWalkinPhone('');
      setPosPaymentMethod('cash');
      setPosReceivedAmount('');
      setPosDiscount('0');
      setPosNotes('');

      // Open receipt modal for printing
      setReceiptModalSale(newSale);
    } catch (err: any) {
      alert(`سیل محفوظ کرنے میں مسئلہ: ${err.message || 'Error saving sale'}`);
    } finally {
      setPosSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered Customers
  // ---------------------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.shop_name && c.shop_name.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (customerFilter === 'due') return c.current_balance > 0;
      if (customerFilter === 'clear') return c.current_balance === 0;
      return true;
    });
  }, [customers, searchQuery, customerFilter]);

  // ---------------------------------------------------------------------------
  // Filtered Sales History
  // ---------------------------------------------------------------------------
  const filteredSales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    return sales.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.invoice_no.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q));

      if (!matchSearch) return false;

      if (salesDateFilter === 'today') return s.sale_date === today;
      if (salesDateFilter === 'week') return s.sale_date >= sevenDaysAgo;
      if (salesDateFilter === 'month') return s.sale_date >= thirtyDaysAgo;
      return true;
    });
  }, [sales, searchQuery, salesDateFilter]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* ===================================================================== */}
      {/* TOP HEADER / APP BAR                                                 */}
      {/* ===================================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            {/* Logo & Portal Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white text-2xl shadow-sm shadow-amber-200">
                🐔
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight font-urdu">
                    شان چکن شاپ و ڈیجیٹل کھاتہ
                  </h1>
                  <span className="hidden sm:inline px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                    Digi Khata POS
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Dedicated Chicken Meat Sales, Inventory & Customer Accounts
                </p>
              </div>
            </div>

            {/* Quick Actions & Switch */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Clock */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-mono font-medium border border-slate-200/80">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentTime}</span>
              </div>

              {/* Quick Sale Button */}
              <button
                onClick={() => setActiveTab('pos')}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>+ نیا بل (New Sale)</span>
              </button>

              {/* Quick Payment Button */}
              <button
                onClick={() => {
                  setPaymentCustomer(null);
                  setPaymentModalOpen(true);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
              >
                <Banknote className="w-4 h-4" />
                <span>+ رقم وصولی (Receive)</span>
              </button>

              {/* Back to Waste Management Button */}
              {onBackToWaste ? (
                <button
                  onClick={onBackToWaste}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  title="Return to Poultry Waste Management System"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-300" />
                  <span className="hidden md:inline">ویسٹ سسٹم پر واپس</span>
                </button>
              ) : (
                <a
                  href="/"
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  title="Open Waste Management"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-300" />
                  <span className="hidden md:inline">ویسٹ سسٹم</span>
                </a>
              )}
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>ڈیش بورڈ (Overview)</span>
            </button>

            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                activeTab === 'pos'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>نیا بل / پی او ایس (POS Sale)</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                activeTab === 'customers'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>گاہک و ڈیجیٹل کھاتہ (Khata Ledger)</span>
              {kpis.marketDue > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-mono">
                  Rs.{Math.round(kpis.marketDue / 1000)}k
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                activeTab === 'products'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>مصنوعات و ریٹ لسٹ (Products & Rates)</span>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                activeTab === 'stock'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>اسٹاک و انوینٹری (Stock Inventory)</span>
              {kpis.lowStockCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] rounded-full">
                  {kpis.lowStockCount} کم
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('sales_history')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                activeTab === 'sales_history'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سیلز رجسٹر و ریکارڈز (Sales History)</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN CONTENT AREA                                                     */}
      {/* ===================================================================== */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <p className="text-sm font-medium">چکن شاپ ڈیٹا لوڈ ہو رہا ہے...</p>
          </div>
        ) : (
          <>
            {/* =============================================================== */}
            {/* TAB 1: DASHBOARD                                                */}
            {/* =============================================================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                {/* 5 Master KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* Today Sales */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        آج کی کل فروخت
                      </span>
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xl font-black text-amber-700 font-mono tracking-tight">
                        Rs. {kpis.todaySales.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {kpis.todayBillsCount} بلز • {kpis.todayWeight} KG فروخت
                      </p>
                    </div>
                  </div>

                  {/* Today Cash */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        آج نقد وصولی
                      </span>
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                        <Banknote className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xl font-black text-emerald-700 font-mono tracking-tight">
                        Rs. {kpis.todayCash.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">کیش کاؤنٹر وصولی</p>
                    </div>
                  </div>

                  {/* Today Credit */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                        آج ادھار فروخت
                      </span>
                      <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xl font-black text-purple-700 font-mono tracking-tight">
                        Rs. {kpis.todayCredit.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-purple-600 mt-0.5">کھاتہ داروں پر چڑھا ادھار</p>
                    </div>
                  </div>

                  {/* Market Khata Receivables */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                        مارکیٹ کل کھاتہ
                      </span>
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xl font-black text-rose-700 font-mono tracking-tight">
                        Rs. {kpis.marketDue.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-rose-600 mt-0.5">تمام گاہکوں سے کل وصول طلب</p>
                    </div>
                  </div>

                  {/* Total In-Stock Meat */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                        موجودہ گوشت اسٹاک
                      </span>
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                        <Scale className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xl font-black text-blue-700 font-mono tracking-tight">
                        {kpis.totalStock} <span className="text-xs font-sans text-slate-500">KG</span>
                      </p>
                      <p className="text-[10px] text-blue-600 mt-0.5">
                        {products.length} کٹس • {kpis.lowStockCount > 0 ? `${kpis.lowStockCount} کم اسٹاک` : 'اسٹاک مناسب'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stock Level Quick Badges */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-sm text-slate-900 font-urdu flex items-center gap-2">
                      <span>🍗 چکن کٹس اور موجودہ اسٹاک کی صورتحال (Meat Cuts Stock Levels)</span>
                    </h3>
                    <button
                      onClick={() => setStockModalOpen(true)}
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 transition"
                    >
                      + نیا اسٹاک شامل کریں
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    {products.map(p => {
                      const isLow = p.stock_kg <= p.min_stock_alert;
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-2xl border text-center transition ${
                            isLow
                              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                              : 'bg-slate-50 border-slate-200/80 text-slate-900'
                          }`}
                        >
                          <span className="text-[11px] font-bold block truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-500 block font-urdu truncate">{p.urdu_name}</span>
                          <p className="text-base font-black font-mono mt-1">
                            {p.stock_kg} <span className="text-[10px] font-normal">KG</span>
                          </p>
                          <span className="text-[10px] font-semibold text-amber-700 block">
                            Rs. {p.rate_per_kg}/kg
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Today's Recent Sales & Top Debtors Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left 2 Cols: Today's Recent Sales */}
                  <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-extrabold text-sm text-slate-900 font-urdu flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-600" />
                        <span>آج کی تازہ فروخت (Today's Sales)</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('sales_history')}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 transition"
                      >
                        مکمل ہسٹری دیکھیں →
                      </button>
                    </div>

                    {todaySalesList.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        آج ابھی تک کوئی سیل درج نہیں ہوئی۔ نیا بل بنانے کے لیے اوپر بٹن دبائیں۔
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {todaySalesList.slice(0, 8).map(sale => (
                          <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{sale.customer_name}</span>
                                <span className="font-mono text-[10px] text-slate-400">{sale.invoice_no}</span>
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                  sale.payment_method === 'cash'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sale.payment_method === 'credit'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {sale.payment_method === 'cash' ? 'نقد' : sale.payment_method === 'credit' ? 'ادھار' : 'جزوی'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {sale.total_weight_kg} KG • {sale.items.map(i => i.product_name).join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-mono font-black text-slate-900 text-sm block">
                                  Rs. {sale.total_amount.toLocaleString()}
                                </span>
                                {sale.remaining_due > 0 && (
                                  <span className="font-mono text-[10px] text-rose-600 font-bold block">
                                    بقایا: Rs. {sale.remaining_due.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setReceiptModalSale(sale)}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                                title="رسید دیکھیں و پرنٹ کریں"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right 1 Col: Top Khata Debtors */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-extrabold text-sm text-slate-900 font-urdu flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-rose-600" />
                          <span>نمایاں ادھار کھاتہ دار (Top Receivables)</span>
                        </h3>
                        <button
                          onClick={() => setActiveTab('customers')}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 transition"
                        >
                          تمام →
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {customers
                          .filter(c => c.current_balance > 0)
                          .sort((a, b) => b.current_balance - a.current_balance)
                          .slice(0, 6)
                          .map(c => (
                            <div
                              key={c.id}
                              onClick={() => setLedgerCustomer(c)}
                              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between cursor-pointer transition text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">{c.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{c.phone}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-black text-rose-700 text-sm block">
                                  Rs. {c.current_balance.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-slate-400">کھاتہ دیکھیں</span>
                              </div>
                            </div>
                          ))}
                        {customers.filter(c => c.current_balance > 0).length === 0 && (
                          <div className="py-8 text-center text-slate-400 text-xs">
                            ماشاءاللہ! تمام گاہکوں کا کھاتہ کلیئر ہے۔
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => {
                          setPaymentCustomer(null);
                          setPaymentModalOpen(true);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition font-urdu"
                      >
                        + وصولی ریکارڈ کریں
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 2: NEW SALE (POS)                                           */}
            {/* =============================================================== */}
            {activeTab === 'pos' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 max-w-4xl mx-auto animate-fadeIn">
                <div className="border-b border-slate-100 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 font-urdu flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-amber-600" />
                      <span>نیا بل فروخت و کھاتہ اندراج (New Chicken Meat Sale)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      چکن کٹس منتخب کریں، وزن درج کریں، اور نقد یا ادھار کھاتہ بل بنائیں
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={posSaleDate}
                      onChange={e => setPosSaleDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-medium"
                    />
                  </div>
                </div>

                <form onSubmit={handleSaveSale} className="space-y-6">
                  {/* Customer Type Picker */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-700 block">
                      گاہک کی قسم منتخب کریں (Customer Type) *
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPosCustomerType('walkin')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                          posCustomerType === 'walkin'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🚶 نقد خریدار (Walk-in Customer)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPosCustomerType('registered');
                          if (!posCustomerId && customers.length > 0) {
                            setPosCustomerId(customers[0].id);
                          }
                        }}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                          posCustomerType === 'registered'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        📖 کھاتہ دار گاہک (Registered Khata)
                      </button>
                    </div>

                    {posCustomerType === 'walkin' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">خریدار کا نام</label>
                          <input
                            type="text"
                            value={posWalkinName}
                            onChange={e => setPosWalkinName(e.target.value)}
                            placeholder="نقد خریدار"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-600"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">فون نمبر (اختیاری)</label>
                          <input
                            type="text"
                            value={posWalkinPhone}
                            onChange={e => setPosWalkinPhone(e.target.value)}
                            placeholder="0300-1234567"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-600"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={posCustomerId}
                            onChange={e => setPosCustomerId(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600"
                            required
                          >
                            <option value="">-- گاہک منتخب کریں --</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.shop_name ? `(${c.shop_name})` : ''} — سابقہ بقایا: Rs.{c.current_balance.toLocaleString()}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(null);
                              setCustomerModalOpen(true);
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition shrink-0"
                          >
                            + نیا گاہک
                          </button>
                        </div>
                        {posSelectedCustomer && (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">
                              سابقہ کھاتہ بقایا (Previous Khata):
                            </span>
                            <span className="font-mono font-bold text-rose-700">
                              Rs. {posSelectedCustomer.current_balance.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Multi-Product Meat Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 font-urdu">
                        🍗 گوشت کی اشیاء و وزن (Chicken Meat Cuts & Weights)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddPosRow}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>مزید آئٹم شامل کریں (Add Cut)</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {posItems.map((item, index) => {
                        const prod = products.find(p => p.id === item.product_id);
                        const weight = Number(item.weight_kg) || 0;
                        const rate = Number(item.rate_per_kg) || 0;
                        const lineTotal = Math.round(weight * rate);

                        return (
                          <div key={index} className="p-3 bg-white flex flex-col sm:flex-row items-center gap-3">
                            {/* Product Selection */}
                            <div className="w-full sm:flex-1">
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                پروڈکٹ / چکن کٹ
                              </label>
                              <select
                                value={item.product_id}
                                onChange={e => handlePosProductChange(index, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.urdu_name}) — اسٹاک: {p.stock_kg} kg
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Weight KG */}
                            <div className="w-full sm:w-36">
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                وزن کلوگرام (KG) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0.05"
                                  step="0.05"
                                  required
                                  value={item.weight_kg}
                                  onChange={e => handlePosRowValueChange(index, 'weight_kg', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                  KG
                                </span>
                              </div>
                            </div>

                            {/* Rate / KG */}
                            <div className="w-full sm:w-32">
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                ریٹ فی کلو (PKR)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  required
                                  value={item.rate_per_kg}
                                  onChange={e => handlePosRowValueChange(index, 'rate_per_kg', e.target.value)}
                                  placeholder="450"
                                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                                />
                              </div>
                            </div>

                            {/* Line Total */}
                            <div className="w-full sm:w-32 text-right">
                              <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                ٹوٹل رقم
                              </span>
                              <div className="py-2 text-xs font-mono font-black text-amber-700">
                                Rs. {lineTotal.toLocaleString()}
                              </div>
                            </div>

                            {/* Remove button */}
                            {posItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePosRow(index)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition self-end sm:self-center"
                                title="آئٹم حذف کریں"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary & Payment Controls */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                    {/* Weight & Subtotal summary */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-xs text-slate-500">کل وزن (Total Weight):</span>
                        <strong className="text-sm font-mono font-black text-slate-900 ml-2">
                          {posTotalWeight} KG
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">بل کی کل رقم (Invoice Total):</span>
                        <strong className="text-lg font-mono font-black text-amber-700 ml-2">
                          Rs. {posFinalTotal.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    {/* Payment Mode Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        ادائیگی کا طریقہ (Payment Method) *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPosPaymentMethod('cash')}
                          className={`py-2 text-xs font-bold rounded-xl transition ${
                            posPaymentMethod === 'cash'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          💵 مکمل نقد (Full Cash)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosPaymentMethod('credit')}
                          className={`py-2 text-xs font-bold rounded-xl transition ${
                            posPaymentMethod === 'credit'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          📝 مکمل ادھار (Credit Khata)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosPaymentMethod('partial')}
                          className={`py-2 text-xs font-bold rounded-xl transition ${
                            posPaymentMethod === 'partial'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          ⚖️ کچھ نقد / ادھار (Partial)
                        </button>
                      </div>
                    </div>

                    {/* Received and Remaining */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          وصول شدہ رقم (Amount Paid / Received)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            Rs.
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={posReceivedAmount}
                            onChange={e => setPosReceivedAmount(e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          بقایا رقم (Remaining Due on this Bill)
                        </label>
                        <div className="py-2 px-3 bg-white border border-slate-200 rounded-xl font-mono font-black text-sm text-rose-700">
                          Rs. {posRemainingDue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Customer Net Khata Preview */}
                    {posSelectedCustomer && (
                      <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200/90 flex items-center justify-between text-xs">
                        <span className="text-amber-900 font-semibold font-urdu">
                          اس بل کے بعد گاہک کا نیا مجموعی کھاتہ بقایا ہوگا:
                        </span>
                        <span className="font-mono font-black text-rose-700 text-sm">
                          Rs. {(posSelectedCustomer.current_balance + posRemainingDue).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">نوٹس (Optional)</label>
                      <input
                        type="text"
                        value={posNotes}
                        onChange={e => setPosNotes(e.target.value)}
                        placeholder="کوئی خاص تفصیل یا ہدایات..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={posSaving}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-sm rounded-2xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 font-urdu disabled:opacity-60"
                    >
                      {posSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Printer className="w-5 h-5" />
                      )}
                      <span>بل محفوظ کریں اور رسید پرنٹ کریں (Save & Print Invoice)</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: CUSTOMERS & DIGITAL KHATA                                */}
            {/* =============================================================== */}
            {activeTab === 'customers' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Header Controls */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight">
                      گاہک و ڈیجیٹل کھاتہ بک (Customers Digital Khata)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      کل گاہک: {customers.length} • مجموعی مارکیٹ بقایا: Rs. {kpis.marketDue.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="تلاش نام یا فون..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    {/* Filter buttons */}
                    <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                      <button
                        onClick={() => setCustomerFilter('all')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          customerFilter === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        تمام ({customers.length})
                      </button>
                      <button
                        onClick={() => setCustomerFilter('due')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          customerFilter === 'due' ? 'bg-white shadow-2xs text-rose-700' : 'text-slate-600'
                        }`}
                      >
                        ادھار والے ({customers.filter(c => c.current_balance > 0).length})
                      </button>
                    </div>

                    {/* Add Customer Button */}
                    <button
                      onClick={() => {
                        setEditingCustomer(null);
                        setCustomerModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ نیا گاہک شامل کریں</span>
                    </button>
                  </div>
                </div>

                {/* Customers Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCustomers.map(cust => (
                    <div
                      key={cust.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Name & Balance Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-urdu">
                              {cust.name}
                            </h3>
                            {cust.shop_name && (
                              <p className="text-xs text-slate-500 font-medium">{cust.shop_name}</p>
                            )}
                          </div>
                          <div className={`px-3 py-1 rounded-xl text-right ${
                            cust.current_balance > 0
                              ? 'bg-rose-50 border border-rose-200 text-rose-700'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          }`}>
                            <span className="text-[10px] font-bold block uppercase">باقی کھاتہ</span>
                            <span className="text-sm font-black font-mono">
                              Rs. {cust.current_balance.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{cust.phone}</span>
                          </div>
                          {cust.address && (
                            <p className="text-slate-500 truncate">{cust.address}</p>
                          )}
                        </div>

                        {/* Lifetime Stats */}
                        <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-urdu">کل خریداری:</span>
                            <span className="font-mono font-bold text-slate-800">
                              Rs. {cust.total_purchases.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-urdu">کل ادا شدہ:</span>
                            <span className="font-mono font-bold text-emerald-700">
                              Rs. {cust.total_payments.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => setLedgerCustomer(cust)}
                          className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 font-urdu"
                        >
                          <span>📖 کھاتہ لیجر</span>
                        </button>
                        <button
                          onClick={() => {
                            setPaymentCustomer(cust);
                            setPaymentModalOpen(true);
                          }}
                          className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 font-urdu"
                          title="رقم وصولی درج کریں"
                        >
                          <span>💵 وصولی</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingCustomer(cust);
                            setCustomerModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition"
                          title="گاہک ایڈٹ کریں"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 text-xs">
                      کوئی گاہک نہیں ملا۔ نیا گاہک شامل کرنے کے لیے اوپر بٹن دبائیں۔
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: PRODUCTS & RATES                                         */}
            {/* =============================================================== */}
            {activeTab === 'products' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight">
                      چکن مصنوعات و ریٹ لسٹ (Chicken Meat Products & Daily Rates)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      یہاں سے آپ Drumsticks, Chicken Bongs, Legs, Breast, Tikka, Boles, Thai, Gosht کے روزانہ ریٹ تبدیل کر سکتے ہیں
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ نئی پروڈکٹ شامل کریں</span>
                  </button>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 text-right">پروڈکٹ نام (Name)</th>
                        <th className="py-3 px-3 text-right">اردو نام</th>
                        <th className="py-3 px-3 text-center">کیٹیگری</th>
                        <th className="py-3 px-3 text-center">فروخت ریٹ فی کلو</th>
                        <th className="py-3 px-3 text-center">موجودہ اسٹاک</th>
                        <th className="py-3 px-3 text-center">الرٹ حد</th>
                        <th className="py-3 px-3 text-center">اسٹیٹس</th>
                        <th className="py-3 px-4 text-center">ایکشن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                            {p.name}
                          </td>
                          <td className="py-3 px-3 font-urdu font-semibold text-slate-800">
                            {p.urdu_name}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500">
                            {p.category}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-amber-700 text-sm">
                            Rs. {p.rate_per_kg} / KG
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                            <span className={p.stock_kg <= p.min_stock_alert ? 'text-rose-600 font-black' : ''}>
                              {p.stock_kg} KG
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {p.min_stock_alert} KG
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {p.is_active ? 'فعال (Active)' : 'غیر فعال'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setProductModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition"
                            >
                              ریٹ تبدیل کریں
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 5: STOCK & INVENTORY                                        */}
            {/* =============================================================== */}
            {activeTab === 'stock' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight">
                      چکن اسٹاک و انوینٹری رجسٹر (Chicken Stock & Inventory)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      کل دستیاب چکن گوشت: <strong>{kpis.totalStock} KG</strong> • فارم آمد و کٹنگ لوس کٹوتی
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStockModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ نیا اسٹاک آمد (Arrival)</span>
                    </button>
                  </div>
                </div>

                {/* Stock Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {products.map(p => {
                    const isLow = p.stock_kg <= p.min_stock_alert;
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-3xl border transition ${
                          isLow
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-white border-slate-200/90 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 truncate">{p.name}</span>
                          {isLow && (
                            <span className="px-1.5 py-0.5 bg-rose-200 text-rose-800 text-[9px] font-bold rounded-md">
                              کم اسٹاک
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-urdu block mt-0.5">{p.urdu_name}</span>
                        <p className="text-2xl font-black font-mono text-slate-900 mt-2">
                          {p.stock_kg} <span className="text-xs font-normal text-slate-500 font-sans">KG</span>
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>الرٹ حد: {p.min_stock_alert}kg</span>
                          <span className="font-mono font-bold text-amber-700">Rs.{p.rate_per_kg}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stock Movement Audit Logs */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
                  <h3 className="font-extrabold text-sm text-slate-900 font-urdu mb-3">
                    📜 اسٹاک موومنٹ ہسٹری (Stock In/Out Logs)
                  </h3>
                  {stockLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      ابھی تک کوئی لاگ ریکارڈ نہیں ہے۔ نیا اسٹاک شامل کرنے پر یہاں خودکار اندراج ہوگا۔
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-right">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">تاریخ</th>
                            <th className="py-2.5 px-3">پروڈکٹ</th>
                            <th className="py-2.5 px-3 text-center">قسم موومنٹ</th>
                            <th className="py-2.5 px-3 text-center">وزن تبدیلی</th>
                            <th className="py-2.5 px-3 text-center">باقی اسٹاک</th>
                            <th className="py-2.5 px-3">تفصیل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stockLogs.slice(0, 20).map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(log.date)}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{log.product_name}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.type === 'purchase'
                                    ? 'bg-blue-100 text-blue-800'
                                    : log.type === 'sale'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {log.type === 'purchase' ? 'فارم آمد' : log.type === 'sale' ? 'سیل کٹوتی' : 'نقصان / کٹنگ'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                <span className={log.change_kg > 0 ? 'text-blue-700' : 'text-rose-700'}>
                                  {log.change_kg > 0 ? `+${log.change_kg}` : log.change_kg} KG
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                                {log.balance_after_kg} KG
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{log.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 6: SALES HISTORY                                            */}
            {/* =============================================================== */}
            {activeTab === 'sales_history' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight">
                      سیلز رجسٹر و روزنامچہ (Daily Sales History Register)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      فروخت شدہ بلز: {sales.length} • مجموعی فروخت: Rs.{sales.reduce((s, r) => s + r.total_amount, 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="انوائس #، گاہک، فون..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    {/* Date filter pills */}
                    <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                      <button
                        onClick={() => setSalesDateFilter('today')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          salesDateFilter === 'today' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        آج
                      </button>
                      <button
                        onClick={() => setSalesDateFilter('week')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          salesDateFilter === 'week' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        7 دن
                      </button>
                      <button
                        onClick={() => setSalesDateFilter('month')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          salesDateFilter === 'month' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        یہ مہینہ
                      </button>
                      <button
                        onClick={() => setSalesDateFilter('all')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          salesDateFilter === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        تمام
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sales Table */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">انوائس #</th>
                        <th className="py-3 px-3">تاریخ و وقت</th>
                        <th className="py-3 px-3">گاہک کا نام</th>
                        <th className="py-3 px-3 text-center">کل وزن</th>
                        <th className="py-3 px-3 text-left">ٹوٹل بل رقم</th>
                        <th className="py-3 px-3 text-left">وصول شدہ</th>
                        <th className="py-3 px-3 text-left">بقایا رقم</th>
                        <th className="py-3 px-3 text-center">طریقہ</th>
                        <th className="py-3 px-3 text-center">رسید پرنٹ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {sale.invoice_no}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                            {formatDate(sale.sale_date)} <span className="text-[10px] text-slate-400">{sale.sale_time}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {sale.customer_name}
                            {sale.phone && <span className="text-[10px] text-slate-400 block font-mono">{sale.phone}</span>}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                            {sale.total_weight_kg} KG
                          </td>
                          <td className="py-3 px-3 text-left font-mono font-black text-slate-900">
                            Rs. {sale.total_amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700">
                            Rs. {sale.received_amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-left font-mono font-bold text-rose-700">
                            {sale.remaining_due > 0 ? `Rs. ${sale.remaining_due.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sale.payment_method === 'cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sale.payment_method === 'credit'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {sale.payment_method === 'cash' ? 'نقد' : sale.payment_method === 'credit' ? 'ادھار' : 'جزوی'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setReceiptModalSale(sale)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition inline-flex items-center gap-1"
                              title="رسید پرنٹ کریں"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>رسید</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSales.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                            کوئی سیل ریکارڈ نہیں ملا۔
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ===================================================================== */}
      {/* MODALS                                                                */}
      {/* ===================================================================== */}
      {/* Printable Sale Receipt Modal */}
      <SaleReceiptModal
        sale={receiptModalSale}
        onClose={() => setReceiptModalSale(null)}
      />

      {/* Customer Full Khata Ledger Statement Modal */}
      <CustomerLedgerModal
        customer={ledgerCustomer}
        onClose={() => setLedgerCustomer(null)}
        onRecordPayment={c => {
          setPaymentCustomer(c);
          setPaymentModalOpen(true);
        }}
        onCustomerUpdated={loadAllData}
      />

      {/* Payment Wasooli Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        initialCustomer={paymentCustomer}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentCustomer(null);
        }}
        onSuccess={loadAllData}
      />

      {/* Stock Management Modal */}
      <StockModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        onSuccess={loadAllData}
      />

      {/* Customer Add / Edit Modal */}
      <CustomerEditModal
        isOpen={customerModalOpen}
        customer={editingCustomer}
        onClose={() => {
          setCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={loadAllData}
      />

      {/* Product Add / Edit Modal */}
      <ProductEditModal
        isOpen={productModalOpen}
        product={editingProduct}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={loadAllData}
      />
    </div>
  );
};
