// =============================================================================
// SHAN POULTRY PROTEIN - Dedicated Chicken Shop Management & Khata POS System
// Chicken Meat POS (Boles, Thai, Gosht) + Automated Customer Khata Ledger
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { ChickenShopRecord, BusinessSettings } from '../types/database';
import { formatCurrency, formatWeight, formatDate } from '../utils/formatters';
import {
  Store,
  Plus,
  Search,
  Phone,
  Calendar,
  Share2,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileSpreadsheet,
  Wallet,
  Eye,
  FileText,
  UserCheck,
  CreditCard,
  Banknote,
  Receipt,
  ArrowDownLeft,
  ChevronRight,
  TrendingUp,
  History
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

interface CustomerKhataSummary {
  customer_name: string;
  phone: string | null;
  dokan_khata: string | null;
  customer_khata: string | null;
  total_meat_kg: number;
  total_billed: number;
  total_paid: number;
  current_balance: number; // positive = customer owes money; negative/zero = cleared
  transaction_count: number;
  last_record_date: string;
}

export const ChickenShopPage: React.FC = () => {
  const [records, setRecords] = useState<ChickenShopRecord[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'pos_sales' | 'khata_directory'>('pos_sales');

  // Search & Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // POS Sale Modal State
  const [saleModalOpen, setSaleModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Partial<ChickenShopRecord> | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Meat Item Active Toggles
  const [itemEnabled, setItemEnabled] = useState<{ boles: boolean; thai: boolean; gosht: boolean }>({
    boles: true,
    thai: true,
    gosht: true,
  });

  // Payment Recovery / Wasooli Modal State
  const [wasooliModalOpen, setWasooliModalOpen] = useState<boolean>(false);
  const [wasooliCustomer, setWasooliCustomer] = useState<string>('');
  const [wasooliAmount, setWasooliAmount] = useState<number | ''>('');
  const [wasooliDate, setWasooliDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [wasooliNotes, setWasooliNotes] = useState<string>('');
  const [savingWasooli, setSavingWasooli] = useState<boolean>(false);

  // View / Print Voucher Modal State
  const [viewingRecord, setViewingRecord] = useState<ChickenShopRecord | null>(null);

  // Customer Ledger Statement Modal State
  const [viewingLedgerCustomer, setViewingLedgerCustomer] = useState<CustomerKhataSummary | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rList, bSettings] = await Promise.all([
        api.getChickenShopRecords(),
        api.getSettings().catch(() => null),
      ]);
      setRecords(rList);
      if (bSettings) setSettings(bSettings);
    } catch (err) {
      console.error('Failed to load chicken shop records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------------------------------------------------------------------
  // Customer Khata Directory Aggregations (Auto-Calculated from all records)
  // ---------------------------------------------------------------------------
  const customerKhatas = useMemo<CustomerKhataSummary[]>(() => {
    const map = new Map<string, CustomerKhataSummary>();

    // Process from oldest to newest to ensure running ledger consistency
    const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));

    sorted.forEach(r => {
      const key = r.customer_name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          customer_name: r.customer_name.trim(),
          phone: r.phone || null,
          dokan_khata: r.dokan_khata || null,
          customer_khata: r.customer_khata || null,
          total_meat_kg: 0,
          total_billed: 0,
          total_paid: 0,
          current_balance: 0,
          transaction_count: 0,
          last_record_date: r.record_date,
        });
      }

      const item = map.get(key)!;
      if (r.phone) item.phone = r.phone;
      if (r.dokan_khata) item.dokan_khata = r.dokan_khata;
      if (r.customer_khata) item.customer_khata = r.customer_khata;
      item.total_meat_kg += r.total_weight || 0;
      item.total_billed += r.subtotal_amount || 0;
      item.total_paid += r.received_amount || 0;
      item.current_balance = Math.max(0, item.total_billed - item.total_paid);
      item.transaction_count += 1;
      item.last_record_date = r.record_date;
    });

    return Array.from(map.values()).sort((a, b) => b.current_balance - a.current_balance);
  }, [records]);

  // Unique customers for the dropdown/selector
  const existingCustomerNames = useMemo(() => {
    return customerKhatas.map(c => c.customer_name);
  }, [customerKhatas]);

  // Overall KPIs
  const totalWeightSold = records.reduce((acc, r) => acc + (r.total_weight || 0), 0);
  const totalBilledAmount = records.reduce((acc, r) => acc + (r.subtotal_amount || 0), 0);
  const totalReceivedAmount = records.reduce((acc, r) => acc + (r.received_amount || 0), 0);
  const totalOutstandingKhata = customerKhatas.reduce((acc, c) => acc + c.current_balance, 0);

  // Filtered sales records
  const filteredRecords = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    return records.filter(r => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.customer_name.toLowerCase().includes(q) ||
        (r.dokan_khata && r.dokan_khata.toLowerCase().includes(q)) ||
        (r.customer_khata && r.customer_khata.toLowerCase().includes(q)) ||
        (r.phone && r.phone.includes(q)) ||
        (r.voucher_no && r.voucher_no.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || r.payment_status === statusFilter;

      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = r.record_date === today;
      } else if (dateFilter === 'week') {
        matchesDate = r.record_date >= sevenDaysAgo;
      } else if (dateFilter === 'month') {
        matchesDate = r.record_date >= thirtyDaysAgo;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [records, search, statusFilter, dateFilter]);

  // Filtered customer khatas
  const filteredCustomerKhatas = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customerKhatas;
    return customerKhatas.filter(
      c =>
        c.customer_name.toLowerCase().includes(q) ||
        (c.dokan_khata && c.dokan_khata.toLowerCase().includes(q)) ||
        (c.customer_khata && c.customer_khata.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customerKhatas, search]);

  // ---------------------------------------------------------------------------
  // Initialize New POS Meat Sale
  // ---------------------------------------------------------------------------
  const handleOpenAddSaleModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingRecord({
      customer_name: '',
      phone: '',
      dokan_khata: '',
      customer_khata: '',
      record_date: today,
      transaction_type: 'sale',
      payment_mode: 'cash',
      boles_weight: 0,
      boles_rate: 620,
      boles_total: 0,
      thai_weight: 0,
      thai_rate: 480,
      thai_total: 0,
      gosht_weight: 0,
      gosht_rate: 380,
      gosht_total: 0,
      total_weight: 0,
      subtotal_amount: 0,
      bakaya_raqam: 0,
      total_raqam: 0,
      received_amount: 0,
      remaining_balance: 0,
      payment_status: 'paid',
      notes: '',
    });
    setItemEnabled({ boles: true, thai: false, gosht: true });
    setSelectedCustomerId('');
    setSaleModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: ChickenShopRecord) => {
    setEditingRecord({ ...rec });
    setItemEnabled({
      boles: (rec.boles_weight || 0) > 0,
      thai: (rec.thai_weight || 0) > 0,
      gosht: (rec.gosht_weight || 0) > 0,
    });
    setSelectedCustomerId(rec.customer_name);
    setSaleModalOpen(true);
  };

  // When Admin picks an existing customer from dropdown
  const handleSelectCustomer = (custName: string) => {
    setSelectedCustomerId(custName);
    if (!editingRecord) return;

    if (!custName) {
      setEditingRecord(prev => prev ? {
        ...prev,
        customer_name: '',
        phone: '',
        dokan_khata: '',
        customer_khata: '',
        bakaya_raqam: 0,
      } : null);
      return;
    }

    const existing = customerKhatas.find(c => c.customer_name === custName);
    if (existing) {
      setEditingRecord(prev => {
        if (!prev) return null;
        const subtotal = prev.subtotal_amount || 0;
        const prevKhata = existing.current_balance;
        const totalRaqam = subtotal + prevKhata;
        const isCash = prev.payment_mode === 'cash';
        const received = isCash ? subtotal : (prev.received_amount || 0);
        const remaining = Math.max(0, totalRaqam - received);

        return {
          ...prev,
          customer_name: existing.customer_name,
          phone: existing.phone || prev.phone,
          dokan_khata: existing.dokan_khata || prev.dokan_khata,
          customer_khata: existing.customer_khata || prev.customer_khata,
          bakaya_raqam: prevKhata,
          total_raqam: totalRaqam,
          received_amount: received,
          remaining_balance: remaining,
        };
      });
    }
  };

  // Real-time calculation helpers for POS form state
  const handleUpdateRecordField = (field: keyof ChickenShopRecord, value: any) => {
    setEditingRecord(prev => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };

      // Re-calculate weights and meat totals
      const bWeight = itemEnabled.boles ? (parseFloat(String(updated.boles_weight || 0)) || 0) : 0;
      const bRate = parseFloat(String(updated.boles_rate || 0)) || 0;
      const bTotal = Number((bWeight * bRate).toFixed(2));
      updated.boles_total = bTotal;

      const tWeight = itemEnabled.thai ? (parseFloat(String(updated.thai_weight || 0)) || 0) : 0;
      const tRate = parseFloat(String(updated.thai_rate || 0)) || 0;
      const tTotal = Number((tWeight * tRate).toFixed(2));
      updated.thai_total = tTotal;

      const gWeight = itemEnabled.gosht ? (parseFloat(String(updated.gosht_weight || 0)) || 0) : 0;
      const gRate = parseFloat(String(updated.gosht_rate || 0)) || 0;
      const gTotal = Number((gWeight * gRate).toFixed(2));
      updated.gosht_total = gTotal;

      const totWeight = Number((bWeight + tWeight + gWeight).toFixed(2));
      updated.total_weight = totWeight;

      const subtotal = Math.round(bTotal + tTotal + gTotal);
      updated.subtotal_amount = subtotal;

      const bakaya = parseFloat(String(updated.bakaya_raqam || 0)) || 0;
      const totalRaqam = Math.round(subtotal + bakaya);
      updated.total_raqam = totalRaqam;

      // Handle Payment Mode logic
      if (updated.payment_mode === 'cash') {
        // Cash sale: customer pays today's bill in cash
        updated.received_amount = subtotal;
        updated.remaining_balance = bakaya; // only historical bakaya remains
        updated.payment_status = 'paid';
      } else if (updated.payment_mode === 'credit') {
        // Credit sale: 0 cash received today, entire bill goes to khata
        updated.received_amount = 0;
        updated.remaining_balance = totalRaqam;
        updated.payment_status = 'unpaid';
      } else {
        // Partial: admin entered custom cash received
        const received = parseFloat(String(updated.received_amount || 0)) || 0;
        const remaining = Math.max(0, Math.round(totalRaqam - received));
        updated.remaining_balance = remaining;
        updated.payment_status = remaining === 0 && totalRaqam > 0 ? 'paid' : (received > 0 ? 'partial' : 'unpaid');
      }

      return updated;
    });
  };

  // Quick Payment Mode Selector Button handler
  const handleSelectPaymentMode = (mode: 'cash' | 'credit' | 'partial') => {
    setEditingRecord(prev => {
      if (!prev) return null;
      const subtotal = prev.subtotal_amount || 0;
      const bakaya = prev.bakaya_raqam || 0;
      const totalRaqam = subtotal + bakaya;

      let received = 0;
      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';

      if (mode === 'cash') {
        received = subtotal;
        status = 'paid';
      } else if (mode === 'credit') {
        received = 0;
        status = 'unpaid';
      } else {
        received = prev.received_amount || Math.round(subtotal / 2);
        status = 'partial';
      }

      const remaining = Math.max(0, totalRaqam - received);

      return {
        ...prev,
        payment_mode: mode,
        received_amount: received,
        remaining_balance: remaining,
        payment_status: status,
      };
    });
  };

  // Toggle Meat Item enable/disable
  const handleToggleItem = (itemKey: 'boles' | 'thai' | 'gosht') => {
    setItemEnabled(prev => {
      const next = { ...prev, [itemKey]: !prev[itemKey] };
      setTimeout(() => {
        handleUpdateRecordField('total_weight', 0); // triggers re-calculation
      }, 10);
      return next;
    });
  };

  // Save POS Record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord?.customer_name?.trim()) return;

    try {
      setSaving(true);
      const bWeight = itemEnabled.boles ? (parseFloat(String(editingRecord.boles_weight || 0)) || 0) : 0;
      const bRate = parseFloat(String(editingRecord.boles_rate || 0)) || 0;
      const bTotal = Number((bWeight * bRate).toFixed(2));

      const tWeight = itemEnabled.thai ? (parseFloat(String(editingRecord.thai_weight || 0)) || 0) : 0;
      const tRate = parseFloat(String(editingRecord.thai_rate || 0)) || 0;
      const tTotal = Number((tWeight * tRate).toFixed(2));

      const gWeight = itemEnabled.gosht ? (parseFloat(String(editingRecord.gosht_weight || 0)) || 0) : 0;
      const gRate = parseFloat(String(editingRecord.gosht_rate || 0)) || 0;
      const gTotal = Number((gWeight * gRate).toFixed(2));

      const totWeight = Number((bWeight + tWeight + gWeight).toFixed(2));
      const subtotal = Math.round(bTotal + tTotal + gTotal);
      const bakaya = parseFloat(String(editingRecord.bakaya_raqam || 0)) || 0;
      const totalRaqam = Math.round(subtotal + bakaya);
      const received = parseFloat(String(editingRecord.received_amount || 0)) || 0;
      const remaining = Math.max(0, Math.round(totalRaqam - received));

      const salePaymentStatus: 'paid' | 'partial' | 'unpaid' =
        editingRecord.payment_mode === 'cash' ? 'paid' : (received > 0 ? 'partial' : 'unpaid');

      const payload = {
        customer_name: editingRecord.customer_name.trim(),
        phone: editingRecord.phone || null,
        dokan_khata: editingRecord.dokan_khata || null,
        customer_khata: editingRecord.customer_khata || null,
        record_date: editingRecord.record_date || new Date().toISOString().split('T')[0],
        transaction_type: 'sale' as const,
        payment_mode: editingRecord.payment_mode || 'cash',
        boles_weight: bWeight,
        boles_rate: bRate,
        boles_total: bTotal,
        thai_weight: tWeight,
        thai_rate: tRate,
        thai_total: tTotal,
        gosht_weight: gWeight,
        gosht_rate: gRate,
        gosht_total: gTotal,
        total_weight: totWeight,
        subtotal_amount: subtotal,
        bakaya_raqam: bakaya,
        total_raqam: totalRaqam,
        received_amount: received,
        remaining_balance: remaining,
        payment_status: salePaymentStatus,
        notes: editingRecord.notes || null,
      };

      let savedRecord: ChickenShopRecord;
      if (editingRecord.id) {
        savedRecord = await api.updateChickenShopRecord(editingRecord.id, payload);
      } else {
        savedRecord = await api.createChickenShopRecord(payload);
      }

      setSaleModalOpen(false);
      setEditingRecord(null);
      await fetchData();

      // Automatically show printable thermal receipt after saving
      setViewingRecord(savedRecord);
    } catch (err: any) {
      console.error('Failed to save chicken shop record:', err);
      alert('ریکارڈ محفوظ کرنے میں خرابی پیش آئی: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Khata Payment Recovery / Cash Wasooli
  // ---------------------------------------------------------------------------
  const handleOpenWasooliModal = (prefillCustomer?: string) => {
    setWasooliCustomer(prefillCustomer || '');
    setWasooliAmount('');
    setWasooliDate(new Date().toISOString().split('T')[0]);
    setWasooliNotes('کھاتہ ریکوری / نقد وصولی (Cash payment towards outstanding khata)');
    setWasooliModalOpen(true);
  };

  const handleSaveWasooli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasooliCustomer.trim() || !wasooliAmount || Number(wasooliAmount) <= 0) return;

    try {
      setSavingWasooli(true);
      const custKhata = customerKhatas.find(c => c.customer_name === wasooliCustomer.trim());
      const currentBakaya = custKhata ? custKhata.current_balance : 0;
      const cashAmount = Number(wasooliAmount);
      const remaining = Math.max(0, currentBakaya - cashAmount);

      const voucher_no = `REC-${Math.floor(1000 + Math.random() * 9000)}`;

      const wasooliPaymentStatus: 'paid' | 'partial' | 'unpaid' =
        remaining === 0 ? 'paid' : 'partial';

      const payload = {
        customer_name: wasooliCustomer.trim(),
        phone: custKhata?.phone || null,
        dokan_khata: custKhata?.dokan_khata || null,
        customer_khata: custKhata?.customer_khata || null,
        record_date: wasooliDate,
        transaction_type: 'payment_recovery' as const,
        payment_mode: 'cash' as const,
        voucher_no,
        boles_weight: 0,
        boles_rate: 0,
        boles_total: 0,
        thai_weight: 0,
        thai_rate: 0,
        thai_total: 0,
        gosht_weight: 0,
        gosht_rate: 0,
        gosht_total: 0,
        total_weight: 0,
        subtotal_amount: 0,
        bakaya_raqam: currentBakaya,
        total_raqam: currentBakaya,
        received_amount: cashAmount,
        remaining_balance: remaining,
        payment_status: wasooliPaymentStatus,
        notes: wasooliNotes || 'نقد وصولی کھاتہ',
      };

      const saved = await api.createChickenShopRecord(payload);
      setWasooliModalOpen(false);
      await fetchData();
      setViewingRecord(saved);
    } catch (err: any) {
      console.error('Failed to save wasooli:', err);
      alert('وصولی محفوظ کرنے میں خرابی: ' + (err.message || 'Error'));
    } finally {
      setSavingWasooli(false);
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: string, name: string) => {
    if (!window.confirm(`کیا آپ واقعی "${name}" کا چکن شاپ کھاتہ ریکارڈ حذف کرنا چاہتے ہیں؟`)) {
      return;
    }
    try {
      await api.deleteChickenShopRecord(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete chicken shop record:', err);
    }
  };

  // Format and share WhatsApp receipt
  const handleShareWhatsApp = (rec: ChickenShopRecord) => {
    const shanContact = settings?.receipt_footer_phone || settings?.business_phone || '0300-0000000';
    const isPayment = rec.transaction_type === 'payment_recovery';

    const lines = [
      `*🐔 SHAN POULTRY PROTEIN - رسید 🐔*`,
      `*چکن شاپ ${isPayment ? 'نقد وصولی رسید' : 'سیلز و کھاتہ رسید'}*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*واؤچر نمبر:* ${rec.voucher_no || 'CS-REC'}`,
      `*تاریخ:* ${formatDate(rec.record_date)}`,
      `*دکان / کسٹمر:* ${rec.customer_name}`,
      rec.dokan_khata ? `*دکان کھاتہ:* ${rec.dokan_khata}` : null,
      rec.customer_khata ? `*کسٹمر کھاتہ:* ${rec.customer_khata}` : null,
      `━━━━━━━━━━━━━━━━━━`,
      !isPayment && rec.boles_weight > 0 ? `• بونلیس (Boles): ${rec.boles_weight} KG @ Rs. ${rec.boles_rate} = Rs. ${rec.boles_total.toLocaleString()}` : null,
      !isPayment && rec.thai_weight > 0 ? `• تھائی (Thai): ${rec.thai_weight} KG @ Rs. ${rec.thai_rate} = Rs. ${rec.thai_total.toLocaleString()}` : null,
      !isPayment && rec.gosht_weight > 0 ? `• گوشت (Gosht): ${rec.gosht_weight} KG @ Rs. ${rec.gosht_rate} = Rs. ${rec.gosht_total.toLocaleString()}` : null,
      !isPayment ? `*کل وزن:* ${formatWeight(rec.total_weight)}` : null,
      !isPayment ? `*آج کا بل:* Rs. ${rec.subtotal_amount.toLocaleString()}` : null,
      rec.bakaya_raqam > 0 ? `*سابقہ بقایا رقم:* Rs. ${rec.bakaya_raqam.toLocaleString()}` : null,
      `*وصول شدہ نقد رقم:* Rs. ${rec.received_amount.toLocaleString()}`,
      `*موجودہ بقایا کھاتہ:* Rs. ${rec.remaining_balance.toLocaleString()}`,
      `*طریقہ:* ${rec.payment_mode === 'cash' ? 'نقد ادا شدہ (Cash)' : (rec.payment_mode === 'credit' ? 'ادھار کھاتہ (Credit Khata)' : 'جزوی ادائیگی (Partial)')}`,
      `━━━━━━━━━━━━━━━━━━`,
      `Shan Contact: ${shanContact}`,
    ].filter(Boolean);

    const text = lines.join('\n');
    let phone = (rec.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '92' + phone.slice(1);
    }
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // WhatsApp Customer Khata Statement
  const handleShareCustomerKhataWhatsApp = (cust: CustomerKhataSummary) => {
    const shanContact = settings?.receipt_footer_phone || settings?.business_phone || '0300-0000000';
    const lines = [
      `*🐔 SHAN POULTRY PROTEIN - رسید 🐔*`,
      `*مکمل کھاتہ اسٹیٹمنٹ و تفصیل حساب کتاب*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*گاہک / دکان:* ${cust.customer_name}`,
      cust.phone ? `*فون نمبر:* ${cust.phone}` : null,
      cust.dokan_khata ? `*دکان کھاتہ:* ${cust.dokan_khata}` : null,
      cust.customer_khata ? `*کسٹمر کھاتہ:* ${cust.customer_khata}` : null,
      `━━━━━━━━━━━━━━━━━━`,
      `*کل خریدا گیا گوشت:* ${formatWeight(cust.total_meat_kg)}`,
      `*کل خریداری بل رقم:* Rs. ${cust.total_billed.toLocaleString()}`,
      `*کل جمع شدہ نقد رقم:* Rs. ${cust.total_paid.toLocaleString()}`,
      `━━━━━━━━━━━━━━━━━━`,
      `*کل واجب الادا بقایا رقم:* Rs. ${cust.current_balance.toLocaleString()}`,
      cust.current_balance === 0 ? `*سٹیٹس: ✓ تمام حساب بے باق ہے*` : `*سٹیٹس: ⚠️ بقایہ رقم قابل ادائیگی ہے*`,
      `━━━━━━━━━━━━━━━━━━`,
      `Shan Contact: ${shanContact}`,
    ].filter(Boolean);

    const text = lines.join('\n');
    let phone = (cust.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '92' + phone.slice(1);
    }
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Customer Transaction History for Ledger Statement Modal
  const customerLedgerRecords = useMemo(() => {
    if (!viewingLedgerCustomer) return [];
    return records
      .filter(r => r.customer_name.trim().toLowerCase() === viewingLedgerCustomer.customer_name.trim().toLowerCase())
      .sort((a, b) => a.record_date.localeCompare(b.record_date));
  }, [records, viewingLedgerCustomer]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-brand-50 border border-brand-200 text-brand-700 rounded-2xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Chicken Meat POS & Khata</h1>
              <span className="text-xs bg-brand-100 text-brand-800 font-bold px-2.5 py-0.5 rounded-full font-urdu">
                چکن شاپ سیلز و کسٹمر کھاتہ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-urdu text-right sm:text-left">
              بونلیس (Boles)، تھائی (Thai) اور گوشت (Gosht) کی روزانہ نقد و ادھار فروخت، خودکار کسٹمر کھاتہ اور رسید سسٹم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => handleOpenWasooliModal()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition font-urdu"
            title="پرانے کھاتے کی نقد وصولی درج کریں"
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>کھاتہ وصولی درج کریں</span>
          </button>
          <button
            onClick={handleOpenAddSaleModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-xs font-urdu"
          >
            <Plus className="w-4 h-4" />
            <span>+ نیا سیل بل (POS Sale)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">کل فروخت رقم (Total Billed)</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-3">
            {formatCurrency(totalBilledAmount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-urdu">
            <span>کل چکن گوشت فروخت بلز</span>
            <span className="font-mono font-bold text-slate-700">{records.length} بلز</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">کل گوشت وزن (Meat Sold)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-3">
            {formatWeight(totalWeightSold)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-urdu">
            بونلیس، تھائی و سالم گوشت وزن
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">نقد وصولی (Cash Received)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-800 font-mono mt-3">
            {formatCurrency(totalReceivedAmount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-urdu">
            نقد سیلز اور کھاتہ کی وصولیاں
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">واجب الادا ادھار (Khata Balance)</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono mt-3">
            {formatCurrency(totalOutstandingKhata)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-urdu">
            <span>کسٹمرز کے کھاتوں کا کل بقایا</span>
            <span className="font-mono font-bold text-rose-700">{customerKhatas.filter(c => c.current_balance > 0).length} نادہندہ</span>
          </p>
        </div>
      </div>

      {/* Tabs Switcher: Daily Sales POS vs Customer Khata Directory */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pos_sales')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'pos_sales'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>روزانہ سیلز و بلز (Daily Sales POS)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 font-mono">
            {records.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('khata_directory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'khata_directory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>کسٹمر کھاتہ و حساب کتاب (Customer Khata Accounts)</span>
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 font-mono">
            {customerKhatas.length}
          </span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={
              activeTab === 'pos_sales'
                ? 'دکان دار کا نام، دکان کھاتہ #، کسٹمر کھاتہ، واؤچر # یا فون تلاش کریں...'
                : 'کسٹمر نام، دکان کھاتہ #، یا فون نمبر سے کھاتہ تلاش کریں...'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 font-urdu text-right sm:text-left"
          />
        </div>

        {activeTab === 'pos_sales' && (
          <div className="flex items-center gap-2">
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-brand-600 font-urdu"
            >
              <option value="all">تمام تاریخیں (All Time)</option>
              <option value="today">صرف آج (Today)</option>
              <option value="week">پچھلے 7 دن (Last 7 Days)</option>
              <option value="month">پچھلے 30 دن (Last 30 Days)</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-brand-600 font-urdu"
            >
              <option value="all">تمام سٹیٹس (All Status)</option>
              <option value="paid">نقد / مکمل ادا (Paid)</option>
              <option value="partial">جزوی ادا شدہ (Partial)</option>
              <option value="unpaid">ادھار کھاتہ (Credit / Unpaid)</option>
            </select>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: DAILY SALES POS TABLE                                           */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'pos_sales' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <p className="text-xs font-semibold font-urdu">سیلز اور کھاتہ ریکارڈ لوڈ ہو رہا ہے...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700 font-urdu">کوئی سیلز بل ریکارڈ نہیں ملا</h3>
              <p className="text-xs text-slate-400 mt-1 font-urdu">
                نیا گوشت سیل بل درج کرنے کے لیے "+ نیا سیل بل (POS Sale)" پر کلک کریں۔
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-urdu">
                    <th className="py-3.5 px-4">واؤچر / تاریخ</th>
                    <th className="py-3.5 px-4">کسٹمر و رابطہ</th>
                    <th className="py-3.5 px-4">کھاتہ ریفرنس</th>
                    <th className="py-3.5 px-4">گوشت اوزان و تفصیل</th>
                    <th className="py-3.5 px-4 text-right">آج کا بل</th>
                    <th className="py-3.5 px-4 text-center">طریقہ ادائیگی</th>
                    <th className="py-3.5 px-4 text-right">نقد وصول</th>
                    <th className="py-3.5 px-4 text-right">کھاتہ بقایا</th>
                    <th className="py-3.5 px-4 text-center">ایکشنز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRecords.map(rec => {
                    const isRecovery = rec.transaction_type === 'payment_recovery';
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Voucher & Date */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-brand-700">
                            {rec.voucher_no || 'CS-REC'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(rec.record_date)}
                          </div>
                        </td>

                        {/* Customer & Phone */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-urdu">{rec.customer_name}</div>
                          {rec.phone && (
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {rec.phone}
                            </div>
                          )}
                        </td>

                        {/* Dokan & Customer Khata */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 text-[11px]">
                            {rec.dokan_khata && (
                              <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-block w-fit font-urdu">
                                دکان: {rec.dokan_khata}
                              </span>
                            )}
                            {rec.customer_khata && (
                              <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block w-fit font-urdu">
                                کھاتہ: {rec.customer_khata}
                              </span>
                            )}
                            {!rec.dokan_khata && !rec.customer_khata && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>

                        {/* Meat Breakdown or Wasooli */}
                        <td className="py-3 px-4">
                          {isRecovery ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-bold font-urdu">
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                              <span>نقد کھاتہ وصولی (Cash Recovery)</span>
                            </div>
                          ) : (
                            <div className="space-y-0.5 text-[11px]">
                              {rec.boles_weight > 0 && (
                                <div className="text-slate-700">
                                  <span className="font-bold text-slate-900 font-urdu">بونلیس:</span>{' '}
                                  <span className="font-mono">{rec.boles_weight} KG</span> @ Rs.{rec.boles_rate}
                                </div>
                              )}
                              {rec.thai_weight > 0 && (
                                <div className="text-slate-700">
                                  <span className="font-bold text-slate-900 font-urdu">تھائی:</span>{' '}
                                  <span className="font-mono">{rec.thai_weight} KG</span> @ Rs.{rec.thai_rate}
                                </div>
                              )}
                              {rec.gosht_weight > 0 && (
                                <div className="text-slate-700">
                                  <span className="font-bold text-slate-900 font-urdu">گوشت:</span>{' '}
                                  <span className="font-mono">{rec.gosht_weight} KG</span> @ Rs.{rec.gosht_rate}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-500 font-bold pt-0.5 border-t border-slate-100 font-urdu">
                                کل وزن: <span className="font-mono">{formatWeight(rec.total_weight)}</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Subtotal */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {isRecovery ? '—' : `Rs. ${rec.subtotal_amount.toLocaleString()}`}
                        </td>

                        {/* Payment Mode Badge */}
                        <td className="py-3 px-4 text-center">
                          {rec.payment_mode === 'cash' || rec.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-urdu">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> نقد (Cash)
                            </span>
                          ) : rec.payment_mode === 'credit' || rec.payment_status === 'unpaid' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-urdu">
                              <CreditCard className="w-3 h-3 text-rose-600" /> ادھار کھاتہ (Credit)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-urdu">
                              <Clock className="w-3 h-3 text-amber-600" /> جزوی (Partial)
                            </span>
                          )}
                        </td>

                        {/* Received Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          Rs. {rec.received_amount.toLocaleString()}
                        </td>

                        {/* Remaining Balance */}
                        <td className="py-3 px-4 text-right font-mono">
                          {rec.remaining_balance > 0 ? (
                            <span className="text-rose-600 font-bold">
                              Rs. {rec.remaining_balance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Rs. 0</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingRecord(rec)}
                              className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                              title="رسید دیکھیں اور پرنٹ کریں"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShareWhatsApp(rec)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="واٹس ایپ پر رسید بھیجیں"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            {!isRecovery && (
                              <button
                                onClick={() => handleOpenEditModal(rec)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="تبدیل کریں (Edit)"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRecord(rec.id, rec.customer_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="حذف کریں (Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: CUSTOMER KHATA DIRECTORY                                        */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'khata_directory' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {filteredCustomerKhatas.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700 font-urdu">کوئی کسٹمر کھاتہ نہیں ملا</h3>
              <p className="text-xs text-slate-400 mt-1 font-urdu">
                نیا سیل بل درج کرنے پر کسٹمر کا کھاتہ خودکار طریقے سے تیار ہو جائے گا۔
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-urdu">
                    <th className="py-3.5 px-4">کسٹمر / دکان دار</th>
                    <th className="py-3.5 px-4">دکان کھاتہ #</th>
                    <th className="py-3.5 px-4">کسٹمر کھاتہ #</th>
                    <th className="py-3.5 px-4 text-right">کل گوشت خریدا</th>
                    <th className="py-3.5 px-4 text-right">کل بل رقم</th>
                    <th className="py-3.5 px-4 text-right">کل نقد ادا شدہ</th>
                    <th className="py-3.5 px-4 text-right">موجودہ بقایا کھاتہ</th>
                    <th className="py-3.5 px-4 text-center">سٹیٹس</th>
                    <th className="py-3.5 px-4 text-center">ایکشنز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCustomerKhatas.map(cust => (
                    <tr key={cust.customer_name} className="hover:bg-slate-50/60 transition-colors">
                      {/* Customer Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-urdu text-sm">
                          {cust.customer_name}
                        </div>
                        {cust.phone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cust.phone}
                          </div>
                        )}
                      </td>

                      {/* Dokan Khata */}
                      <td className="py-3 px-4">
                        {cust.dokan_khata ? (
                          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-block font-urdu">
                            {cust.dokan_khata}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Customer Khata */}
                      <td className="py-3 px-4">
                        {cust.customer_khata ? (
                          <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block font-urdu">
                            {cust.customer_khata}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total Meat KG */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        {formatWeight(cust.total_meat_kg)}
                      </td>

                      {/* Total Billed */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        Rs. {cust.total_billed.toLocaleString()}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        Rs. {cust.total_paid.toLocaleString()}
                      </td>

                      {/* Current Khata Balance */}
                      <td className="py-3 px-4 text-right font-mono">
                        {cust.current_balance > 0 ? (
                          <span className="text-sm font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl inline-block">
                            Rs. {cust.current_balance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl inline-block font-urdu">
                            ✓ بے باق (Rs. 0)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {cust.current_balance === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-urdu">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> تمام کلئیر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-urdu">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> ادھار بقایا
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Ledger Statement */}
                          <button
                            onClick={() => setViewingLedgerCustomer(cust)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 font-urdu"
                            title="کھاتہ کی مکمل تفصیل اور تاریخ وار اسٹیٹمنٹ دیکھیں"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>کھاتہ لیجر</span>
                          </button>

                          {/* Quick Payment Recovery */}
                          {cust.current_balance > 0 && (
                            <button
                              onClick={() => handleOpenWasooliModal(cust.customer_name)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 font-urdu"
                              title="نقد رقم وصول کر کے کھاتے سے منہا کریں"
                            >
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                              <span>وصولی</span>
                            </button>
                          )}

                          {/* Share WhatsApp Statement */}
                          <button
                            onClick={() => handleShareCustomerKhataWhatsApp(cust)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="واٹس ایپ پر کھاتہ خلاصہ بھیجیں"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 1: NEW MEAT POS SALE                                             */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        title={editingRecord?.id ? 'سیل بل میں ترمیم (Edit POS Sale)' : '🍗 نیا چکن گوشت سیل بل (Chicken Meat POS)'}
        subtitle="بونلیس، تھائی، گوشت کے اوزان، نقد یا ادھار کھاتہ اور خودکار رسید"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRecord} className="space-y-4">
          {/* Customer Selection Row */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-urdu">
                کسٹمر و دکان دار کا انتخاب (Customer Selection)
              </span>
              {existingCustomerNames.length > 0 && (
                <span className="text-[11px] text-slate-500 font-urdu">
                  موجودہ کسٹمر منتخب کریں یا نیا نام درج کریں
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Existing Customer Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  موجودہ کھاتہ دار (Select Existing)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={e => handleSelectCustomer(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-600 font-urdu"
                >
                  <option value="">-- نیا کسٹمر / براہ راست نام درج کریں --</option>
                  {customerKhatas.map(c => (
                    <option key={c.customer_name} value={c.customer_name}>
                      {c.customer_name} {c.current_balance > 0 ? `(بقایا: Rs. ${c.current_balance.toLocaleString()})` : '(بے باق)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  کسٹمر یا دکان کا نام (Customer / Shop Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الحرمین چکن شاپ، حاجی ارشد"
                  value={editingRecord?.customer_name || ''}
                  onChange={e => handleUpdateRecordField('customer_name', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-bold font-urdu"
                />
              </div>

              {/* Record Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  سیل تاریخ (Date) *
                </label>
                <input
                  type="date"
                  required
                  value={editingRecord?.record_date || ''}
                  onChange={e => handleUpdateRecordField('record_date', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>

            {/* Contact & Khata Identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  رابطہ نمبر (Phone)
                </label>
                <input
                  type="text"
                  placeholder="0300-1234567"
                  value={editingRecord?.phone || ''}
                  onChange={e => handleUpdateRecordField('phone', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  دکان کھاتہ # (Dokan Khata)
                </label>
                <input
                  type="text"
                  placeholder="مثال: کھاتہ نمبر 14"
                  value={editingRecord?.dokan_khata || ''}
                  onChange={e => handleUpdateRecordField('dokan_khata', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-urdu focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  کسٹمر کھاتہ # (Customer Khata)
                </label>
                <input
                  type="text"
                  placeholder="کسٹمر لیجر نمبر"
                  value={editingRecord?.customer_khata || ''}
                  onChange={e => handleUpdateRecordField('customer_khata', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-urdu focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Outstanding Balance Banner */}
            {(editingRecord?.bakaya_raqam || 0) > 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
                <div className="flex items-center gap-2 font-urdu">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>اس کسٹمر کے کھاتے میں پہلے سے <strong>Rs. {(editingRecord?.bakaya_raqam || 0).toLocaleString()}</strong> ادھار بقایا رقم موجود ہے۔</span>
                </div>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  سابقہ بقایا: Rs. {(editingRecord?.bakaya_raqam || 0).toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-urdu">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>اس کسٹمر کا سابقہ کھاتہ بالکل بے باق ہے (Previous Balance: Rs. 0)</span>
              </div>
            )}
          </div>

          {/* Meat Weights & Rates Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-urdu">
                گوشت کی اقسام اور اوزان (Meat Items Selection & Rates)
              </span>
              <span className="text-[11px] text-slate-500 font-urdu">
                جو آئٹم فروخت کرنی ہو اس پر نشان لگائیں
              </span>
            </div>

            {/* Boles Item Card */}
            <div className={`p-3 rounded-xl border transition ${itemEnabled.boles ? 'bg-white border-brand-300 shadow-2xs' : 'bg-slate-100/60 border-slate-200 opacity-60'}`}>
              <div className="grid grid-cols-12 gap-2.5 items-center">
                <div className="col-span-12 sm:col-span-4 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={itemEnabled.boles}
                    onChange={() => handleToggleItem('boles')}
                    className="w-4 h-4 text-brand-600 rounded-sm cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block font-urdu">Boles (بونلیس چکن)</span>
                    <span className="text-[10px] text-slate-400">Boneless Chicken Meat</span>
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-urdu">وزن (Weight KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    disabled={!itemEnabled.boles}
                    value={editingRecord?.boles_weight ?? ''}
                    onChange={e => handleUpdateRecordField('boles_weight', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-urdu">ریٹ (Rate PKR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    disabled={!itemEnabled.boles}
                    value={editingRecord?.boles_rate ?? ''}
                    onChange={e => handleUpdateRecordField('boles_rate', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-2 text-right">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Total</span>
                  <span className="font-mono font-bold text-xs text-brand-700">
                    Rs. {(editingRecord?.boles_total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Thai Item Card */}
            <div className={`p-3 rounded-xl border transition ${itemEnabled.thai ? 'bg-white border-brand-300 shadow-2xs' : 'bg-slate-100/60 border-slate-200 opacity-60'}`}>
              <div className="grid grid-cols-12 gap-2.5 items-center">
                <div className="col-span-12 sm:col-span-4 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={itemEnabled.thai}
                    onChange={() => handleToggleItem('thai')}
                    className="w-4 h-4 text-brand-600 rounded-sm cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block font-urdu">Thai (تھائی)</span>
                    <span className="text-[10px] text-slate-400">Chicken Thai Portions</span>
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-urdu">وزن (Weight KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    disabled={!itemEnabled.thai}
                    value={editingRecord?.thai_weight ?? ''}
                    onChange={e => handleUpdateRecordField('thai_weight', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-urdu">ریٹ (Rate PKR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    disabled={!itemEnabled.thai}
                    value={editingRecord?.thai_rate ?? ''}
                    onChange={e => handleUpdateRecordField('thai_rate', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-2 text-right">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Total</span>
                  <span className="font-mono font-bold text-xs text-brand-700">
                    Rs. {(editingRecord?.thai_total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Gosht Item Card */}
            <div className={`p-3 rounded-xl border transition ${itemEnabled.gosht ? 'bg-white border-brand-300 shadow-2xs' : 'bg-slate-100/60 border-slate-200 opacity-60'}`}>
              <div className="grid grid-cols-12 gap-2.5 items-center">
                <div className="col-span-12 sm:col-span-4 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={itemEnabled.gosht}
                    onChange={() => handleToggleItem('gosht')}
                    className="w-4 h-4 text-brand-600 rounded-sm cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block font-urdu">Gosht (گوشت)</span>
                    <span className="text-[10px] text-slate-400">Standard Broiler Meat</span>
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-urdu">وزن (Weight KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    disabled={!itemEnabled.gosht}
                    value={editingRecord?.gosht_weight ?? ''}
                    onChange={e => handleUpdateRecordField('gosht_weight', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-urdu">ریٹ (Rate PKR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    disabled={!itemEnabled.gosht}
                    value={editingRecord?.gosht_rate ?? ''}
                    onChange={e => handleUpdateRecordField('gosht_rate', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="col-span-12 sm:col-span-2 text-right">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Total</span>
                  <span className="font-mono font-bold text-xs text-brand-700">
                    Rs. {(editingRecord?.gosht_total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subtotal & Previous Balance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block font-urdu">کل وزن (Meat Weight)</span>
              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                {formatWeight(editingRecord?.total_weight || 0)}
              </span>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
              <span className="text-[10px] text-blue-700 font-bold uppercase block font-urdu">آج کا گوشت بل (Subtotal)</span>
              <span className="text-base font-black text-blue-900 font-mono mt-0.5 block">
                Rs. {(editingRecord?.subtotal_amount || 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-xl">
              <span className="text-[10px] text-slate-300 font-bold uppercase block font-urdu">کل واجب الادا رقم (Grand Total)</span>
              <span className="text-base font-black text-white font-mono mt-0.5 block">
                Rs. {(editingRecord?.total_raqam || 0).toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-400 font-urdu block">
                آج کا بل + سابقہ کھاتہ
              </span>
            </div>
          </div>

          {/* Payment Method Selector (Cash vs Credit vs Partial) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-urdu">
              طریقہ ادائیگی اور کھاتہ ریکارڈنگ (Cash or Credit Khata) *
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectPaymentMode('cash')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  editingRecord?.payment_mode === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-black font-urdu">نقد فروخت (Cash)</span>
                <span className={`text-[10px] ${editingRecord?.payment_mode === 'cash' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  پورا بل نقد ادا
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPaymentMode('credit')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  editingRecord?.payment_mode === 'credit'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-black font-urdu">ادھار کھاتہ (Credit)</span>
                <span className={`text-[10px] ${editingRecord?.payment_mode === 'credit' ? 'text-rose-100' : 'text-slate-400'}`}>
                  کھاتے میں شامل ہوگا
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPaymentMode('partial')}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                  editingRecord?.payment_mode === 'partial'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="text-xs font-black font-urdu">جزوی ادائیگی (Partial)</span>
                <span className={`text-[10px] ${editingRecord?.payment_mode === 'partial' ? 'text-amber-100' : 'text-slate-400'}`}>
                  کچھ نقد، باقی ادھار
                </span>
              </button>
            </div>

            {/* Explanatory Banner based on Payment Mode */}
            {editingRecord?.payment_mode === 'cash' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between font-urdu">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>نقد فروخت: آج کا بل <strong>Rs. {(editingRecord?.subtotal_amount || 0).toLocaleString()}</strong> مکمل ادا شدہ ریکارڈ ہوگا۔ کسٹمر کے کھاتے میں نیا ادھار شامل نہیں ہوگا۔</span>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  وصول: Rs. {(editingRecord?.received_amount || 0).toLocaleString()}
                </span>
              </div>
            ) : editingRecord?.payment_mode === 'credit' ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between font-urdu">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>ادھار کھاتہ: آج کا بل <strong>Rs. {(editingRecord?.subtotal_amount || 0).toLocaleString()}</strong> کسٹمر کے کھاتے میں خودکار شامل ہو جائے گا۔</span>
                </div>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  نیا ادھار: Rs. {(editingRecord?.subtotal_amount || 0).toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 font-urdu">
                    وصول شدہ نقد رقم درج کریں (Cash Paid Today):
                  </label>
                  <span className="text-xs font-mono font-bold text-rose-700">
                    باقی ادھار کھاتہ: Rs. {(editingRecord?.remaining_balance || 0).toLocaleString()}
                  </span>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={editingRecord?.received_amount ?? ''}
                  onChange={e => handleUpdateRecordField('received_amount', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-900 focus:outline-none focus:border-amber-600"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-urdu">
              تفصیل / ریمارکس (Notes)
            </label>
            <input
              type="text"
              placeholder="سامان یا ادائیگی بارے کوئی ضروری نوٹ..."
              value={editingRecord?.notes || ''}
              onChange={e => handleUpdateRecordField('notes', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-urdu"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSaleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition font-urdu"
            >
              منسوخ کریں (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 font-urdu"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>محفوظ کریں اور رسید پرنٹ کریں (Save & Print)</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 2: KHATA PAYMENT RECOVERY (WASOOLI)                              */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={wasooliModalOpen}
        onClose={() => setWasooliModalOpen(false)}
        title="💵 کھاتہ وصولی درج کریں (Receive Customer Khata Payment)"
        subtitle="کسٹمر سے نقد رقم وصول کر کے ان کے ادھار کھاتے میں جمع کریں"
        maxWidth="md"
      >
        <form onSubmit={handleSaveWasooli} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-urdu">
              کسٹمر کا انتخاب کریں (Select Customer) *
            </label>
            <select
              required
              value={wasooliCustomer}
              onChange={e => setWasooliCustomer(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-600 font-urdu"
            >
              <option value="">-- کسٹمر منتخب کریں --</option>
              {customerKhatas.map(c => (
                <option key={c.customer_name} value={c.customer_name}>
                  {c.customer_name} — (موجودہ بقایا کھاتہ: Rs. {c.current_balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Current Balance Notice */}
          {wasooliCustomer && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-urdu text-amber-900">
              <span>اس کسٹمر کا موجودہ ادھار کھاتہ:</span>
              <span className="font-mono font-black text-rose-700 text-sm">
                Rs. {(customerKhatas.find(c => c.customer_name === wasooliCustomer)?.current_balance || 0).toLocaleString()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-urdu">
                وصول شدہ رقم (Cash Amount PKR) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="مثال: 5000"
                value={wasooliAmount}
                onChange={e => setWasooliAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3.5 py-2 text-sm font-mono font-black text-emerald-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-urdu">
                وصولی تاریخ (Date) *
              </label>
              <input
                type="date"
                required
                value={wasooliDate}
                onChange={e => setWasooliDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          {/* Balance after recovery preview */}
          {wasooliCustomer && wasooliAmount && Number(wasooliAmount) > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-urdu text-emerald-900">
              <span>وصولی کے بعد باقی نیا کھاتہ بقایا:</span>
              <span className="font-mono font-black text-emerald-800 text-sm">
                Rs. {Math.max(0, (customerKhatas.find(c => c.customer_name === wasooliCustomer)?.current_balance || 0) - Number(wasooliAmount)).toLocaleString()}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-urdu">
              ریمارکس (Notes)
            </label>
            <input
              type="text"
              placeholder="ادائیگی کی تفصیل (جیسے نقد وصولی بذریعہ دکان)..."
              value={wasooliNotes}
              onChange={e => setWasooliNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-urdu"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setWasooliModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition font-urdu"
            >
              منسوخ
            </button>
            <button
              type="submit"
              disabled={savingWasooli}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 font-urdu"
            >
              {savingWasooli && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>وصولی محفوظ کریں (Save Payment)</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 3: CUSTOMER KHATA LEDGER STATEMENT                               */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={!!viewingLedgerCustomer}
        onClose={() => setViewingLedgerCustomer(null)}
        title={viewingLedgerCustomer ? `کھاتہ اسٹیٹمنٹ: ${viewingLedgerCustomer.customer_name}` : 'Customer Ledger'}
        subtitle="کسٹمر کی تمام سابقہ خریداریوں، نقد ادائیگیوں اور بقایا جات کا مکمل لیجر"
        maxWidth="lg"
      >
        {viewingLedgerCustomer && (
          <div className="space-y-4">
            {/* Customer Summary Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-urdu">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">کسٹمر نام:</span>
                <span className="font-bold text-slate-900 text-sm">{viewingLedgerCustomer.customer_name}</span>
                {viewingLedgerCustomer.phone && (
                  <span className="block font-mono text-slate-600 text-[11px] mt-0.5">{viewingLedgerCustomer.phone}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">دکان کھاتہ #:</span>
                <span className="font-bold text-blue-700">{viewingLedgerCustomer.dokan_khata || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">کل بل خریداری:</span>
                <span className="font-mono font-bold text-slate-900">Rs. {viewingLedgerCustomer.total_billed.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">موجودہ بقایا کھاتہ:</span>
                <span className="font-mono font-black text-rose-700 text-sm">
                  Rs. {viewingLedgerCustomer.current_balance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase font-urdu">
                    <th className="py-2.5 px-3">تاریخ</th>
                    <th className="py-2.5 px-3">واؤچر #</th>
                    <th className="py-2.5 px-3">تفصیل سامان / نوعیت</th>
                    <th className="py-2.5 px-3 text-right">بل رقم (Debit)</th>
                    <th className="py-2.5 px-3 text-right">نقد ادا (Credit)</th>
                    <th className="py-2.5 px-3 text-right">باقی بقایا</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {customerLedgerRecords.map(rec => {
                    const isRec = rec.transaction_type === 'payment_recovery';
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">{formatDate(rec.record_date)}</td>
                        <td className="py-2.5 px-3 font-bold text-brand-700">{rec.voucher_no || 'CS-REC'}</td>
                        <td className="py-2.5 px-3 font-sans font-urdu">
                          {isRec ? (
                            <span className="text-emerald-700 font-bold">💵 نقد وصولی کھاتہ</span>
                          ) : (
                            <div className="text-[11px]">
                              {rec.boles_weight > 0 && ` بونلیس: ${rec.boles_weight}kg`}
                              {rec.thai_weight > 0 && ` تھائی: ${rec.thai_weight}kg`}
                              {rec.gosht_weight > 0 && ` گوشت: ${rec.gosht_weight}kg`}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {isRec ? '—' : `Rs. ${rec.subtotal_amount.toLocaleString()}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          Rs. {rec.received_amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          Rs. {rec.remaining_balance.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleShareCustomerKhataWhatsApp(viewingLedgerCustomer)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition font-urdu"
              >
                <Share2 className="w-4 h-4" />
                <span>واٹس ایپ کھاتہ اسٹیٹمنٹ</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition font-urdu"
              >
                <Printer className="w-4 h-4" />
                <span>پرنٹ اسٹیٹمنٹ (Print)</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 4: THERMAL POS RECEIPT VOUCHER                                   */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={viewingRecord ? `رسید واؤچر: ${viewingRecord.voucher_no || 'CS-REC'}` : 'Voucher Receipt'}
        subtitle="پرنٹ ایبل سیلز رسید و کھاتہ بل"
        maxWidth="md"
      >
        {viewingRecord && (
          <div className="space-y-4">
            <div id="chicken-shop-printable-receipt" className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b border-slate-200">
                <h3 className="text-base font-black text-slate-900">🐔 SHAN POULTRY PROTEIN - رسید 🐔</h3>
                <p className="text-xs font-bold text-slate-600 font-urdu mt-0.5">
                  {viewingRecord.transaction_type === 'payment_recovery' ? 'نقد وصولی رسید (Payment Recovery Receipt)' : 'چکن شاپ سیلز و کھاتہ بل (Chicken Shop POS Receipt)'}
                </p>
                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 font-mono mt-1">
                  <span>واؤچر: {viewingRecord.voucher_no || 'CS-REC'}</span>
                  <span>•</span>
                  <span>تاریخ: {formatDate(viewingRecord.record_date)}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block font-urdu">دکان دار / گاہک:</span>
                  <span className="font-bold text-slate-900 font-urdu">{viewingRecord.customer_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">رابطہ فون:</span>
                  <span className="font-mono text-slate-700">{viewingRecord.phone || '—'}</span>
                </div>
                {viewingRecord.dokan_khata && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block font-urdu">دکان کھاتہ:</span>
                    <span className="font-bold text-blue-700 font-urdu">{viewingRecord.dokan_khata}</span>
                  </div>
                )}
                {viewingRecord.customer_khata && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block font-urdu">کسٹمر کھاتہ:</span>
                    <span className="font-bold text-slate-700 font-urdu">{viewingRecord.customer_khata}</span>
                  </div>
                )}
              </div>

              {/* Items Breakdown Table (if sale) */}
              {viewingRecord.transaction_type !== 'payment_recovery' && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase font-urdu">
                      <th className="py-2 text-left">آئٹم</th>
                      <th className="py-2 text-right">وزن (KG)</th>
                      <th className="py-2 text-right">ریٹ (PKR)</th>
                      <th className="py-2 text-right">رقم (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {viewingRecord.boles_weight > 0 && (
                      <tr>
                        <td className="py-2 text-left font-sans font-bold text-slate-900 font-urdu">بونلیس (Boles)</td>
                        <td className="py-2 text-right">{viewingRecord.boles_weight}</td>
                        <td className="py-2 text-right">Rs. {viewingRecord.boles_rate}</td>
                        <td className="py-2 text-right font-bold">Rs. {viewingRecord.boles_total.toLocaleString()}</td>
                      </tr>
                    )}
                    {viewingRecord.thai_weight > 0 && (
                      <tr>
                        <td className="py-2 text-left font-sans font-bold text-slate-900 font-urdu">تھائی (Thai)</td>
                        <td className="py-2 text-right">{viewingRecord.thai_weight}</td>
                        <td className="py-2 text-right">Rs. {viewingRecord.thai_rate}</td>
                        <td className="py-2 text-right font-bold">Rs. {viewingRecord.thai_total.toLocaleString()}</td>
                      </tr>
                    )}
                    {viewingRecord.gosht_weight > 0 && (
                      <tr>
                        <td className="py-2 text-left font-sans font-bold text-slate-900 font-urdu">گوشت (Gosht)</td>
                        <td className="py-2 text-right">{viewingRecord.gosht_weight}</td>
                        <td className="py-2 text-right">Rs. {viewingRecord.gosht_rate}</td>
                        <td className="py-2 text-right font-bold">Rs. {viewingRecord.gosht_total.toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Financial Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono font-urdu">
                {viewingRecord.transaction_type !== 'payment_recovery' && (
                  <>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>کل وزن (Total Weight):</span>
                      <span className="font-bold">{formatWeight(viewingRecord.total_weight)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-800">
                      <span>آج کا بل (Subtotal):</span>
                      <span className="font-bold">Rs. {viewingRecord.subtotal_amount.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {viewingRecord.bakaya_raqam > 0 && (
                  <div className="flex justify-between items-center text-rose-700">
                    <span>سابقہ بقایا رقم (Previous Khata):</span>
                    <span className="font-bold">Rs. {viewingRecord.bakaya_raqam.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                  <span>کل رقم (Total Raqam):</span>
                  <span>Rs. {viewingRecord.total_raqam.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-bold">
                  <span>وصول شدہ رقم (Received Cash):</span>
                  <span>Rs. {viewingRecord.received_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-rose-700 font-black text-sm pt-1 border-t border-slate-200">
                  <span>موجودہ بقایا کھاتہ (Remaining Khata):</span>
                  <span>Rs. {viewingRecord.remaining_balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                  <span>طریقہ ادائیگی (Payment Mode):</span>
                  <span className="font-bold">
                    {viewingRecord.payment_mode === 'cash' ? 'نقد ادا شدہ (Cash Sale)' : (viewingRecord.payment_mode === 'credit' ? 'ادھار کھاتہ (Credit Sale)' : 'جزوی ادائیگی (Partial)')}
                  </span>
                </div>
              </div>

              {/* Contact Footer */}
              <div className="text-center pt-2 text-xs font-bold text-slate-600 border-t border-slate-200 font-mono">
                <span>Shan Contact: {settings?.receipt_footer_phone || settings?.business_phone || '0300-0000000'}</span>
              </div>
            </div>

            {/* Print & Share Actions */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => handleShareWhatsApp(viewingRecord)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition font-urdu"
              >
                <Share2 className="w-4 h-4" />
                <span>واٹس ایپ رسید شیئر کریں</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition font-urdu"
              >
                <Printer className="w-4 h-4" />
                <span>پرنٹ رسید (Print POS Slip)</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
