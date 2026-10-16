// =============================================================================
// SHAN CHICKEN MEAT & DIGITAL KHATA - Standalone Portal
// Fully Isolated from Poultry Waste Management
// Inspired by Digi Khata: Clean, Professional, Simple & Powerful
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChickenProduct,
  FreezerProduct,
  ChickenCustomer,
  ChickenSale,
  ChickenSaleItem,
  ChickenPayment,
  ChickenStockLog,
  FreshChickenArrival,
  ChickenExpense,
  ChickenCategory,
  ChickenShopWorker,
} from './types';
import {
  chickenShopApi,
  DEFAULT_CHICKEN_PRODUCTS,
  FRESH_CHICKEN_PRODUCT_ID,
  DEFAULT_FRESH_CHICKEN_PRODUCT,
} from './api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SaleReceiptModal } from './SaleReceiptModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { PaymentModal } from './PaymentModal';
import { CustomerEditModal } from './CustomerEditModal';
import { ProductEditModal } from './ProductEditModal';
import { FreshChickenArrivalModal } from './FreshChickenArrivalModal';
import { ExpenseModal } from './ExpenseModal';
import { ProfitLossTab } from './ProfitLossTab';
import { DailySalesTab } from './DailySalesTab';
import { FreezerStockTab } from './FreezerStockTab';
import { SupplierPaymentsTab } from './SupplierPaymentsTab';
import { BulkWalkinSaleModal } from './BulkWalkinSaleModal';
import { ChickenCategoriesTab } from './ChickenCategoriesTab';
import { ChickenWorkersTab } from './ChickenWorkersTab';
import { CustomerKhataEntryModal } from './CustomerKhataEntryModal';
import { MushtarkaKhataModal } from './MushtarkaKhataModal';
import { formatDate } from '../utils/formatters';
import {
  Store,
  ShoppingCart,
  Users,
  BookOpen,
  Package,
  Layers,
  History,
  TrendingUp,
  Plus,
  X,
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
  Flame,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  Menu,
  LayoutDashboard,
  Snowflake,
  UserCheck,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';

export interface ShopLiveNotification {
  id: string;
  type: 'sale' | 'payment' | 'arrival' | 'customer';
  title: string;
  message: string;
  details?: string;
  timestamp: string;
  read: boolean;
}

function playShopChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.warn('[Audio] Chime playback note:', e);
  }
}

interface ChickenShopAppProps {
  onBackToWaste?: () => void;
  standalone?: boolean;
}

export interface PosItemRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryUrduName: string;
  weightKg: string;
  ratePerKg: string;
}

type TabType = 'dashboard' | 'pos' | 'daily_sales' | 'freezer' | 'categories' | 'workers' | 'customers' | 'supplier_payments' | 'sales_history' | 'profit_loss';

