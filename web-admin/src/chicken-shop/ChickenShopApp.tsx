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
  ChickenSaleItem,
  ChickenPayment,
  ChickenStockLog,
  FreshChickenArrival,
  ChickenExpense,
} from './types';
import {
  chickenShopApi,
  DEFAULT_CHICKEN_PRODUCTS,
  FRESH_CHICKEN_PRODUCT_ID,
  DEFAULT_FRESH_CHICKEN_PRODUCT,
} from './api';
import { SaleReceiptModal } from './SaleReceiptModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { PaymentModal } from './PaymentModal';
import { StockModal } from './StockModal';
import { CustomerEditModal } from './CustomerEditModal';
import { ProductEditModal } from './ProductEditModal';
import { FreshChickenArrivalModal } from './FreshChickenArrivalModal';
import { ExpenseModal } from './ExpenseModal';
import { ProfitLossTab } from './ProfitLossTab';
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
} from 'lucide-react';

interface ChickenShopAppProps {
  onBackToWaste?: () => void;
  standalone?: boolean;
}

type TabType = 'dashboard' | 'pos' | 'stock' | 'customers' | 'products' | 'sales_history' | 'profit_loss';

export const ChickenShopApp: React.FC<ChickenShopAppProps> = ({ onBackToWaste, standalone = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Core Data
  const [products, setProducts] = useState<ChickenProduct[]>([]);
  const [customers, setCustomers] = useState<ChickenCustomer[]>([]);
  const [sales, setSales] = useState<ChickenSale[]>([]);
  const [payments, setPayments] = useState<ChickenPayment[]>([]);
  const [stockLogs, setStockLogs] = useState<ChickenStockLog[]>([]);
  const [freshArrivals, setFreshArrivals] = useState<FreshChickenArrival[]>([]);
  const [expenses, setExpenses] = useState<ChickenExpense[]>([]);

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
  const [freshArrivalModalOpen, setFreshArrivalModalOpen] = useState<boolean>(false);
  const [selectedArrivalCategoryId, setSelectedArrivalCategoryId] = useState<string | null>(null);
  const [freshRateModalOpen, setFreshRateModalOpen] = useState<boolean>(false);
  const [newFreshSellingRate, setNewFreshSellingRate] = useState<string>('');
  const [freshSubTab, setFreshSubTab] = useState<'arrivals' | 'sales'>('arrivals');
  const [freshSalesFilter, setFreshSalesFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);

  // POS State (Simplified: No walk-in tabs or walk-in name/phone clutter)
  const [posCustomerId, setPosCustomerId] = useState<string>('');
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
      const [pList, cList, sList, payList, logs, fArrivals, expList] = await Promise.all([
        chickenShopApi.getProducts(),
        chickenShopApi.getCustomers(),
        chickenShopApi.getSales(),
        chickenShopApi.getPayments(),
        chickenShopApi.getStockLogs(),
        chickenShopApi.getFreshChickenArrivals(),
        chickenShopApi.getExpenses(),
      ]);

      // Automatically sync and repair live Fresh Chicken stock from arrivals minus sales
      const totalArrivalKg = fArrivals.reduce((sum, a) => sum + (Number(a.weight_kg) || 0), 0);
      const totalFreshSoldKg = sList.reduce((sum, s) => {
        return (
          sum +
          s.items.reduce((iSum, it) => {
            if (
              it.product_id === FRESH_CHICKEN_PRODUCT_ID ||
              it.product_name.toLowerCase().includes('fresh chicken') ||
              (it.urdu_name && it.urdu_name.includes('تازہ مرغی'))
            ) {
              return iSum + (Number(it.weight_kg) || 0);
            }
            return iSum;
          }, 0)
        );
      }, 0);

      const netLiveFreshStock = Math.max(0, Number((totalArrivalKg - totalFreshSoldKg).toFixed(2)));
      const fcIdx = pList.findIndex(p => p.id === FRESH_CHICKEN_PRODUCT_ID);
      if (fcIdx !== -1) {
        if (pList[fcIdx].stock_kg !== netLiveFreshStock) {
          pList[fcIdx].stock_kg = netLiveFreshStock;
          chickenShopApi.saveProduct({
            ...pList[fcIdx],
            stock_kg: netLiveFreshStock,
          }).catch(console.error);
        }
      }

      setProducts(pList);
      setCustomers(cList);
      setSales(sList);
      setPayments(payList);
      setStockLogs(logs);
      setFreshArrivals(fArrivals);
      setExpenses(expList);

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

    // Compute fresh chicken live stock to ensure 100% accurate total stock & valuation
    const totalFreshArrivalKg = freshArrivals.reduce((s, a) => s + (Number(a.weight_kg) || 0), 0);
    const totalFreshSoldKg = sales.reduce((s, sale) => {
      return (
        s +
        sale.items.reduce((iSum, it) => {
          if (
            it.product_id === FRESH_CHICKEN_PRODUCT_ID ||
            it.product_name.toLowerCase().includes('fresh chicken') ||
            (it.urdu_name && it.urdu_name.includes('تازہ مرغی'))
          ) {
            return iSum + (Number(it.weight_kg) || 0);
          }
          return iSum;
        }, 0)
      );
    }, 0);
    const liveFreshStockKg = Math.max(0, Number((totalFreshArrivalKg - totalFreshSoldKg).toFixed(2)));

    const totalStock = products.reduce((s, p) => {
      if (p.id === FRESH_CHICKEN_PRODUCT_ID) {
        return s + liveFreshStockKg;
      }
      return s + (Number(p.stock_kg) || 0);
    }, 0);

    const totalStockValuation = products.reduce((s, p) => {
      if (p.id === FRESH_CHICKEN_PRODUCT_ID) {
        return s + Math.round(liveFreshStockKg * (Number(p.rate_per_kg) || 0));
      }
      return s + Math.round((Number(p.stock_kg) || 0) * (Number(p.rate_per_kg) || 0));
    }, 0);

    const lowStockCount = products.filter(p => p.stock_kg <= p.min_stock_alert).length;

    return {
      todaySales,
      todayCash,
      todayCredit,
      todayWeight: Number(todayWeight.toFixed(2)),
      marketDue,
      totalStock: Number(totalStock.toFixed(2)),
      totalStockValuation,
      lowStockCount,
      todayBillsCount: todaySalesList.length,
    };
  }, [todaySalesList, customers, products, freshArrivals, sales]);

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

    const totalArrivalKg = Number(freshArrivals.reduce((s, a) => s + (a.weight_kg || 0), 0).toFixed(2));
    const totalArrivalCost = freshArrivals.reduce((s, a) => s + (a.total_cost || 0), 0);
    const totalFreshSoldKg = Number(freshSalesItems.reduce((s, x) => s + (x.item.weight_kg || 0), 0).toFixed(2));

    // Live Available Stock of Fresh Chicken (Accurate live calculation: arrivals minus sales)
    const stockKg = Math.max(0, Number((totalArrivalKg - totalFreshSoldKg).toFixed(2)));
    const currentSellingRate = Number(freshProd.rate_per_kg) || 450;
    const currentStockValue = Math.round(stockKg * currentSellingRate);

    // Arrivals stats
    const todayArrivals = freshArrivals.filter(a => a.date === today);
    const todayArrivalKg = Number(todayArrivals.reduce((s, a) => s + (a.weight_kg || 0), 0).toFixed(2));
    const todayArrivalCost = todayArrivals.reduce((s, a) => s + (a.total_cost || 0), 0);
    const todayAvgPurchaseRate =
      todayArrivalKg > 0
        ? Math.round(todayArrivalCost / todayArrivalKg)
        : freshArrivals[0]?.rate_per_kg || 380;

    // Sales stats
    const todaySales = freshSalesItems.filter(x => x.sale.sale_date === today);
    const todaySoldKg = Number(todaySales.reduce((s, x) => s + (x.item.weight_kg || 0), 0).toFixed(2));
    const todaySoldRevenue = todaySales.reduce((s, x) => s + (x.item.line_total || 0), 0);
    const todayAvgSellingRate =
      todaySoldKg > 0 ? Math.round(todaySoldRevenue / todaySoldKg) : currentSellingRate;

    // Gross profit margin today
    const todayEstimatedCostOfSold = Math.round(todaySoldKg * todayAvgPurchaseRate);
    const todayGrossMargin = todaySoldRevenue - todayEstimatedCostOfSold;
    const todayMarginPerKg = todayAvgSellingRate - todayAvgPurchaseRate;

    // Filtered sales for history table
    const filteredSales = freshSalesItems.filter(x => {
      if (freshSalesFilter === 'today') return x.sale.sale_date === today;
      if (freshSalesFilter === 'week') return x.sale.sale_date >= sevenDaysAgo;
      if (freshSalesFilter === 'month') return x.sale.sale_date >= thirtyDaysAgo;
      return true;
    });

    const filteredSoldKg = Number(filteredSales.reduce((s, x) => s + (x.item.weight_kg || 0), 0).toFixed(2));
    const filteredSoldRevenue = filteredSales.reduce((s, x) => s + (x.item.line_total || 0), 0);

    return {
      stockKg,
      currentSellingRate,
      currentStockValue,
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
      filteredSales,
      filteredSoldKg,
      filteredSoldRevenue,
    };
  }, [freshProd, freshArrivals, freshSalesItems, freshSalesFilter]);

  const handleDeleteFreshArrival = async (entry: FreshChickenArrival) => {
    if (!confirm(`کیا آپ واقعی یہ آمد (${entry.weight_kg} KG) حذف کرنا چاہتے ہیں؟ اس سے اسٹاک واپس کم ہو جائے گا۔`)) {
      return;
    }
    try {
      await chickenShopApi.deleteFreshChickenArrival(entry.id);
      await loadAllData();
    } catch (err: any) {
      alert(`آمد حذف کرنے میں مسئلہ: ${err.message || 'Error deleting arrival'}`);
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

  const handleQuickFreshChickenSale = () => {
    setActiveTab('pos');
    setPosItems([
      {
        product_id: freshProd.id,
        product_name: freshProd.name,
        weight_kg: '',
        rate_per_kg: String(freshProd.rate_per_kg),
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
      alert(`انوائس #${sale.invoice_no} کامیابی سے حذف ہو گئی اور اسٹاک بحال ہو گیا۔`);
    } catch (err: any) {
      alert(`سیل حذف کرنے میں خرابی: ${err.message || 'Error deleting sale'}`);
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

  // Add POS row: any meat cut from products
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

  const handleQuickAddWeight = (index: number, addKg: number) => {
    setPosItems(prev => {
      const copy = [...prev];
      const cur = Number(copy[index].weight_kg) || 0;
      copy[index] = { ...copy[index], weight_kg: String(Number((cur + addKg).toFixed(2))) };
      return copy;
    });
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
    if (posPaymentMethod === 'credit' && !posCustomerId) {
      alert('ادھار کھاتہ سیل کے لیے براہ کرم گاہک منتخب کریں یا ادائیگی کا طریقہ نقد (Cash) رکھیں');
      return;
    }

    const customerName = posSelectedCustomer ? posSelectedCustomer.name : 'نقد خریدار (Cash Sale)';
    const customerPhone = posSelectedCustomer ? posSelectedCustomer.phone : null;

    try {
      setPosSaving(true);
      const newSale = await chickenShopApi.createSale({
        customer_id: posCustomerId || null,
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
      if (customerFilter === 'due') return c.current_balance > 0;
      if (customerFilter === 'clear') return c.current_balance === 0;
      return true;
    });
  }, [customers, searchQuery, customerFilter]);

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
      id: 'stock',
      label: 'تازہ گوشت و اسٹاک کٹس',
      sublabel: 'Fresh Stock & Meat Cuts',
      icon: Package,
      badge: `${kpis.totalStock}kg`,
      badgeColor: 'bg-emerald-600',
    },
    {
      id: 'customers',
      label: 'گاہک کھاتہ رجسٹر',
      sublabel: 'Digi Khata & Ledger',
      icon: Users,
      badge: kpis.marketDue > 0 ? `Rs.${Math.round(kpis.marketDue / 1000)}k` : undefined,
      badgeColor: 'bg-rose-500',
    },
    { id: 'products', label: 'مصنوعات و ریٹ لسٹ', sublabel: 'Products & Daily Rates', icon: Tag },
    { id: 'sales_history', label: 'سیلز رجسٹر و بلز', sublabel: 'Sales Invoices & History', icon: History },
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
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-amber-500/20">
              🐔
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight font-urdu">
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

        {/* Quick CTA inside sidebar */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <button
            onClick={() => {
              setActiveTab('pos');
              setMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 font-urdu"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>+ نیا بل بنائیں (POS Sale)</span>
          </button>
          <button
            onClick={() => {
              setSelectedArrivalCategoryId(null);
              setFreshArrivalModalOpen(true);
              setMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-blue-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition active:scale-95 font-urdu"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>+ تازہ چکن گوشت آمد</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition text-right group ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl transition ${
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
                    <span className="block text-[10px] text-slate-400 group-hover:text-slate-300 font-sans leading-tight mt-0.5">
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
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -mr-1 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="کھولیں مینو"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 font-urdu tracking-tight">
                {activeTab === 'dashboard' && 'ڈیش بورڈ اور اہم جائزہ (Dashboard)'}
                {activeTab === 'pos' && 'نیا بل اور کاؤنٹر سیل (POS)'}
                {activeTab === 'stock' && 'تازہ چکن گوشت و اسٹاک کیٹیگریز (Stock)'}
                {activeTab === 'customers' && 'گاہک و ڈیجیٹل کھاتہ لیجر (Khata)'}
                {activeTab === 'products' && 'چکن مصنوعات و روزانہ ریٹ لسٹ (Products)'}
                {activeTab === 'sales_history' && 'سیلز رجسٹر و سابقہ بلز (Invoices)'}
                {activeTab === 'profit_loss' && 'نفع و نقصان اور مالیاتی رپورٹس (P&L)'}
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Shan Poultry & Chicken Shop Management System
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedArrivalCategoryId(null);
                setFreshArrivalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ تازہ چکن آمد</span>
              <span className="sm:hidden">+ آمد</span>
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>+ نیا بل</span>
            </button>
            <button
              onClick={() => {
                setPaymentCustomer(null);
                setPaymentModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>+ رقم وصولی</span>
            </button>
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
                  <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
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
                      <p className="text-xs font-black text-emerald-700 font-mono mt-0.5">
                        مالیت: Rs. {kpis.totalStockValuation.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-blue-600 mt-0.5">
                        {products.length} کٹس • {kpis.lowStockCount > 0 ? `${kpis.lowStockCount} کم اسٹاک` : 'اسٹاک مناسب'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fresh Chicken Quick Action Banner */}
                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/70 p-4 rounded-3xl border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-xl shadow-xs">
                      🐔
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 font-urdu">
                        تازہ چکن اسٹاک (Live Chicken): <span className="font-mono text-amber-900 font-black">{freshKpis.stockKg} KG</span> دستیاب
                      </h4>
                      <p className="text-[11px] text-slate-600 font-urdu mt-0.5">
                        خرید ریٹ: Rs. {freshKpis.todayAvgPurchaseRate}/KG • فروخت ریٹ: Rs. {freshKpis.currentSellingRate}/KG • آج فروخت: {freshKpis.todaySoldKg} KG (Rs. {freshKpis.todaySoldRevenue.toLocaleString()})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFreshArrivalModalOpen(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-2xs"
                    >
                      + نیا چکن آمد
                    </button>
                    <button
                      onClick={handleQuickFreshChickenSale}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-2xs"
                    >
                      + نیا بل بنائیں
                    </button>
                    <button
                      onClick={() => setActiveTab('stock')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold font-urdu transition active:scale-95 shadow-2xs"
                    >
                      مکمل رجسٹر →
                    </button>
                  </div>
                </div>

                {/* Stock Level Quick Badges */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 font-urdu flex items-center gap-2">
                        <span>🍗 چکن کٹس اور موجودہ اسٹاک کی صورتحال (Meat Cuts Stock Levels)</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        مجموعی اسٹاک مالیت: <strong className="text-emerald-700 font-mono">Rs. {kpis.totalStockValuation.toLocaleString()}</strong>
                      </p>
                    </div>
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
                      const totalVal = Math.round((Number(p.stock_kg) || 0) * (Number(p.rate_per_kg) || 0));
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-2xl border text-center transition flex flex-col justify-between ${
                            isLow
                              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                              : 'bg-slate-50 border-slate-200/80 text-slate-900'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-bold block truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-500 block font-urdu truncate">{p.urdu_name}</span>
                            <p className="text-base font-black font-mono mt-1">
                              {p.stock_kg} <span className="text-[10px] font-normal">KG</span>
                            </p>
                            <span className="text-[10px] font-semibold text-amber-700 block">
                              Rs. {p.rate_per_kg}/kg
                            </span>
                          </div>
                          <div className="mt-1.5 pt-1 border-t border-slate-200/60">
                            <span className="text-[10px] font-bold text-emerald-800 block font-mono">
                              Rs. {totalVal.toLocaleString()}
                            </span>
                          </div>
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
                        onChange={e => setPosCustomerId(e.target.value)}
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

                  {/* Meat Cuts Items Selection */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
                      <div>
                        <span className="text-xs font-bold text-slate-800 font-urdu block">
                          🍗 چکن و گوشت کٹس (Select Chicken Cuts & Weight)
                        </span>
                        <span className="text-[11px] text-slate-500 font-urdu">
                          کاؤنٹر سے کٹ، وزن اور ریٹ درج کریں یا فاسٹ بٹن استعمال کریں
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPosRow}
                        className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 font-urdu self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ مزید کٹ شامل کریں (Add Meat Cut)</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {posItems.map((item, index) => {
                        const prod = products.find(p => p.id === item.product_id);
                        const weight = Number(item.weight_kg) || 0;
                        const rate = Number(item.rate_per_kg) || 0;
                        const lineTotal = Math.round(weight * rate);
                        const availableStock = prod?.stock_kg || 0;

                        return (
                          <div key={index} className="p-3.5 bg-white flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            {/* Product Selection */}
                            <div className="w-full md:flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-500 font-urdu">
                                  پروڈکٹ / گوشت کٹ:
                                </label>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                  availableStock <= 10 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  دستیاب اسٹاک: {availableStock} KG
                                </span>
                              </div>
                              <select
                                value={item.product_id}
                                onChange={e => handlePosProductChange(index, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.urdu_name}) — اسٹاک: {p.stock_kg} KG @ Rs.{p.rate_per_kg}/KG
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Weight & Rate Row */}
                            <div className="grid grid-cols-2 gap-2 md:contents">
                              <div className="w-full md:w-44">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1 font-urdu">
                                  وزن کلوگرام (Weight KG) *
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
                                {/* Quick Add Weight Pills */}
                                <div className="flex items-center gap-1 mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddWeight(index, 0.5)}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[10px] font-mono font-bold rounded border border-slate-200 transition"
                                  >
                                    +0.5k
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddWeight(index, 1)}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[10px] font-mono font-bold rounded border border-slate-200 transition"
                                  >
                                    +1k
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddWeight(index, 2)}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[10px] font-mono font-bold rounded border border-slate-200 transition"
                                  >
                                    +2k
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddWeight(index, 5)}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[10px] font-mono font-bold rounded border border-slate-200 transition"
                                  >
                                    +5k
                                  </button>
                                </div>
                              </div>

                              <div className="w-full md:w-32">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1 font-urdu">
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
                            </div>

                            {/* Line Total & Remove button */}
                            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-slate-100 md:border-0">
                              <div className="md:w-28 text-left md:text-right">
                                <span className="text-[10px] font-bold text-slate-500 block font-urdu">
                                  ٹوٹل رقم
                                </span>
                                <div className="text-sm font-mono font-black text-amber-700">
                                  Rs. {lineTotal.toLocaleString()}
                                </div>
                              </div>

                              {posItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePosRow(index)}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                                  title="آئٹم حذف کریں"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
            {/* TAB: CHICKEN MEAT & CUTS STOCK (UNIFIED)                        */}
            {/* =============================================================== */}
            {activeTab === 'stock' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Header Banner */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl shrink-0">
                        🍗
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-xl font-black text-slate-900 font-urdu tracking-tight">
                            تازہ چکن و تمام گوشت کٹس اسٹاک رجسٹر
                          </h2>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-sans px-2.5 py-0.5 rounded-full font-bold">
                            Live & Shop Inventory
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-urdu mt-1">
                          فارم سے تازہ مرغی کی آمد درج کریں، مخصوص کٹ (گوشت، بون لیس، تیکہ وغیرہ) میں اسٹاک جمع کریں اور ریٹ سیٹ کریں
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedArrivalCategoryId(null);
                        setFreshArrivalModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-black rounded-xl shadow-xs transition active:scale-95 font-urdu"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ تازہ چکن گوشت آمد (Farm Inflow)</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition active:scale-95 font-urdu"
                    >
                      <Plus className="w-4 h-4 text-amber-600" />
                      <span>+ نیا کٹ / پروڈکٹ</span>
                    </button>
                  </div>
                </div>

                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Stock Weight & Valuation */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between min-h-[150px]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 font-urdu">
                        کل دستیاب گوشت اسٹاک
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {products.length} کٹس فعال
                      </span>
                    </div>
                    <div className="my-2">
                      <div dir="ltr" className="text-3xl font-black text-slate-900 font-mono tracking-tight text-right">
                        {kpis.totalStock} <span className="text-sm font-sans text-slate-500 font-normal">KG</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-urdu text-slate-500">مجموعی اسٹاک مالیت:</span>
                        <span dir="ltr" className="font-mono font-black text-emerald-700">Rs. {kpis.totalStockValuation.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-urdu">تمام کٹس کا وزن × ریٹ</span>
                        <span className="font-mono">Total Valuation</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Today's Arrival */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between min-h-[150px]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700 font-urdu">
                        آج کی کل آمد (Farm Inflow)
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="my-2">
                      <div dir="ltr" className="text-3xl font-black text-blue-700 font-mono tracking-tight text-right">
                        {freshKpis.todayArrivalKg} <span className="text-sm font-sans text-slate-500 font-normal">KG</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-urdu text-slate-500">خرید لاگت:</span>
                        <span dir="ltr" className="font-mono font-black text-slate-800">Rs. {freshKpis.todayArrivalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-urdu text-slate-500">اوسط خرید ریٹ:</span>
                        <span dir="ltr" className="font-mono font-bold text-blue-600">Rs. {freshKpis.todayAvgPurchaseRate}/KG</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Today's Sold */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between min-h-[150px]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 font-urdu">
                        آج کی کل فروخت (Sold)
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="my-2">
                      <div dir="ltr" className="text-3xl font-black text-emerald-700 font-mono tracking-tight text-right">
                        {freshKpis.todaySoldKg} <span className="text-sm font-sans text-slate-500 font-normal">KG</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-urdu text-slate-500">سیل رقم:</span>
                        <span dir="ltr" className="font-mono font-black text-slate-800">Rs. {freshKpis.todaySoldRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-urdu text-slate-500">{freshKpis.todaySalesCount} بلز فروخت</span>
                        <span dir="ltr" className="font-mono font-bold text-emerald-700">Rs. {freshKpis.todayAvgSellingRate}/KG</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Estimated Gross Margin */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between min-h-[150px]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-700 font-urdu">
                        آج کا متوقع منافع (Margin)
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="my-2">
                      <div dir="ltr" className={`text-3xl font-black font-mono tracking-tight text-right ${freshKpis.todayGrossMargin >= 0 ? 'text-purple-700' : 'text-rose-700'}`}>
                        Rs. {freshKpis.todayGrossMargin.toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-urdu text-slate-500">مارجن فی کلو:</span>
                        <span dir="ltr" className={`font-mono font-black ${freshKpis.todayMarginPerKg >= 0 ? 'text-purple-700' : 'text-rose-700'}`}>
                          {freshKpis.todayMarginPerKg >= 0 ? `+Rs. ${freshKpis.todayMarginPerKg}` : `-Rs. ${Math.abs(freshKpis.todayMarginPerKg)}`}/KG
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-urdu">سیل منہا فارم خرید لاگت</span>
                        <span className="font-mono font-semibold text-purple-600">Gross Margin</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All Meat Categories Live Stock Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 font-urdu flex items-center gap-2">
                        <span>🍗 تمام گوشت کٹس اور لائیو اسٹاک (Meat Categories Stock Grid)</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-urdu">
                        کسی بھی کیٹیگری کے کارڈ پر "+ آمد اسٹاک" دبائیں تاکہ فارم آمد براہ راست اس کٹ میں جمع ہو سکے
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map(p => {
                      const isLow = p.stock_kg <= p.min_stock_alert;
                      const totalVal = Math.round((Number(p.stock_kg) || 0) * (Number(p.rate_per_kg) || 0));

                      return (
                        <div
                          key={p.id}
                          className={`p-4 rounded-3xl border transition flex flex-col justify-between ${
                            isLow
                              ? 'bg-rose-50/70 border-rose-200'
                              : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-extrabold text-sm text-slate-900 block">
                                  {p.name}
                                </span>
                                <span className="text-xs text-slate-500 font-urdu block">
                                  {p.urdu_name}
                                </span>
                              </div>
                              {isLow ? (
                                <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-bold rounded-md">
                                  کم اسٹاک
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                                  دستیاب
                                </span>
                              )}
                            </div>

                            <div className="flex items-baseline justify-between mt-3">
                              <p className="text-2xl font-black font-mono text-slate-900">
                                {p.stock_kg} <span className="text-xs font-normal text-slate-500 font-sans">KG</span>
                              </p>
                              <span className="font-mono font-bold text-xs text-amber-700">
                                Rs. {p.rate_per_kg} / kg
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                            <div className="p-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 flex items-center justify-between shadow-2xs">
                              <span className="text-[11px] font-black text-emerald-900 font-urdu">
                                کل مالیت (ٹوٹل قیمت):
                              </span>
                              <span className="font-mono font-black text-sm text-emerald-800 tracking-tight">
                                Rs. {totalVal.toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedArrivalCategoryId(p.id);
                                  setFreshArrivalModalOpen(true);
                                }}
                                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 font-urdu active:scale-95 border border-blue-200/70"
                                title="اس کیٹیگری میں اسٹاک آمد درج کریں"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ آمد اسٹاک</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProductModalOpen(true);
                                }}
                                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 font-urdu active:scale-95"
                                title="ریٹ یا تفصیل تبدیل کریں"
                              >
                                <Tag className="w-3.5 h-3.5 text-amber-600" />
                                <span>ریٹ سیٹ</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-Tab Navigation Header & Tables (Arrivals, Stock Logs, Sales) */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setFreshSubTab('arrivals')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition font-urdu ${
                          freshSubTab === 'arrivals'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span>🚚 فارم گاڑی آمد رجسٹر ({freshArrivals.length})</span>
                      </button>

                      <button
                        onClick={() => setFreshSubTab('sales')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition font-urdu ${
                          freshSubTab === 'sales'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Receipt className="w-4 h-4" />
                        <span>🧾 روزانہ گوشت سیلز ریکارڈز ({freshKpis.filteredSales.length})</span>
                      </button>
                    </div>

                    {freshSubTab === 'sales' && (
                      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                        <span className="text-[10px] text-slate-400 px-2 font-urdu">فلٹر:</span>
                        {(['today', 'week', 'month', 'all'] as const).map(flt => (
                          <button
                            key={flt}
                            onClick={() => setFreshSalesFilter(flt)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition ${
                              freshSalesFilter === flt
                                ? 'bg-amber-600 text-white font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {flt === 'today' ? 'آج' : flt === 'week' ? '7 دن' : flt === 'month' ? '30 دن' : 'تمام'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TAB 1: ARRIVALS LOG */}
                  {freshSubTab === 'arrivals' && (
                    <div>
                      {freshArrivals.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs">
                          <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-urdu">ابھی تک کوئی تازہ چکن آمد ریکارڈ نہیں ہے۔</p>
                          <button
                            onClick={() => {
                              setSelectedArrivalCategoryId(null);
                              setFreshArrivalModalOpen(true);
                            }}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold font-urdu hover:bg-blue-700 transition"
                          >
                            + پہلا تازہ چکن آمد شامل کریں
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[800px] text-xs text-right">
                            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-3 px-4 text-right">تاریخ و وقت</th>
                                <th className="py-3 px-3 text-right">کیٹیگری / کٹ</th>
                                <th className="py-3 px-3 text-right">فارم / سپلائر / گاڑی</th>
                                <th className="py-3 px-3 text-center">آمد وزن (KG)</th>
                                <th className="py-3 px-3 text-center">مرغیاں (تعداد)</th>
                                <th className="py-3 px-3 text-center">خرید ریٹ فی کلو</th>
                                <th className="py-3 px-3 text-center">کل خرید لاگت</th>
                                <th className="py-3 px-3 text-center">مقررہ فروخت ریٹ</th>
                                <th className="py-3 px-3 text-center">مارجن فی کلو</th>
                                <th className="py-3 px-3 text-right">نوٹس</th>
                                <th className="py-3 px-4 text-center">ایکشن</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {freshArrivals.map(a => {
                                const margin = a.selling_rate_per_kg - a.rate_per_kg;
                                return (
                                  <tr key={a.id} className="hover:bg-slate-50/70 transition">
                                    <td className="py-3 px-4 font-mono text-slate-700">
                                      <span className="block font-bold">{formatDate(a.date)}</span>
                                      <span className="text-[10px] text-slate-400">{a.time || '—'}</span>
                                    </td>
                                    <td className="py-3 px-3 font-bold text-amber-900 font-urdu">
                                      {a.category_name || 'زندہ مرغی (Live Broiler)'}
                                    </td>
                                    <td className="py-3 px-3 font-semibold text-slate-900">
                                      <span>{a.supplier_name || 'فارم سپلائی'}</span>
                                      {a.vehicle_no && (
                                        <span className="block font-mono text-[10px] text-slate-400">
                                          گاڑی: {a.vehicle_no}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm">
                                      {a.weight_kg} <span className="text-[10px] text-slate-500 font-normal">KG</span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                                      {a.birds_count ? `${a.birds_count}` : '—'}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                                      Rs. {a.rate_per_kg}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-black text-blue-700">
                                      Rs. {a.total_cost.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-black text-amber-700">
                                      Rs. {a.selling_rate_per_kg}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-bold">
                                      <span className={margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                        {margin >= 0 ? `+Rs.${margin}` : `-Rs.${Math.abs(margin)}`}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                                      {a.notes || '—'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <button
                                        onClick={() => handleDeleteFreshArrival(a)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                        title="حذف کریں"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: SALES RECORDS */}
                  {freshSubTab === 'sales' && (
                    <div>
                      {freshKpis.filteredSales.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs">
                          <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-urdu">منتخب مدت میں کوئی تازہ چکن کی فروخت ریکارڈ نہیں ہے۔</p>
                          <button
                            onClick={() => setActiveTab('pos')}
                            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold font-urdu hover:bg-amber-700 transition"
                          >
                            + نیا بل بنائیں (Make Sale)
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="p-3.5 bg-amber-50/90 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs px-5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                              <span className="font-urdu text-amber-950 font-bold">
                                مجموعی فروخت کا خلاصہ ({freshSalesFilter === 'today' ? 'آج' : freshSalesFilter === 'week' ? 'گزشتہ 7 دن' : freshSalesFilter === 'month' ? 'گزشتہ 30 دن' : 'تمام ریکارڈز'}):
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-300 rounded-xl shadow-2xs">
                                <span className="font-urdu text-slate-600 font-medium">کل فروخت وزن:</span>
                                <span dir="ltr" className="font-mono font-black text-slate-900">{freshKpis.filteredSoldKg} KG</span>
                              </div>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-300 rounded-xl shadow-2xs">
                                <span className="font-urdu text-slate-600 font-medium">کل وصول رقم:</span>
                                <span dir="ltr" className="font-mono font-black text-emerald-700">Rs. {freshKpis.filteredSoldRevenue.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-xs text-right">
                              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                  <th className="py-3 px-4 text-right">انوائس #</th>
                                  <th className="py-3 px-3 text-right">گاہک کا نام</th>
                                  <th className="py-3 px-3 text-center">تاریخ و وقت</th>
                                  <th className="py-3 px-3 text-center">فروخت شدہ وزن</th>
                                  <th className="py-3 px-3 text-center">ریٹ فی کلو</th>
                                  <th className="py-3 px-3 text-center">لائن ٹوٹل</th>
                                  <th className="py-3 px-3 text-center">ادائیگی طریقہ</th>
                                  <th className="py-3 px-3 text-center">بل کا باقی ادھار</th>
                                  <th className="py-3 px-4 text-center">رسید</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {freshKpis.filteredSales.map(({ sale, item }, idx) => (
                                  <tr key={`${sale.id}-${idx}`} className="hover:bg-slate-50/70 transition">
                                    <td className="py-3 px-4 font-mono font-bold text-amber-800">
                                      {sale.invoice_no}
                                    </td>
                                    <td className="py-3 px-3 font-bold text-slate-900">
                                      <span>{sale.customer_name}</span>
                                      {sale.phone && (
                                        <span className="block font-mono text-[10px] text-slate-400 font-normal">
                                          {sale.phone}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                                      <span className="block">{formatDate(sale.sale_date)}</span>
                                      <span className="text-[10px] text-slate-400">{sale.sale_time || ''}</span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm">
                                      {item.weight_kg} <span className="text-[10px] text-slate-500 font-normal">KG</span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                                      Rs. {item.rate_per_kg}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-800 text-sm">
                                      Rs. {item.line_total.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        sale.payment_method === 'cash'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : sale.payment_method === 'credit'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-purple-100 text-purple-800'
                                      }`}>
                                        {sale.payment_method === 'cash' ? 'نقد (Cash)' : sale.payment_method === 'credit' ? 'ادھار (Credit)' : 'جزوی (Partial)'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-bold">
                                      {sale.remaining_due > 0 ? (
                                        <span className="text-rose-700">Rs. {sale.remaining_due.toLocaleString()}</span>
                                      ) : (
                                        <span className="text-emerald-700">کلیئر</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={() => setReceiptModalSale(sale)}
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                                          title="رسید دیکھیں"
                                        >
                                          پرنٹ
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSale(sale)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                          title="سیل ڈیلیٹ کریں اور اسٹاک بحال کریں"
                                        >
                                          <Trash2 className="w-4 h-4 text-rose-500" />
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
                    </div>
                  )}
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
                    <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                      <table className="w-full min-w-[620px] text-xs text-right">
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
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2">
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
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-x-auto">
                  <table className="w-full min-w-[700px] text-xs text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 text-right">پروڈکٹ نام (Name)</th>
                        <th className="py-3 px-3 text-right">اردو نام</th>
                        <th className="py-3 px-3 text-center">کیٹیگری</th>
                        <th className="py-3 px-3 text-center">فروخت ریٹ فی کلو</th>
                        <th className="py-3 px-3 text-center">موجودہ اسٹاک</th>
                        <th className="py-3 px-3 text-center">کل مالیت (ٹوٹل قیمت)</th>
                        <th className="py-3 px-3 text-center">الرٹ حد</th>
                        <th className="py-3 px-3 text-center">اسٹیٹس</th>
                        <th className="py-3 px-4 text-center">ایکشن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map(p => {
                        const isFreshChicken = p.id === FRESH_CHICKEN_PRODUCT_ID || p.id === freshProd.id;
                        const displayStock = isFreshChicken ? freshKpis.stockKg : p.stock_kg;
                        const displayValuation = Math.round(
                          (Number(displayStock) || 0) * (Number(p.rate_per_kg) || 0)
                        );

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                              {p.name}
                              {isFreshChicken && (
                                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                  تازہ چکن
                                </span>
                              )}
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
                              <span
                                className={
                                  displayStock <= p.min_stock_alert
                                    ? 'text-rose-600 font-black'
                                    : isFreshChicken
                                    ? 'text-emerald-700 font-black'
                                    : ''
                                }
                              >
                                {displayStock} KG
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-black text-emerald-800 text-sm">
                              Rs. {displayValuation.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-500">
                              {p.min_stock_alert} KG
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {p.is_active ? 'فعال (Active)' : 'غیر فعال'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setProductModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition font-urdu text-xs"
                                >
                                  ریٹ تبدیل کریں
                                </button>
                                {!isFreshChicken && (
                                  <button
                                    onClick={() => handleDeleteProduct(p)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                    title="پروڈکٹ حذف کریں (Delete Product)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-x-auto">
                  <table className="w-full min-w-[760px] text-xs text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">انوائس #</th>
                        <th className="py-3 px-3">تاریخ و وقت</th>
                        <th className="py-3 px-3">گاہک کا نام</th>
                        <th className="py-3 px-3 text-center">کل وزن</th>
                        <th className="py-3 px-3 text-left">ٹوٹل بل رقم</th>
                        <th className="py-3 px-3 text-left">وصول شدہ</th>
                        <th className="py-3 px-3 text-left">بقایا رقم</th>
                        <th className="py-3 px-3 text-left">تخمینہ منافع</th>
                        <th className="py-3 px-3 text-center">طریقہ</th>
                        <th className="py-3 px-3 text-center">ایکشنز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map(sale => {
                        const saleCost = sale.items.reduce((sCost, it) => {
                          const costRate = (it.product_id === FRESH_CHICKEN_PRODUCT_ID || it.product_name.toLowerCase().includes('fresh chicken'))
                            ? (freshArrivals[0]?.rate_per_kg || 380)
                            : Math.round(it.rate_per_kg * 0.82);
                          return sCost + Math.round((Number(it.weight_kg) || 0) * costRate);
                        }, 0);
                        const estProfit = sale.total_amount - saleCost;

                        return (
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
                            <td className="py-3 px-3 text-left font-mono font-black">
                              <span className={estProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {estProfit >= 0 ? `+Rs. ${estProfit.toLocaleString()}` : `-Rs. ${Math.abs(estProfit).toLocaleString()}`}
                              </span>
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
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setReceiptModalSale(sale)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition inline-flex items-center gap-1"
                                  title="رسید پرنٹ کریں"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>رسید</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSale(sale)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition inline-flex items-center gap-1"
                                  title="سیل ڈیلیٹ کریں اور اسٹاک بحال کریں"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSales.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                            کوئی سیل ریکارڈ نہیں ملا۔
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 8: PROFIT & LOSS REPORTS                                    */}
            {/* =============================================================== */}
            {activeTab === 'profit_loss' && (
              <ProfitLossTab
                sales={sales}
                freshArrivals={freshArrivals}
                products={products}
                expenses={expenses}
                customers={customers}
                onAddExpense={() => setExpenseModalOpen(true)}
                onDeleteExpense={handleDeleteExpense}
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

      {/* Customer Full Khata Ledger Statement Modal */}
      <CustomerLedgerModal
        customer={ledgerCustomer}
        onClose={() => setLedgerCustomer(null)}
        onRecordPayment={c => {
          setPaymentCustomer(c);
          setPaymentModalOpen(true);
        }}
        onCustomerUpdated={loadAllData}
        onDeleteCustomer={handleDeleteCustomer}
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

      {/* Shop Expense Recording Modal */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={loadAllData}
      />
    </div>
  );
};