export const ChickenShopApp: React.FC<ChickenShopAppProps> = ({ onBackToWaste, standalone = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const p = localStorage.getItem('cs_portal_products');
      const s = localStorage.getItem('cs_portal_sales');
      // If we have cached products or sales, don't show full-page blocking spinner!
      return !(p || s);
    } catch {
      return true;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Core Data - initialized lazily from localStorage for 0ms instant display
  const [products, setProducts] = useState<ChickenProduct[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_products');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [freezerProducts, setFreezerProducts] = useState<FreezerProduct[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_products');
      if (!raw) return [];
      const pList: ChickenProduct[] = JSON.parse(raw);
      return pList
        .filter(p => p.category === 'Freezer Stock' || p.id.startsWith('freezer-'))
        .map(p => ({
          id: p.id,
          name: p.name,
          urdu_name: p.urdu_name || p.name,
          category: 'Freezer Stock' as const,
          unit: 'KG',
          rate_per_kg: Number(p.rate_per_kg || 0),
          stock_kg: Number(p.stock_kg || 0),
          is_active: p.is_active !== false,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
    } catch {
      return [];
    }
  });
  const [customers, setCustomers] = useState<ChickenCustomer[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_customers');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [sales, setSales] = useState<ChickenSale[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_sales');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [payments, setPayments] = useState<ChickenPayment[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_payments');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [stockLogs, setStockLogs] = useState<ChickenStockLog[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_stock_logs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [freshArrivals, setFreshArrivals] = useState<FreshChickenArrival[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_fresh_arrivals');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [expenses, setExpenses] = useState<ChickenExpense[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_expenses');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState<ChickenCategory[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_categories');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [workers, setWorkers] = useState<ChickenShopWorker[]>(() => {
    try {
      const raw = localStorage.getItem('cs_portal_workers');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Modals State
  const [receiptModalSale, setReceiptModalSale] = useState<ChickenSale | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<ChickenCustomer | null>(null);
  const [ledgerRefreshTrigger, setLedgerRefreshTrigger] = useState<number>(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [paymentCustomer, setPaymentCustomer] = useState<ChickenCustomer | null>(null);
  const [khataEntryModalOpen, setKhataEntryModalOpen] = useState<boolean>(false);
  const [khataEntryCustomer, setKhataEntryCustomer] = useState<ChickenCustomer | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<ChickenCustomer | null>(null);
  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ChickenProduct | null>(null);
  const [freshArrivalModalOpen, setFreshArrivalModalOpen] = useState<boolean>(false);
  const [selectedArrivalCategoryId, setSelectedArrivalCategoryId] = useState<string | null>(null);
  const [freshRateModalOpen, setFreshRateModalOpen] = useState<boolean>(false);
  const [newFreshSellingRate, setNewFreshSellingRate] = useState<string>('');
  const [editFreshStockModalOpen, setEditFreshStockModalOpen] = useState<boolean>(false);
  const [editFreshStockValue, setEditFreshStockValue] = useState<string>('');
  const [stockUpdating, setStockUpdating] = useState<boolean>(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);
  const [bulkWalkinModalOpen, setBulkWalkinModalOpen] = useState<boolean>(false);
  const [bulkWalkinDate, setBulkWalkinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mushtarkaKhataModalOpen, setMushtarkaKhataModalOpen] = useState<boolean>(false);

  // POS State (Multi-Item Chicken Cuts, fast counter inputs with + Add Item)
  const [posCustomerId, setPosCustomerId] = useState<string>('');
  const [posItems, setPosItems] = useState<PosItemRow[]>([
    {
      id: 'pos-1',
      categoryId: 'cat-gosht',
      categoryName: 'Chicken Gosht (Meat)',
      categoryUrduName: 'چکن گوشت',
      weightKg: '',
      ratePerKg: '400',
    },
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

  // Live Notifications State (Sound Chime & Realtime Alerts)
  const [notifications, setNotifications] = useState<ShopLiveNotification[]>([]);
  const [latestToast, setLatestToast] = useState<ShopLiveNotification | null>(null);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const soundEnabledRef = React.useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    if (latestToast) {
      const timer = setTimeout(() => {
        setLatestToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [latestToast]);

  useEffect(() => {
    if (standalone) {
      document.title = 'شان چکن شاپ - ایڈمن پورٹل (Chicken Shop Management)';
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = '/chicken_shop_icon.png';
      }
    }

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
  }, [standalone]);

  const loadAllData = async (showSpinner = false) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      setIsSyncing(true);

      // Clean up any stale local mock data before fetching
      chickenShopApi.clearStaleLocalMockData();
      // Auto-migrate any previously cached genuine offline records to Supabase in background
      chickenShopApi.syncBrowserCacheToSupabase().catch(() => {});

      const [pList, cList, sList, payList, logs, fArrivals, expList, catList, wrkList] = await Promise.all([
        chickenShopApi.getProducts(),
        chickenShopApi.getCustomers(),
        chickenShopApi.getSales(),
        chickenShopApi.getPayments(),
        chickenShopApi.getStockLogs(),
        chickenShopApi.getFreshChickenArrivals(),
        chickenShopApi.getExpenses(),
        chickenShopApi.getCategories(),
        chickenShopApi.getWorkers(),
      ]);

      const fzList: FreezerProduct[] = pList
        .filter(p => p.category === 'Freezer Stock' || p.id.startsWith('freezer-'))
        .map(p => ({
          id: p.id,
          name: p.name,
          urdu_name: p.urdu_name || p.name,
          category: 'Freezer Stock',
          unit: 'KG',
          rate_per_kg: Number(p.rate_per_kg || 0),
          stock_kg: Number(p.stock_kg || 0),
          is_active: p.is_active !== false,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));

      setProducts(pList);
      setCustomers(cList);
      setSales(sList);
      setPayments(payList);
      setStockLogs(logs);
      setFreshArrivals(fArrivals);
      setExpenses(expList);
      setFreezerProducts(fzList);
      setCategories(catList);
      setWorkers(wrkList);
      setLedgerRefreshTrigger(prev => prev + 1);

      try {
        localStorage.setItem('cs_portal_categories', JSON.stringify(catList));
        localStorage.setItem('cs_portal_workers', JSON.stringify(wrkList));
      } catch {}

      if (ledgerCustomer) {
        const found = cList.find(c => c.id === ledgerCustomer.id);
        if (found) setLedgerCustomer(found);
      }

      // Update default fresh chicken selling rate in POS if available
      const fProd = pList.find(p => p.id === FRESH_CHICKEN_PRODUCT_ID);
      if (fProd && fProd.rate_per_kg) {
        setPosItems(prev => {
          if (prev.length === 1 && !prev[0].weightKg) {
            return [{ ...prev[0], ratePerKg: String(fProd.rate_per_kg) }];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load chicken shop data:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Initial load: don't block render if cache is available
    loadAllData(false);
  }, []);

  // Supabase Real-time Subscription: updates state across devices automatically & notifies admin in real time
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let debounceTimer: any = null;
    const triggerReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadAllData(false);
      }, 300);
    };

    const handleSaleEvent = (payload: any) => {
      triggerReload();
      if (payload.eventType === 'INSERT' && payload.new) {
        const s = payload.new;
        const isBulk = s.customer_name?.includes('Bulk') || s.customer_name?.includes('واک ان');
        const title = isBulk ? '⚡ واک ان نقد سیل موصول ہوئی!' : '⚡ ورکر نے نئی سیل درج کی!';
        const workerTag = s.notes?.includes('[ورکر:') ? s.notes.match(/\[ورکر:[^\]]+\]/)?.[0] + ' ' : '';
        const msg = `${workerTag}بل #${s.invoice_no || ''} • گاہک: ${s.customer_name || 'کسٹمر'} • ${s.total_weight_kg || 0} KG • رقم: Rs. ${Number(s.total_amount || 0).toLocaleString()}`;
        const notif: ShopLiveNotification = {
          id: `sale-${Date.now()}-${Math.random()}`,
          type: 'sale',
          title,
          message: msg,
          details: s.notes || undefined,
          timestamp: new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' }),
          read: false,
        };
        if (soundEnabledRef.current) playShopChime();
        setNotifications(prev => [notif, ...prev.slice(0, 49)]);
        setLatestToast(notif);
      }
    };

    const handlePaymentEvent = (payload: any) => {
      triggerReload();
      if (payload.eventType === 'INSERT' && payload.new) {
        const p = payload.new;
        const workerTag = p.notes?.includes('[ورکر:') ? p.notes.match(/\[ورکر:[^\]]+\]/)?.[0] + ' ' : '';
        const notif: ShopLiveNotification = {
          id: `pay-${Date.now()}-${Math.random()}`,
          type: 'payment',
          title: '💰 نئی کسٹمر وصولی (Payment) درج ہوئی!',
          message: `${workerTag}گاہک: ${p.customer_name || 'کسٹمر'} • وصول شدہ رقم: Rs. ${Number(p.amount || 0).toLocaleString()} (${p.payment_method || 'نقد'})`,
          details: p.notes || undefined,
          timestamp: new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' }),
          read: false,
        };
        if (soundEnabledRef.current) playShopChime();
        setNotifications(prev => [notif, ...prev.slice(0, 49)]);
        setLatestToast(notif);
      }
    };

    const handleArrivalEvent = (payload: any) => {
      triggerReload();
      if (payload.eventType === 'INSERT' && payload.new) {
        const a = payload.new;
        const notif: ShopLiveNotification = {
          id: `arr-${Date.now()}-${Math.random()}`,
          type: 'arrival',
          title: '🐔 نئی چکن آمد موصول ہوئی!',
          message: `سپلائر: ${a.supplier_name || 'نامعلوم'} • وزن: ${a.net_weight_kg || a.total_weight_kg || 0} KG • رقم: Rs. ${Number(a.total_cost || 0).toLocaleString()}`,
          details: a.notes || undefined,
          timestamp: new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' }),
          read: false,
        };
        if (soundEnabledRef.current) playShopChime();
        setNotifications(prev => [notif, ...prev.slice(0, 49)]);
        setLatestToast(notif);
      }
    };

    const handleCustomerEvent = (payload: any) => {
      triggerReload();
      if (payload.eventType === 'INSERT' && payload.new) {
        const c = payload.new;
        const notif: ShopLiveNotification = {
          id: `cust-${Date.now()}-${Math.random()}`,
          type: 'customer',
          title: '👤 نیا گاہک رجسٹر ہوا',
          message: `${c.name || 'کسٹمر'} ${c.shop_name ? `(${c.shop_name})` : ''} • بقایا: Rs. ${Number(c.opening_balance || 0).toLocaleString()}`,
          details: c.phone || undefined,
          timestamp: new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' }),
          read: false,
        };
        if (soundEnabledRef.current) playShopChime();
        setNotifications(prev => [notif, ...prev.slice(0, 49)]);
        setLatestToast(notif);
      }
    };

    const channel = supabase
      .channel('chicken_shop_realtime_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_sales' }, handleSaleEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_payments' }, handlePaymentEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_fresh_arrivals' }, handleArrivalEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_customers' }, handleCustomerEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_products' }, triggerReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_expenses' }, triggerReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_categories' }, triggerReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chicken_shop_workers' }, triggerReload)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Dynamic Live Customer Balance and Ledger Calculation
  // ---------------------------------------------------------------------------
  const customerStatsMap = useMemo(() => {
    const map = new Map<string, { balance: number; billed: number; paid: number }>();
    customers.forEach(c => {
      const opening = Number(c.opening_balance) || 0;
      map.set(c.id, { balance: opening, billed: 0, paid: 0 });
    });

    sales.forEach(s => {
      if (s.customer_id && map.has(s.customer_id)) {
        const entry = map.get(s.customer_id)!;
        entry.billed += Number(s.total_amount) || 0;
        entry.paid += Number(s.received_amount) || 0;
        entry.balance += Number(s.remaining_due) || 0;
      }
    });

    payments.forEach(p => {
      if (p.customer_id && map.has(p.customer_id)) {
        const entry = map.get(p.customer_id)!;
        entry.paid += Number(p.amount) || 0;
        entry.balance = Math.max(0, entry.balance - (Number(p.amount) || 0));
      }
    });

    return map;
  }, [customers, sales, payments]);

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
    const marketDue = Array.from(customerStatsMap.values()).reduce((s, c) => s + c.balance, 0);

    return {
      todaySales,
      todayCash,
      todayCredit,
      todayWeight: Number(todayWeight.toFixed(2)),
      marketDue,
      todayBillsCount: todaySalesList.length,
    };
  }, [todaySalesList, customerStatsMap]);

  // ---------------------------------------------------------------------------
  // Fresh Chicken KPIs & Calculations
  // ---------------------------------------------------------------------------
  const freshProd = useMemo(() => {
    return (
      products.find(
        p => p.id === FRESH_CHICKEN_PRODUCT_ID || p.name.toLowerCase().includes('fresh chicken')
      ) || DEFAULT_FRESH_CHICKEN_PRODUCT
    );
  }, [products]);

  const freshSalesItems = useMemo(() => {
    const list: {
      sale: ChickenSale;
      item: ChickenSaleItem;
    }[] = [];
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (
          item.product_id === FRESH_CHICKEN_PRODUCT_ID ||
          item.product_name.toLowerCase().includes('fresh chicken') ||
          (item.urdu_name && item.urdu_name.includes('تازہ مرغی'))
        ) {
          list.push({ sale, item });
        }
      });
    });
    return list;
  }, [sales]);

  const freshKpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const currentSellingRate = Number(freshProd.rate_per_kg) || 450;
    const totalArrivalKg = Number(freshArrivals.reduce((s, a) => s + (a.weight_kg || 0), 0).toFixed(2));
    const totalArrivalCost = freshArrivals.reduce((s, a) => s + (a.total_cost || 0), 0);

    // Arrivals stats today
    const todayArrivals = freshArrivals.filter(a => a.date === today);
    const todayArrivalKg = Number(todayArrivals.reduce((s, a) => s + (a.weight_kg || 0), 0).toFixed(2));
    const todayArrivalCost = todayArrivals.reduce((s, a) => s + (a.total_cost || 0), 0);
    const todayAvgPurchaseRate =
      todayArrivalKg > 0
        ? Math.round(todayArrivalCost / todayArrivalKg)
        : freshArrivals[0]?.rate_per_kg || 380;

    // Sales stats today
    const todaySales = freshSalesItems.filter(x => x.sale.sale_date === today);
    const todaySoldKg = Number(todaySales.reduce((s, x) => s + (x.item.weight_kg || 0), 0).toFixed(2));
    const todaySoldRevenue = todaySales.reduce((s, x) => s + (x.item.line_total || 0), 0);
    const todayAvgSellingRate =
      todaySoldKg > 0 ? Math.round(todaySoldRevenue / todaySoldKg) : currentSellingRate;

    // Gross profit margin today
    const todayEstimatedCostOfSold = Math.round(todaySoldKg * todayAvgPurchaseRate);
    const todayGrossMargin = todaySoldRevenue - todayEstimatedCostOfSold;
    const todayMarginPerKg = todayAvgSellingRate - todayAvgPurchaseRate;

    const totalSupplierDue = freshArrivals.reduce((sum, a) => {
      const payable = a.remaining_payable !== undefined ? a.remaining_payable : Math.max(0, (a.total_cost || 0) - (a.paid_amount || 0));
      return sum + payable;
    }, 0);

    return {
      currentSellingRate,
      todayArrivalKg,
      todayArrivalCost,
      todayAvgPurchaseRate,
      totalArrivalKg,
      totalArrivalCost,
      todaySoldKg,
      todaySoldRevenue,
      todayAvgSellingRate,
      todayGrossMargin,
      todayMarginPerKg,
      todaySalesCount: todaySales.length,
      totalSupplierDue,
    };
  }, [freshProd, freshArrivals, freshSalesItems]);

  const handleDeleteFreshArrival = async (entry: FreshChickenArrival) => {
    if (
      !confirm(
        `کیا آپ واقعی یہ آمد (${entry.weight_kg} KG - Rs.${entry.total_cost.toLocaleString()}) مستقل طور پر حذف کرنا چاہتے ہیں؟\n\nاس عمل سے یہ لاگ ریکارڈ ڈیٹا بیس سے ہمیشہ کے لیے مٹا دیا جائے گا اور اسکیل اسٹاک بھی خودکار ریورس ہو جائے گا۔`
      )
    ) {
      return;
    }
    try {
      // Optimistically remove from state immediately
      setFreshArrivals(prev => prev.filter(a => a.id !== entry.id));
      await chickenShopApi.deleteFreshChickenArrival(entry.id);
      await loadAllData(false);
      alert('آمد کا ریکارڈ کامیابی سے مستقل طور پر حذف ہو گیا۔');
    } catch (err: any) {
      alert(`آمد حذف کرنے میں مسئلہ: ${err.message || 'Error deleting arrival'}`);
      await loadAllData(false);
    }
  };

  const handleRecordSupplierPayment = async (
    arrivalId: string,
    payment: {
      amount: number;
      date?: string;
      payment_method?: 'cash' | 'bank' | 'online' | 'cheque';
      notes?: string;
    }
  ) => {
    try {
      await chickenShopApi.recordSupplierPayment(arrivalId, payment);
      await loadAllData(false);
      alert('سپلائر کو ادائیگی کامیابی سے ریکارڈ ہو گئی ہے۔');
    } catch (err: any) {
      alert(`ادائیگی محفوظ کرنے میں خرابی: ${err.message || 'Error recording payment'}`);
    }
  };

  const handleUpdateSellingRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(newFreshSellingRate);
    if (!rate || rate <= 0) {
      alert('براہ کرم درست فروخت ریٹ درج کریں');
      return;
    }
    try {
      await chickenShopApi.updateFreshChickenSellingRate(rate);
      await loadAllData();
      setFreshRateModalOpen(false);
    } catch (err: any) {
      alert(`ریٹ اپڈیٹ کرنے میں مسئلہ: ${err.message}`);
    }
  };

  const handleUpdateFreshStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(editFreshStockValue);
    if (isNaN(val) || val < 0) {
      alert('براہ کرم درست وزن (KG) درج کریں');
      return;
    }
    try {
      setStockUpdating(true);
      await chickenShopApi.updateFreshChickenStock(val);
      await loadAllData();
      setEditFreshStockModalOpen(false);
      alert(`تازہ چکن اسٹاک کامیابی سے تبدیل ہو کر ${val} KG ہو گیا۔`);
    } catch (err: any) {
      alert(`اسٹاک تبدیل کرنے میں خرابی: ${err.message || 'Error updating stock'}`);
    } finally {
      setStockUpdating(false);
    }
  };

  const handleDeleteFreshStock = async () => {
    const isConfirmed = window.confirm(
      `کیا آپ واقعی موجودہ تازہ چکن اسٹاک کو صفر (0 KG) کرنا چاہتے ہیں؟\n\nاس عمل سے اسکیل کا موجودہ اسٹاک صفر ہو جائے گا۔`
    );
    if (!isConfirmed) return;
    try {
      setStockUpdating(true);
      await chickenShopApi.deleteFreshChickenStock();
      await loadAllData();
      alert('تازہ چکن کا اسٹاک کامیابی سے صفر (0 KG) کر دیا گیا ہے۔');
    } catch (err: any) {
      alert(`اسٹاک صفر کرنے میں خرابی: ${err.message || 'Error resetting stock'}`);
    } finally {
      setStockUpdating(false);
    }
  };

  const handleQuickFreshChickenSale = () => {
    setActiveTab('pos');
    setPosItems([
      {
        id: 'pos-' + Date.now(),
        categoryId: categories[0]?.id || 'cat-gosht',
        categoryName: categories[0]?.name || 'Chicken Gosht (Meat)',
        categoryUrduName: categories[0]?.urdu_name || 'چکن گوشت',
        weightKg: '',
        ratePerKg: String(freshProd.rate_per_kg || 400),
      },
    ]);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('کیا آپ واقعی یہ خرچہ حذف کرنا چاہتے ہیں؟')) return;
    try {
      await chickenShopApi.deleteExpense(id);
      await loadAllData();
    } catch (err: any) {
      alert(`خرچہ حذف کرنے میں مسئلہ: ${err.message || 'Error deleting expense'}`);
    }
  };

  const handleDeleteSale = async (sale: ChickenSale) => {
    const isConfirmed = window.confirm(
      `کیا آپ واقعی انوائس #${sale.invoice_no} (${sale.customer_name} - Rs.${sale.total_amount.toLocaleString()}) حذف کرنا چاہتے ہیں؟\n\nاس عمل سے بیچے گئے چکن کا اسٹاک واپس بحال ہو جائے گا اور گاہک کے کھاتے کا بقایا بیلنس بھی درست ہو جائے گا۔`
    );
    if (!isConfirmed) return;

    try {
      await chickenShopApi.deleteSale(sale.id);
      await loadAllData();
      alert(`انوائس #${sale.invoice_no} کامیابی سے حذف ہو گئی اور کھاتے کا بیلنس خودکار درست ہو گیا۔`);
    } catch (err: any) {
      alert(`سیل حذف کرنے میں خرابی: ${err.message || 'Error deleting sale'}`);
    }
  };

  const handleDeletePayment = async (payment: ChickenPayment) => {
    const isConfirmed = window.confirm(
      `کیا آپ واقعی رقم وصولی واؤچر #${payment.voucher_no} (${payment.customer_name} - Rs.${payment.amount.toLocaleString()}) حذف کرنا چاہتے ہیں؟\n\nاس عمل سے گاہک کے کھاتے میں بقایا ادھار واپس بڑھ جائے گا۔`
    );
    if (!isConfirmed) return;

    try {
      await chickenShopApi.deletePayment(payment.id);
      await loadAllData();
      alert(`رقم وصولی واؤچر #${payment.voucher_no} کامیابی سے حذف ہو گئی اور گاہک کا بقایا ادھار بحال ہو گیا۔`);
    } catch (err: any) {
      alert(`رقم وصولی حذف کرنے میں خرابی: ${err.message || 'Error deleting payment'}`);
    }
  };

  const handleDeleteProduct = async (product: ChickenProduct) => {
    if (product.id === FRESH_CHICKEN_PRODUCT_ID || product.id === freshProd.id) {
      alert('تازہ چکن (Live Fresh Chicken) سسٹم کا بنیادی آئٹم ہے اور اسے حذف نہیں کیا جا سکتا۔');
      return;
    }
    const isConfirmed = window.confirm(
      `کیا آپ واقعی پروڈکٹ "${product.name} (${product.urdu_name})" کو حذف (Delete) کرنا چاہتے ہیں؟\n\n(Are you sure you want to delete product "${product.name}"?)`
    );
    if (!isConfirmed) return;

    try {
      await chickenShopApi.deleteProduct(product.id);
      await loadAllData();
      alert(`پروڈکٹ "${product.name}" کامیابی سے حذف ہو گئی ہے۔`);
    } catch (err: any) {
      alert(`پروڈکٹ حذف کرنے میں خرابی: ${err.message || 'Error deleting product'}`);
    }
  };

  // ---------------------------------------------------------------------------
  // POS Multi-Item Calculations & Actions (Price defined during sale + Add button)
  // ---------------------------------------------------------------------------
  const handlePosCategoryChange = (rowId: string, catId: string) => {
    const found = categories.find(c => c.id === catId);
    if (!found) return;
    setPosItems(prev =>
      prev.map(it => (it.id === rowId ? {
        ...it,
        categoryId: found.id,
        categoryName: found.name,
        categoryUrduName: found.urdu_name,
      } : it))
    );
  };

  const handlePosWeightChange = (rowId: string, val: string) => {
    setPosItems(prev =>
      prev.map(it => (it.id === rowId ? { ...it, weightKg: val } : it))
    );
  };

  const handlePosRateChange = (rowId: string, val: string) => {
    setPosItems(prev =>
      prev.map(it => (it.id === rowId ? { ...it, ratePerKg: val } : it))
    );
  };

  const handlePosQuickWeight = (rowId: string, addKg: number) => {
    setPosItems(prev =>
      prev.map(it => {
        if (it.id === rowId) {
          const cur = Number(it.weightKg) || 0;
          return { ...it, weightKg: String(Number((cur + addKg).toFixed(2))) };
        }
        return it;
      })
    );
  };

  const handlePosAddItemRow = () => {
    const nextCat = categories[posItems.length % (categories.length || 1)] || {
      id: 'cat-gosht',
      name: 'Chicken Gosht (Meat)',
      urdu_name: 'چکن گوشت',
    };
    const lastRate = posItems[posItems.length - 1]?.ratePerKg || '400';
    const newRow: PosItemRow = {
      id: 'pos-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      categoryId: nextCat.id,
      categoryName: nextCat.name,
      categoryUrduName: nextCat.urdu_name,
      weightKg: '',
      ratePerKg: lastRate,
    };
    setPosItems(prev => [...prev, newRow]);
  };

  const handlePosRemoveItemRow = (rowId: string) => {
    if (posItems.length <= 1) return;
    setPosItems(prev => prev.filter(it => it.id !== rowId));
  };

  const posSubtotal = useMemo(() => {
    return posItems.reduce((acc, it) => {
      const w = Number(it.weightKg) || 0;
      const r = Number(it.ratePerKg) || 0;
      return acc + Math.round(w * r);
    }, 0);
  }, [posItems]);

  const posTotalWeight = useMemo(() => {
    const total = posItems.reduce((acc, it) => acc + (Number(it.weightKg) || 0), 0);
    return Number(total.toFixed(2));
  }, [posItems]);

  const posFinalTotal = useMemo(() => {
    const disc = Number(posDiscount) || 0;
    return Math.max(0, posSubtotal - disc);
  }, [posSubtotal, posDiscount]);

  const posSelectedCustomer = useMemo(() => {
    if (posCustomerId) {
      return customers.find(c => c.id === posCustomerId) || null;
    }
    return null;
  }, [posCustomerId, customers]);

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

  // Submit POS Sale with multiple items
  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = posItems.filter(it => (Number(it.weightKg) || 0) > 0 && (Number(it.ratePerKg) || 0) > 0);
    if (validItems.length === 0) {
      alert('براہ کرم کم از کم ایک آئٹم کا وزن اور فروخت ریٹ درج کریں');
      return;
    }

    const availableStock = Number(freshProd?.stock_kg) || 0;
    if (posTotalWeight > availableStock) {
      alert(`⚠️ غلطی: فروخت کا کل وزن (${posTotalWeight} KG) موجودہ دستیاب اسٹاک (${availableStock} KG) سے زیادہ ہے!\n\nآپ دستیاب اسٹاک سے زیادہ وزن فروخت نہیں کر سکتے۔ براہ کرم وزن درست فرمائیں۔\n(Cannot sell ${posTotalWeight} KG. Available stock is only ${availableStock} KG)`);
      return;
    }

    if (posPaymentMethod === 'credit' && !posCustomerId) {
      alert('ادھار کھاتہ سیل کے لیے براہ کرم گاہک منتخب کریں یا ادائیگی کا طریقہ نقد (Cash) رکھیں');
      return;
    }

    const customerName = posSelectedCustomer ? posSelectedCustomer.name : 'نقد خریدار (Cash Sale)';
    const customerPhone = posSelectedCustomer ? posSelectedCustomer.phone : null;

    try {
      setPosSaving(true);
      const saleItems = validItems.map(it => ({
        product_id: freshProd?.id,
        product_name: `${it.categoryUrduName} (${it.categoryName})`,
        category_id: it.categoryId,
        category_name: it.categoryName,
        urdu_name: it.categoryUrduName,
        weight_kg: Number(it.weightKg),
        rate_per_kg: Number(it.ratePerKg),
        line_total: Math.round(Number(it.weightKg) * Number(it.ratePerKg)),
      }));

      const newSale = await chickenShopApi.createSale({
        customer_id: posCustomerId || null,
        customer_name: customerName,
        phone: customerPhone,
        items: saleItems,
        payment_method: posCustomerId ? 'credit' : 'cash',
        received_amount: posCustomerId ? 0 : posFinalTotal,
        discount: Number(posDiscount) || 0,
        notes: posNotes || undefined,
        sale_date: posSaleDate,
      });

      // Reload data
      await loadAllData(false);

      // Reset POS inputs
      setPosItems([
        {
          id: 'pos-' + Date.now(),
          categoryId: categories[0]?.id || 'cat-gosht',
          categoryName: categories[0]?.name || 'Chicken Gosht (Meat)',
          categoryUrduName: categories[0]?.urdu_name || 'چکن گوشت',
          weightKg: '',
          ratePerKg: '400',
        },
      ]);
      setPosCustomerId('');
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
      const stats = customerStatsMap.get(c.id);
      const balance = stats ? stats.balance : (Number(c.current_balance) || 0);
      if (customerFilter === 'due') return balance > 0;
      if (customerFilter === 'clear') return balance === 0;
      return true;
    });
  }, [customers, searchQuery, customerFilter, customerStatsMap]);

  const handleDeleteCustomer = async (cust: ChickenCustomer) => {
    if (!confirm(`کیا آپ واقعی گاہک "${cust.name}" اور اس کا مکمل کھاتہ حذف (Delete) کرنا چاہتے ہیں؟\n\n(Are you sure you want to delete customer "${cust.name}" and their Khata?)`)) {
      return;
    }
    try {
      await chickenShopApi.deleteCustomer(cust.id);
      await loadAllData();
    } catch (err: any) {
      alert(`گاہک ڈیلیٹ کرنے میں مسئلہ: ${err.message || 'Error deleting customer'}`);
    }
  };

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

  const navItems: {
    id: TabType;
    label: string;
    sublabel: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'ڈیش بورڈ', sublabel: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'pos', label: 'نیا بل / کاؤنٹر سیل', sublabel: 'Fast Counter POS Sale', icon: ShoppingCart },
    {
      id: 'daily_sales',
      label: 'روزانہ نقد، ادھار و وصولی',
      sublabel: 'Daily Naqd, Odhar & Wasooli',
      icon: Wallet,
    },
    {
      id: 'freezer',
      label: 'فریزر اسٹاک',
      sublabel: 'Freezer Stock & Sales',
      icon: Snowflake,
    },
    {
      id: 'categories',
      label: 'چکن کیٹیگریز (پروڈکٹس)',
      sublabel: 'Chicken Cuts & Rates',
      icon: Layers,
    },
    {
      id: 'workers',
      label: 'چکن ورکرز و لاگ ان',
      sublabel: 'Workers & Permissions',
      icon: UserCheck,
    },
    {
      id: 'customers',
      label: 'گاہک کھاتہ رجسٹر',
      sublabel: 'Digi Khata & Ledger',
      icon: Users,
      badge: kpis.marketDue > 0 ? `Rs.${Math.round(kpis.marketDue / 1000)}k` : undefined,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'mushtarka_khata' as any,
      label: 'مشترکہ کھاتہ (چھوٹا ادھار)',
      sublabel: 'Small Credit Khata (1-2 KG)',
      icon: BookOpen,
      badge: 'نیا',
      badgeColor: 'bg-purple-600',
    },
    {
      id: 'supplier_payments',
      label: 'سپلائر ادائیگی رجسٹر',
      sublabel: 'Supplier Farm Khata',
      icon: Truck,
      badge: freshKpis.totalSupplierDue > 0 ? `Rs.${Math.round(freshKpis.totalSupplierDue / 1000)}k` : undefined,
      badgeColor: 'bg-rose-600',
    },
    { id: 'profit_loss', label: 'نفع و نقصان رپورٹس', sublabel: 'Profit & Loss (P&L)', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 lg:w-72 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none h-screen shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white text-xl shadow-lg shadow-amber-500/20">
              🐔
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight font-urdu">
                شان چکن شاپ
              </h1>
              <span className="text-[10px] text-amber-400 font-semibold tracking-wide block">
                ڈیجیٹل کھاتہ و پوائنٹ آف سیل
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
            aria-label="بند کریں"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick CTA inside sidebar - compact 2 buttons */}
        <div className="p-2 border-b border-slate-800 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              setActiveTab('pos');
              setMobileSidebarOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-[11px] rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 font-urdu"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ نیا بل (POS)</span>
          </button>
          <button
            onClick={() => {
              setSelectedArrivalCategoryId(null);
              setFreshArrivalModalOpen(true);
              setMobileSidebarOpen(false);
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-750 text-blue-300 hover:text-white font-bold text-[11px] rounded-xl border border-slate-700 transition active:scale-95 font-urdu"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>+ چکن آمد</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'daily_sales' && (activeTab as string) === 'sales_history');
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === ('mushtarka_khata' as any)) {
                    setMushtarkaKhataModalOpen(true);
                  } else {
                    setActiveTab(item.id);
                  }
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-right group ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg transition ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:text-amber-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-right truncate">
                    <span className="block text-xs font-black font-urdu leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`block text-[9px] font-sans leading-tight mt-0.5 truncate ${
                        isActive ? 'text-amber-100' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full text-white ${
                      item.badgeColor || 'bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40">
          <div className="flex items-center justify-between px-2 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentTime}</span>
            </span>
            <span className="text-emerald-400 text-[10px] font-bold">آن لائن</span>
          </div>
          {onBackToWaste ? (
            <button
              onClick={onBackToWaste}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-700/80 transition font-urdu"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ویسٹ سسٹم پر واپس</span>
            </button>
          ) : (
            <a
              href="/"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-700/80 transition font-urdu"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ویسٹ سسٹم پر جائیں</span>
            </a>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header inside main */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-3 sm:px-6 py-2 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 -mr-1 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden shrink-0"
              aria-label="کھولیں مینو"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-slate-900 font-urdu tracking-tight truncate">
                  {activeTab === 'dashboard' && 'ڈیش بورڈ اور اہم جائزہ (Dashboard)'}
                  {activeTab === 'pos' && 'نیا بل اور کاؤنٹر سیل (POS)'}
                  {(activeTab === 'daily_sales' || (activeTab as string) === 'sales_history') && 'روزانہ نقد، ادھار و وصولی روزنامچہ (Daily Sales)'}
                  {activeTab === 'freezer' && 'فریزر اسٹاک و فروخت (Freezer Stock)'}
                  {activeTab === 'categories' && 'چکن کیٹیگریز اور ریٹ مینجمنٹ (Chicken Categories)'}
                  {activeTab === 'workers' && 'چکن شاپ ورکرز اکاؤنٹس و لاگ ان (Worker Accounts)'}
                  {activeTab === 'customers' && 'گاہک و ڈیجیٹل کھاتہ لیجر (Khata)'}
                  {activeTab === 'supplier_payments' && 'سپلائر فارم ادائیگی رجسٹر و بقایا لاگ (Supplier Farm Payments)'}
                  {activeTab === 'profit_loss' && 'نفع و نقصان اور مالیاتی رپورٹس (P&L)'}
                </h1>
                {isSyncing ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
                    <span>ہم وقت سازی...</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>لائیو ریئل ٹائم</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block truncate">
                Shan Poultry & Chicken Shop Management System
              </p>
            </div>
          </div>

          {/* Quick Header Actions: Horizontal smooth scroll on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 max-w-full py-0.5">
            <button
              onClick={() => setActiveTab('daily_sales')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0 ${
                activeTab === 'daily_sales'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700'
              }`}
              title="آج کی روزانہ نقد، ادھار اور وصولی دیکھیں"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">نقد، ادھار و وصولی</span>
              <span className="md:hidden">سیلز</span>
            </button>
            <button
              onClick={() => {
                setSelectedArrivalCategoryId(null);
                setFreshArrivalModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ چکن آمد</span>
            </button>
            <button
              onClick={() => {
                setBulkWalkinDate(new Date().toISOString().split('T')[0]);
                setBulkWalkinModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0"
              title="تمام واک ان کاؤنٹر سیلز اکٹھی یکمشت درج کریں"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ واک ان (Bulk)</span>
              <span className="sm:hidden">واک ان</span>
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>+ نیا بل</span>
            </button>
            <button
              type="button"
              onClick={() => setMushtarkaKhataModalOpen(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0"
              title="مشترکہ کھاتہ (چھوٹا ادھار 1-2 کلو)"
            >
              <Wallet className="w-3.5 h-3.5 text-purple-200" />
              <span>+ مشترکہ کھاتہ</span>
            </button>
            <button
              onClick={() => {
                setPaymentCustomer(null);
                setPaymentModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>+ وصولی</span>
            </button>
            <a
              href="/ShanChickenShop.apk"
              download="ShanChickenShop.apk"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0 border border-slate-700"
              title="چکن شاپ موبائل ایپ (APK) ڈاؤن لوڈ کریں"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>📱 موبائل ایپ (APK)</span>
            </a>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#chicken-worker';
                if (onBackToWaste) onBackToWaste();
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-xs transition active:scale-95 font-urdu whitespace-nowrap shrink-0 border border-amber-500 cursor-pointer"
              title="چکن شاپ ورکر پورٹل کھولیں"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>👷 ورکر پورٹل</span>
            </button>

            {/* Sound Chime Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-1.5 rounded-xl border transition shrink-0 cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-400 border-slate-300 hover:bg-slate-200'
              }`}
              title={soundEnabled ? 'آواز الرٹ آن ہے (بند کرنے کے لیے کلک کریں)' : 'آواز الرٹ بند ہے (آن کرنے کے لیے کلک کریں)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowNotifDropdown(prev => !prev);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="relative p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
                title="ریئل ٹائم اطلاعات (Realtime Alerts)"
              >
                <Bell className="w-4 h-4 text-slate-700" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute left-0 sm:right-auto mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-right animate-fadeIn">
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-1.5 font-urdu text-xs font-black">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>لائیو ریئل ٹائم الرٹس ({notifications.length})</span>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-rose-300 hover:text-white font-urdu underline cursor-pointer"
                      >
                        تمام صاف کریں
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-urdu">
                        ابھی تک کوئی نئی اطلاع موصول نہیں ہوئی۔ ورکر کی ہر سیل یا وصولی یہاں لائیو نظر آئے گی۔
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 hover:bg-slate-50 transition text-right">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                            <span className="text-xs font-black text-slate-900 font-urdu">{n.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 font-urdu leading-relaxed font-bold">
                            {n.message}
                          </p>
                          {n.details && (
                            <p className="text-[10px] text-amber-700 font-urdu mt-0.5 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                              {n.details}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
                {/* 4 Master KPI Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                </div>

                {/* Fresh Chicken Live Stock & Management Panel */}
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/15 p-5 rounded-3xl border-2 border-amber-400/90 shadow-2xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
                        🐔
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-base sm:text-lg text-slate-900 font-urdu">
                            تازہ چکن مقررہ ریٹ: <span className="font-mono text-amber-950 font-black text-xl">Rs. {freshKpis.currentSellingRate} / KG</span>
                          </h4>
                          <span className="text-xs text-slate-600 font-urdu">
                            (خرید ریٹ: <strong className="font-mono text-slate-800 font-bold">Rs. {freshKpis.todayAvgPurchaseRate} / KG</strong>)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-urdu mt-0.5">
                          لائیو دکان اسکیل اور تازہ چکن انوینٹری مینجمنٹ
                        </p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditFreshStockValue(String(freshProd.stock_kg || 0));
                          setEditFreshStockModalOpen(true);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-2xs flex items-center gap-1"
                        title="تازہ چکن کا اسکیل وزن تبدیل کریں"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>اسٹاک تبدیل کریں</span>
                      </button>

                      <button
                        onClick={handleDeleteFreshStock}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-2xs flex items-center gap-1"
                        title="موجودہ تازہ چکن اسٹاک صفر (0) کریں"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>اسٹاک صفر کریں</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedArrivalCategoryId(null);
                          setFreshArrivalModalOpen(true);
                        }}
                        className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-2xs"
                      >
                        + چکن آمد
                      </button>

                      <button
                        onClick={() => {
                          setNewFreshSellingRate(String(freshKpis.currentSellingRate));
                          setFreshRateModalOpen(true);
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold font-urdu transition border border-slate-200 shadow-2xs"
                      >
                        ریٹ بدلیں
                      </button>

                      <button
                        onClick={handleQuickFreshChickenSale}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-2xs"
                      >
                        + نیا بل
                      </button>
                    </div>
                  </div>

                  {/* 3 Prominent Statistics Cards Requested by User */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-300/60">
                    {/* 1. Fresh Chicken Received Today */}
                    <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-200/90 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-urdu block">
                        آج تازہ چکن موصول (Received Today)
                      </span>
                      <p className="text-xl font-black text-blue-700 font-mono mt-1">
                        {freshKpis.todayArrivalKg} KG
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        کل فارم لاگت: Rs. {freshKpis.todayArrivalCost.toLocaleString()}
                      </p>
                    </div>

                    {/* 2. Fresh Chicken Sold Today */}
                    <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-200/90 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-urdu block">
                        آج تازہ چکن فروخت (Sold Today)
                      </span>
                      <p className="text-xl font-black text-emerald-700 font-mono mt-1">
                        {freshKpis.todaySoldKg} KG
                      </p>
                      <p className="text-[10px] text-emerald-600 mt-0.5 font-bold">
                        فروخت رقم: Rs. {freshKpis.todaySoldRevenue.toLocaleString()}
                      </p>
                    </div>

                    {/* 3. Remaining Fresh Chicken Stock */}
                    <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border-2 border-amber-400 shadow-2xs">
                      <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider font-urdu block">
                        موجودہ چکن اسٹاک (Remaining Stock)
                      </span>
                      <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                        {Number((freshProd.stock_kg || 0).toFixed(2))} KG
                      </p>
                      <p className="text-[10px] text-amber-800 font-urdu mt-0.5 font-bold">
                        دکان پر دستیاب لائیو اسکیل وزن
                      </p>
                    </div>
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
                        onClick={() => setActiveTab('daily_sales')}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 transition font-urdu"
                      >
                        روزانہ سیلز و کلو ریکارڈ دیکھیں →
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
                        {customers.filter(c => (customerStatsMap.get(c.id)?.balance ?? c.current_balance) > 0).length === 0 && (
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

                {/* Daily Sales Quick Stat & Link */}
                <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-500/15 text-amber-700 rounded-xl">
                      <Scale className="w-4 h-4 text-amber-700 shrink-0" />
                    </div>
                    <span className="font-urdu text-amber-950">
                      آج کی کل سیلز: <strong className="font-mono text-slate-900">{kpis.todayWeight} KG</strong> فروخت • رقم: <strong className="font-mono text-slate-900">Rs. {kpis.todaySales.toLocaleString()}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('daily_sales')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-urdu font-bold text-xs transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <span>روزانہ سیلز و کلو ریکارڈ کھولیں</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={handleSaveSale} className="space-y-6">
                  {/* Customer Selector (Streamlined: Direct Cash Sale by default, optional Khata Customer) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 font-urdu">
                        گاہک کھاتہ منتخب کریں (اختیاری - نقد کسٹمر کے لیے خالی چھوڑیں):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomer(null);
                          setCustomerModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 font-urdu"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ نیا کھاتہ دار شامل کریں</span>
                      </button>
                    </div>

                    <div className="flex gap-2 items-center">
                      <select
                        value={posCustomerId}
                        onChange={e => {
                          const newId = e.target.value;
                          setPosCustomerId(newId);
                          if (newId) {
                            setPosPaymentMethod('credit');
                            setPosReceivedAmount('0');
                          } else {
                            setPosPaymentMethod('cash');
                          }
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600"
                      >
                        <option value="">-- نقد خریدار (Direct Counter Cash Sale) --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.shop_name ? `(${c.shop_name})` : ''} — سابقہ بقایا: Rs.{c.current_balance.toLocaleString()}
                          </option>
                        ))}
                      </select>
                      {posCustomerId && (
                        <button
                          type="button"
                          onClick={() => setPosCustomerId('')}
                          className="px-2.5 py-2 text-xs text-slate-500 hover:text-rose-600 bg-white border border-slate-300 rounded-xl font-urdu"
                          title="نقد کسٹمر پر واپس کریں"
                        >
                          نقد پر واپس
                        </button>
                      )}
                    </div>

                    {posSelectedCustomer && (
                      <div className="p-2.5 bg-rose-50/80 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                        <span className="text-rose-900 font-urdu font-medium">
                          گاہک: <strong>{posSelectedCustomer.name}</strong> • سابقہ کھاتہ بقایا (Previous Khata Due):
                        </span>
                        <span className="font-mono font-black text-rose-700">
                          Rs. {posSelectedCustomer.current_balance.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chicken Items & Cuts Section (Multi-Item with + Button & Price during sale) */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-300 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl shrink-0">
                          🍗
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-urdu">
                              چکن کٹس و آئٹمز (Chicken Items & Cuts)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ملٹی آئٹم بل
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-urdu mt-0.5">
                            کیٹیگری منتخب کریں، وزن درج کریں اور قیمت/ریٹ براہ راست سیل کے وقت مقرر کریں
                          </p>
                        </div>
                      </div>

                      {/* Header Actions: Current Scale Stock + Add Item button */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-right">
                          <span className="text-[10px] text-slate-400 block font-urdu">اسکیل اسٹاک</span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {freshProd.stock_kg || 0} KG
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handlePosAddItemRow}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold font-urdu rounded-xl shadow-xs transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ نیا آئٹم شامل کریں (Add Cut)</span>
                        </button>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                      {posItems.map((item, index) => {
                        const itemWeight = Number(item.weightKg) || 0;
                        const itemRate = Number(item.ratePerKg) || 0;
                        const itemTotal = Math.round(itemWeight * itemRate);

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 transition space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                              <span className="text-xs font-bold text-amber-800 font-urdu flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-mono flex items-center justify-center font-bold">
                                  {index + 1}
                                </span>
                                <span>آئٹم #{index + 1}</span>
                              </span>

                              {posItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handlePosRemoveItemRow(item.id)}
                                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 transition font-urdu flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف کریں</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                              {/* 1. Category Dropdown */}
                              <div className="md:col-span-4 space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 block font-urdu">
                                  چکن کیٹیگری (Category) *
                                </label>
                                <select
                                  value={item.categoryId}
                                  onChange={e => handlePosCategoryChange(item.id, e.target.value)}
                                  className="w-full bg-white border-2 border-slate-200 focus:border-amber-600 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 font-urdu focus:outline-none transition shadow-2xs"
                                >
                                  {categories.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.urdu_name} ({c.name})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 2. Weight Input + Quick buttons */}
                              <div className="md:col-span-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-slate-700 font-urdu">
                                    وزن (Weight in KG) *
                                  </label>
                                  <span className="text-[10px] text-slate-400 font-mono">0.5 = آدھا کلو</span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0.05"
                                    step="0.01"
                                    required
                                    value={item.weightKg}
                                    onChange={e => handlePosWeightChange(item.id, e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-white border-2 border-slate-200 focus:border-amber-600 text-slate-900 rounded-xl pl-3 pr-9 py-2 text-sm sm:text-base font-mono font-black focus:outline-none transition shadow-2xs"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 font-mono">
                                    KG
                                  </span>
                                </div>
                                <div className="flex items-center flex-wrap gap-1 pt-0.5">
                                  {[0.5, 1, 2, 5].map(kg => (
                                    <button
                                      key={kg}
                                      type="button"
                                      onClick={() => handlePosQuickWeight(item.id, kg)}
                                      className="px-2 py-0.5 bg-slate-200/80 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[10px] font-mono font-bold rounded-md border border-slate-300 transition"
                                    >
                                      +{kg}k
                                    </button>
                                  ))}
                                  {item.weightKg && (
                                    <button
                                      type="button"
                                      onClick={() => handlePosWeightChange(item.id, '')}
                                      className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded border border-rose-200 transition font-urdu"
                                    >
                                      صاف
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* 3. Rate per KG (Price defined at sale) */}
                              <div className="md:col-span-3 space-y-1">
                                <label className="text-[11px] font-bold text-slate-700 block font-urdu">
                                  فروخت ریٹ (Rate / KG) *
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    Rs.
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={item.ratePerKg}
                                    onChange={e => handlePosRateChange(item.id, e.target.value)}
                                    placeholder="400"
                                    className="w-full bg-white border-2 border-slate-200 focus:border-amber-600 rounded-xl pl-8 pr-2.5 py-2 text-sm sm:text-base font-mono font-black text-slate-900 focus:outline-none transition shadow-2xs"
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 font-urdu block">
                                  سیل کے وقت ریٹ درج کریں
                                </span>
                              </div>

                              {/* 4. Row Line Total */}
                              <div className="md:col-span-2 p-2.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-center md:text-right">
                                <span className="text-[10px] font-bold text-amber-900 block font-urdu">
                                  کل رقم
                                </span>
                                <div className="text-base sm:text-lg font-mono font-black text-amber-700">
                                  Rs. {itemTotal.toLocaleString()}
                                </div>
                                <span className="text-[9px] text-amber-800 font-urdu block">
                                  {itemWeight}k × Rs.{itemRate}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Prominent Bottom Add Item Row Button */}
                    <button
                      type="button"
                      onClick={handlePosAddItemRow}
                      className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 border-2 border-dashed border-amber-300 hover:border-amber-500 text-amber-900 rounded-xl font-bold font-urdu text-xs flex items-center justify-center gap-2 transition active:scale-[0.99]"
                    >
                      <Plus className="w-4 h-4 text-amber-700" />
                      <span>+ نیا آئٹم / کٹ شامل کریں (Add Another Item / Chicken Cut)</span>
                    </button>
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
                      <label className="text-xs font-bold text-slate-700 block font-urdu">
                        طریقہ ادائیگی (Payment Method) *
                      </label>
                      {posCustomerId ? (
                        <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">📝</span>
                            <div>
                              <span className="text-xs font-bold text-rose-950 font-urdu block">
                                ادائیگی کا طریقہ: مکمل ادھار (Mukammal Udhaar / Full Credit)
                              </span>
                              <span className="text-[11px] text-rose-700 font-urdu">
                                بل کی کل رقم Rs. {posFinalTotal.toLocaleString()} گاہک کے کھاتے میں بطور ادھار شامل ہو گی۔
                              </span>
                            </div>
                          </div>
                          <span className="px-3 py-1.5 bg-rose-600 text-white text-xs font-black rounded-xl font-urdu shrink-0 shadow-xs">
                            مکمل ادھار
                          </span>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">💵</span>
                            <div>
                              <span className="text-xs font-bold text-emerald-950 font-urdu block">
                                کاؤنٹر سیل: مکمل نقد (Full Cash Sale)
                              </span>
                              <span className="text-[11px] text-emerald-700 font-urdu">
                                واک ان گاہک — 100% نقد رقم کاؤنٹر دراز میں جمع ہو گی۔
                              </span>
                            </div>
                          </div>
                          <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-xl font-urdu shrink-0 shadow-xs">
                            مکمل نقد
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Received and Remaining - only show if walk-in or details needed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                          وصول شدہ نقد رقم (Cash Received)
                        </label>
                        <div className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-sm text-emerald-700 flex items-center justify-between">
                          <span>Rs.</span>
                          <span>{posCustomerId ? '0' : posFinalTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                          کھاتے میں بقایا ادھار (Remaining Due)
                        </label>
                        <div className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl font-mono font-black text-sm text-rose-700 flex items-center justify-between">
                          <span>Rs.</span>
                          <span>{posCustomerId ? posFinalTotal.toLocaleString() : '0'}</span>
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

                  {/* Stock Limit Warning */}
                  {posTotalWeight > (Number(freshProd?.stock_kg) || 0) && (
                    <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-urdu shadow-xs">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <strong className="block font-bold">غلطی: چکن کا وزن موجودہ دستیاب اسٹاک سے زیادہ ہے!</strong>
                        <span>
                          آپ نے <strong>{posTotalWeight} KG</strong> درج کیا ہے جبکہ کاؤنٹر اسکیل پر صرف <strong>{freshProd?.stock_kg || 0} KG</strong> تازہ چکن دستیاب ہے۔ آپ اسٹاک سے زیادہ وزن فروخت نہیں کر سکتے۔
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={posSaving || posTotalWeight > (Number(freshProd?.stock_kg) || 0) || (Number(freshProd?.stock_kg) || 0) <= 0}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-sm rounded-2xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 font-urdu disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {posSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Printer className="w-5 h-5" />
                      )}
                      <span>
                        {posTotalWeight > (Number(freshProd?.stock_kg) || 0)
                          ? `اسٹاک ناکافی ہے (دستیاب: ${freshProd?.stock_kg || 0} KG)`
                          : 'بل محفوظ کریں اور رسید پرنٹ کریں (Save & Print Invoice)'}
                      </span>
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

                    {/* Direct Khata Bill Entry Button */}
                    <button
                      onClick={() => {
                        setKhataEntryCustomer(null);
                        setKhataEntryModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
                      title="گاہک کے کھاتے میں نیا سودا / بل درج کریں"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ نیا کھاتہ بل (سودا)</span>
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
                        {(() => {
                          const stats = customerStatsMap.get(cust.id) || {
                            balance: Number(cust.current_balance) || 0,
                            billed: Number(cust.total_purchases) || 0,
                            paid: Number(cust.total_payments) || 0,
                          };
                          return (
                            <>
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
                                  stats.balance > 0
                                    ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                }`}>
                                  <span className="text-[10px] font-bold block uppercase">باقی کھاتہ</span>
                                  <span className="text-sm font-black font-mono">
                                    Rs. {stats.balance.toLocaleString()}
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
                                    Rs. {stats.billed.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-urdu">کل ادا شدہ:</span>
                                  <span className="font-mono font-bold text-emerald-700">
                                    Rs. {stats.paid.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => {
                            setKhataEntryCustomer(cust);
                            setKhataEntryModalOpen(true);
                          }}
                          className="py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 font-urdu active:scale-95 shadow-2xs"
                          title="نیا سودا / کھاتہ بل درج کریں"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>نیا سودا</span>
                        </button>
                        <button
                          onClick={() => setLedgerCustomer(cust)}
                          className="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 font-urdu active:scale-95"
                          title="کھاتہ لیجر دیکھیں"
                        >
                          <span>📖 کھاتہ لیجر</span>
                        </button>
                        <button
                          onClick={() => {
                            setPaymentCustomer(cust);
                            setPaymentModalOpen(true);
                          }}
                          className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 font-urdu active:scale-95"
                          title="رقم وصولی درج کریں"
                        >
                          <span>💵 وصولی</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingCustomer(cust);
                            setCustomerModalOpen(true);
                          }}
                          className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center justify-center gap-1 active:scale-95"
                          title="گاہک تفصیلات ایڈٹ کریں"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>ایڈٹ</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust)}
                          className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center justify-center gap-1 font-urdu active:scale-95"
                          title="گاہک و کھاتہ حذف کریں"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ڈیلیٹ</span>
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
            {/* TAB 4: FREEZER STOCK                                            */}
            {/* =============================================================== */}
            {activeTab === 'freezer' && (
              <FreezerStockTab
                freezerProducts={freezerProducts}
                customers={customers}
                sales={sales}
                onRefresh={loadAllData}
                onOpenReceipt={sale => setReceiptModalSale(sale)}
              />
            )}

            {/* =============================================================== */}
            {/* TAB: CHICKEN CATEGORIES (CUTS & PRODUCT RATES)                  */}
            {/* =============================================================== */}
            {activeTab === 'categories' && (
              <ChickenCategoriesTab
                categories={categories}
                onRefresh={() => loadAllData(false)}
              />
            )}

            {/* =============================================================== */}
            {/* TAB: CHICKEN WORKERS & LOGIN ACCOUNTS                           */}
            {/* =============================================================== */}
            {activeTab === 'workers' && (
              <ChickenWorkersTab
                workers={workers}
                onRefresh={() => loadAllData(false)}
              />
            )}

            {/* =============================================================== */}
            {/* TAB: SUPPLIER PAYMENTS REGISTER                                 */}
            {/* =============================================================== */}
            {activeTab === 'supplier_payments' && (
              <SupplierPaymentsTab
                arrivals={freshArrivals}
                onRecordPayment={handleRecordSupplierPayment}
                onDeleteArrival={handleDeleteFreshArrival}
                onOpenArrivalModal={() => {
                  setSelectedArrivalCategoryId(null);
                  setFreshArrivalModalOpen(true);
                }}
              />
            )}

            {/* =============================================================== */}
            {/* TAB: DAILY SALES & KG RECORD                                    */}
            {/* =============================================================== */}
            {(activeTab === 'daily_sales' || (activeTab as string) === 'sales_history') && (
              <DailySalesTab
                sales={sales}
                payments={payments}
                customers={customers}
                products={products}
                freshArrivals={freshArrivals}
                expenses={expenses}
                onOpenReceipt={sale => setReceiptModalSale(sale)}
                onDeleteSale={handleDeleteSale}
                onDeletePayment={handleDeletePayment}
                onNewSaleClick={(mode?: 'cash' | 'credit') => {
                  if (mode === 'credit') {
                    setPosPaymentMethod('credit');
                  } else {
                    setPosPaymentMethod('cash');
                  }
                  setActiveTab('pos');
                }}
                onOpenBulkWalkin={date => {
                  if (date) setBulkWalkinDate(date);
                  setBulkWalkinModalOpen(true);
                }}
                onOpenPaymentModal={cust => {
                  setPaymentCustomer(cust || null);
                  setPaymentModalOpen(true);
                }}
                onOpenFreshArrival={() => {
                  setSelectedArrivalCategoryId(null);
                  setFreshArrivalModalOpen(true);
                }}
                onOpenMushtarkaKhata={() => setMushtarkaKhataModalOpen(true)}
              />
            )}

            {/* =============================================================== */}
            {/* TAB 8: PROFIT & LOSS REPORTS                                    */}
            {/* =============================================================== */}
            {activeTab === 'profit_loss' && (
              <ProfitLossTab
                sales={sales}
                freshArrivals={freshArrivals}
                products={products}
                freezerProducts={freezerProducts}
                expenses={expenses}
                customers={customers}
                onAddExpense={() => setExpenseModalOpen(true)}
                onDeleteExpense={handleDeleteExpense}
                onDeleteFreshArrival={handleDeleteFreshArrival}
              />
            )}
          </>
        )}
      </main>
    </div>

      {/* ===================================================================== */}
      {/* MODALS                                                                */}
      {/* ===================================================================== */}
      {/* Printable Sale Receipt Modal */}
      <SaleReceiptModal
        sale={receiptModalSale}
        onClose={() => setReceiptModalSale(null)}
      />

      {/* Bulk Walk-in Cash Sale Modal (All cuts entered together, stock auto-deducted) */}
      <BulkWalkinSaleModal
        isOpen={bulkWalkinModalOpen}
        onClose={() => setBulkWalkinModalOpen(false)}
        products={products}
        onSaveSuccess={loadAllData}
        defaultDate={bulkWalkinDate}
      />

      {/* Customer Full Khata Ledger Statement Modal */}
      <CustomerLedgerModal
        customer={ledgerCustomer}
        refreshTrigger={ledgerRefreshTrigger}
        onClose={() => setLedgerCustomer(null)}
        onRecordPayment={c => {
          setPaymentCustomer(c);
          setPaymentModalOpen(true);
        }}
        onNewSale={c => {
          setKhataEntryCustomer(c);
          setKhataEntryModalOpen(true);
        }}
        onCustomerUpdated={loadAllData}
        onDeleteCustomer={handleDeleteCustomer}
      />

      {/* Multi-Item Customer Khata Bill Entry Modal */}
      <CustomerKhataEntryModal
        isOpen={khataEntryModalOpen}
        customer={khataEntryCustomer}
        allCustomers={customers}
        categories={categories}
        availableStock={Number(freshProd?.stock_kg) || 0}
        onClose={() => setKhataEntryModalOpen(false)}
        onSuccess={newSale => {
          loadAllData(false);
          setReceiptModalSale(newSale);
        }}
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

      {/* Fresh Chicken Stock Arrival Modal */}
      <FreshChickenArrivalModal
        isOpen={freshArrivalModalOpen}
        products={products}
        initialCategoryId={selectedArrivalCategoryId}
        currentSellingRate={freshKpis.currentSellingRate}
        onClose={() => {
          setFreshArrivalModalOpen(false);
          setSelectedArrivalCategoryId(null);
        }}
        onSuccess={loadAllData}
      />

      {/* Fresh Chicken Selling Rate Quick Modal */}
      {freshRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <h3 className="font-bold text-sm font-urdu">تازہ چکن کا فروخت ریٹ تبدیل کریں</h3>
              </div>
              <button
                onClick={() => setFreshRateModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSellingRate} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                  نیا فروخت ریٹ فی کلو (PKR / KG) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={newFreshSellingRate}
                    onChange={e => setNewFreshSellingRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-12 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                    placeholder="مثال: 450"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    PKR
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  موجودہ ریٹ: Rs. {freshKpis.currentSellingRate} / KG
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFreshRateModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-urdu transition active:scale-95 shadow-xs"
                >
                  ریٹ محفوظ کریں
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fresh Chicken Stock Edit Modal */}
      {editFreshStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <h3 className="font-bold text-sm font-urdu">تازہ چکن اسٹاک درست / تبدیل کریں</h3>
              </div>
              <button
                onClick={() => setEditFreshStockModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateFreshStock} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 font-urdu">
                  نیا اسکیل وزن / اسٹاک (KG) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editFreshStockValue}
                    onChange={e => setEditFreshStockValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-12 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    placeholder="مثال: 125.5"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    KG
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-urdu">
                  موجودہ رجسٹرڈ اسٹاک: <strong className="font-mono text-slate-800">{Number((freshProd.stock_kg || 0).toFixed(2))} KG</strong>
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditFreshStockModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={stockUpdating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-urdu transition active:scale-95 shadow-xs disabled:opacity-50"
                >
                  {stockUpdating ? 'محفوظ ہو رہا ہے...' : 'اسٹاک محفوظ کریں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop Expense Recording Modal */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={loadAllData}
      />

      {/* Mushtarka Khata (1-2 KG Credit) Modal */}
      <MushtarkaKhataModal
        isOpen={mushtarkaKhataModalOpen}
        onClose={() => setMushtarkaKhataModalOpen(false)}
        categories={categories}
        onDataChanged={loadAllData}
      />

      {/* Floating Realtime Notification Toast */}
      {latestToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md text-white border-2 border-emerald-500 rounded-3xl p-4 shadow-2xl animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-400 font-urdu">{latestToast.title}</h4>
                <span className="text-[10px] text-slate-400 font-mono">{latestToast.timestamp}</span>
              </div>
            </div>
            <button
              onClick={() => setLatestToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-xs font-urdu text-slate-200 leading-relaxed font-bold">
            {latestToast.message}
          </p>
          {latestToast.details && (
            <p className="mt-1 text-[11px] font-urdu text-amber-300">
              {latestToast.details}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
