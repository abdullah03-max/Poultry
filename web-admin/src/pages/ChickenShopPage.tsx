// =============================================================================
// SHAN POULTRY PROTEIN - Dedicated Chicken Shop Management & Khata System
// Independent business unit for Boles, Thai, Gosht sales, Khata ledgers & WhatsApp
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
  X,
  FileText
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const ChickenShopPage: React.FC = () => {
  const [records, setRecords] = useState<ChickenShopRecord[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Add / Edit Modal
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Partial<ChickenShopRecord> | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // View / Print Voucher Modal
  const [viewingRecord, setViewingRecord] = useState<ChickenShopRecord | null>(null);

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

  // Filtered list
  const filteredRecords = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    return records.filter(r => {
      // Search
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.customer_name.toLowerCase().includes(q) ||
        (r.dokan_khata && r.dokan_khata.toLowerCase().includes(q)) ||
        (r.customer_khata && r.customer_khata.toLowerCase().includes(q)) ||
        (r.phone && r.phone.includes(q)) ||
        (r.voucher_no && r.voucher_no.toLowerCase().includes(q));

      // Status
      const matchesStatus = statusFilter === 'all' || r.payment_status === statusFilter;

      // Date
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

  // Overall KPIs
  const totalWeightSold = records.reduce((acc, r) => acc + (r.total_weight || 0), 0);
  const totalBilledAmount = records.reduce((acc, r) => acc + (r.total_raqam || 0), 0);
  const totalReceivedAmount = records.reduce((acc, r) => acc + (r.received_amount || 0), 0);
  const totalBalanceDue = records.reduce((acc, r) => acc + (r.remaining_balance || 0), 0);

  // Initialize new record form
  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingRecord({
      customer_name: '',
      phone: '',
      dokan_khata: '',
      customer_khata: '',
      record_date: today,
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
      payment_status: 'unpaid',
      notes: '',
    });
    setRecordModalOpen(true);
  };

  const handleOpenEditModal = (rec: ChickenShopRecord) => {
    setEditingRecord({ ...rec });
    setRecordModalOpen(true);
  };

  // Real-time calculation helpers for form state
  const handleUpdateRecordField = (field: keyof ChickenShopRecord, value: any) => {
    setEditingRecord(prev => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };

      // Re-calculate weights and totals
      const bWeight = parseFloat(String(updated.boles_weight || 0)) || 0;
      const bRate = parseFloat(String(updated.boles_rate || 0)) || 0;
      const bTotal = Number((bWeight * bRate).toFixed(2));
      updated.boles_total = bTotal;

      const tWeight = parseFloat(String(updated.thai_weight || 0)) || 0;
      const tRate = parseFloat(String(updated.thai_rate || 0)) || 0;
      const tTotal = Number((tWeight * tRate).toFixed(2));
      updated.thai_total = tTotal;

      const gWeight = parseFloat(String(updated.gosht_weight || 0)) || 0;
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

      const received = parseFloat(String(updated.received_amount || 0)) || 0;
      const remaining = Math.max(0, Math.round(totalRaqam - received));
      updated.remaining_balance = remaining;

      if (remaining === 0 && totalRaqam > 0) {
        updated.payment_status = 'paid';
      } else if (received > 0 && remaining > 0) {
        updated.payment_status = 'partial';
      } else {
        updated.payment_status = 'unpaid';
      }

      return updated;
    });
  };

  // Save record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord?.customer_name?.trim()) return;

    try {
      setSaving(true);
      const bWeight = parseFloat(String(editingRecord.boles_weight || 0)) || 0;
      const bRate = parseFloat(String(editingRecord.boles_rate || 0)) || 0;
      const bTotal = Number((bWeight * bRate).toFixed(2));

      const tWeight = parseFloat(String(editingRecord.thai_weight || 0)) || 0;
      const tRate = parseFloat(String(editingRecord.thai_rate || 0)) || 0;
      const tTotal = Number((tWeight * tRate).toFixed(2));

      const gWeight = parseFloat(String(editingRecord.gosht_weight || 0)) || 0;
      const gRate = parseFloat(String(editingRecord.gosht_rate || 0)) || 0;
      const gTotal = Number((gWeight * gRate).toFixed(2));

      const totWeight = Number((bWeight + tWeight + gWeight).toFixed(2));
      const subtotal = Math.round(bTotal + tTotal + gTotal);
      const bakaya = parseFloat(String(editingRecord.bakaya_raqam || 0)) || 0;
      const totalRaqam = Math.round(subtotal + bakaya);
      const received = parseFloat(String(editingRecord.received_amount || 0)) || 0;
      const remaining = Math.max(0, Math.round(totalRaqam - received));

      const payload = {
        customer_name: editingRecord.customer_name.trim(),
        phone: editingRecord.phone || null,
        dokan_khata: editingRecord.dokan_khata || null,
        customer_khata: editingRecord.customer_khata || null,
        record_date: editingRecord.record_date || new Date().toISOString().split('T')[0],
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
        payment_status: remaining === 0 && totalRaqam > 0 ? 'paid' : (received > 0 ? 'partial' : 'unpaid'),
        notes: editingRecord.notes || null,
      } as const;

      if (editingRecord.id) {
        await api.updateChickenShopRecord(editingRecord.id, payload);
      } else {
        await api.createChickenShopRecord(payload);
      }

      setRecordModalOpen(false);
      setEditingRecord(null);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save chicken shop record:', err);
      alert('ریکارڈ محفوظ کرنے میں خرابی پیش آئی: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
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

  // Format and share WhatsApp statement
  const handleShareWhatsApp = (rec: ChickenShopRecord) => {
    const shanContact = settings?.receipt_footer_phone || settings?.business_phone || '0300-0000000';
    const lines = [
      `*چکن شاپ سیلز و کھاتہ رسید*`,
      `━━━━━━━━━━━━━━━━━━`,
      `*واؤچر نمبر:* ${rec.voucher_no || 'CS-REC'}`,
      `*تاریخ:* ${formatDate(rec.record_date)}`,
      `*دکان / کسٹمر:* ${rec.customer_name}`,
      rec.dokan_khata ? `*دکان کھاتہ:* ${rec.dokan_khata}` : null,
      rec.customer_khata ? `*کسٹمر کھاتہ:* ${rec.customer_khata}` : null,
      `━━━━━━━━━━━━━━━━━━`,
      rec.boles_weight > 0 ? `• بونلیس (Boles): ${rec.boles_weight} KG @ Rs. ${rec.boles_rate} = Rs. ${rec.boles_total.toLocaleString()}` : null,
      rec.thai_weight > 0 ? `• تھائی (Thai): ${rec.thai_weight} KG @ Rs. ${rec.thai_rate} = Rs. ${rec.thai_total.toLocaleString()}` : null,
      rec.gosht_weight > 0 ? `• گوشت (Gosht): ${rec.gosht_weight} KG @ Rs. ${rec.gosht_rate} = Rs. ${rec.gosht_total.toLocaleString()}` : null,
      `━━━━━━━━━━━━━━━━━━`,
      `*کل وزن:* ${formatWeight(rec.total_weight)}`,
      `*آج کا بل:* Rs. ${rec.subtotal_amount.toLocaleString()}`,
      rec.bakaya_raqam > 0 ? `*سابقہ بقایا رقم:* Rs. ${rec.bakaya_raqam.toLocaleString()}` : null,
      `*کل رقم:* Rs. ${rec.total_raqam.toLocaleString()}`,
      `*وصول شدہ:* Rs. ${rec.received_amount.toLocaleString()}`,
      `*باقی بقایا رقم:* Rs. ${rec.remaining_balance.toLocaleString()}`,
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

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Voucher No',
      'Date',
      'Customer Name',
      'Phone',
      'Dokan Khata',
      'Customer Khata',
      'Boles KG',
      'Boles Rate',
      'Boles Total',
      'Thai KG',
      'Thai Rate',
      'Thai Total',
      'Gosht KG',
      'Gosht Rate',
      'Gosht Total',
      'Total Weight KG',
      'Subtotal Amount',
      'Bakaya Raqam',
      'Total Raqam',
      'Received Amount',
      'Remaining Balance',
      'Payment Status',
    ];

    const rows = filteredRecords.map(r => [
      `"${r.voucher_no || ''}"`,
      `"${r.record_date}"`,
      `"${r.customer_name}"`,
      `"${r.phone || ''}"`,
      `"${r.dokan_khata || ''}"`,
      `"${r.customer_khata || ''}"`,
      r.boles_weight,
      r.boles_rate,
      r.boles_total,
      r.thai_weight,
      r.thai_rate,
      r.thai_total,
      r.gosht_weight,
      r.gosht_rate,
      r.gosht_total,
      r.total_weight,
      r.subtotal_amount,
      r.bakaya_raqam,
      r.total_raqam,
      r.received_amount,
      r.remaining_balance,
      `"${r.payment_status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Chicken_Shop_Khata_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Chicken Shop Management</h1>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full font-urdu">
                چکن شاپ و مالیاتی کھاتہ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              بونلیس (Boles)، تھائی (Thai) اور گوشت (Gosht) کی فروخت، دکان کھاتہ، کسٹمر کھاتہ اور بقایہ جات کا مکمل حساب کتاب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200"
            title="ایکسل فائل ڈاؤن لوڈ کریں"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>نیا کھاتہ بل درج کریں</span>
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
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>آج کا بل + سابقہ بقایا جات</span>
            <span className="font-mono font-bold text-slate-700">{records.length} بلز</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">کل وزن فروخت (Total Meat)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-3">
            {formatWeight(totalWeightSold)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            بونلیس، تھائی و سالم گوشت
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">وصول شدہ رقم (Received)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-800 font-mono mt-3">
            {formatCurrency(totalReceivedAmount)}
          </p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">
            نقد و آن لائن وصولیاں
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">بقایا کھاتہ رقم (Outstanding Balance)</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 font-mono mt-3">
            {formatCurrency(totalBalanceDue)}
          </p>
          <p className="text-[11px] text-rose-600 font-bold mt-1">
            دکان داروں کی واجب الادا رقم
          </p>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="دکان دار کا نام، دکان کھاتہ #، کسٹمر کھاتہ، یا فون نمبر تلاش کریں..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-brand-600 focus:bg-white transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-semibold focus:outline-none focus:border-brand-600"
          >
            <option value="all">تمام تاریخیں (All Time)</option>
            <option value="today">صرف آج (Today)</option>
            <option value="week">پچھلے 7 دن (Last 7 Days)</option>
            <option value="month">پچھلے 30 دن (Last 30 Days)</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-semibold focus:outline-none focus:border-brand-600"
          >
            <option value="all">تمام سٹیٹس (All Status)</option>
            <option value="paid">مکمل ادا شدہ (Paid)</option>
            <option value="partial">جزوی ادا شدہ (Partial)</option>
            <option value="unpaid">غیر ادا شدہ (Unpaid)</option>
          </select>
        </div>
      </div>

      {/* Records Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
            <p className="text-xs font-semibold">چکن شاپ کھاتہ ریکارڈ لوڈ ہو رہا ہے...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">کوئی چکن شاپ کھاتہ ریکارڈ نہیں ملا</h3>
            <p className="text-xs text-slate-400 mt-1">
              نیا کھاتہ بل شامل کرنے کے لیے "نیا کھاتہ بل درج کریں" پر کلک کریں۔
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">واؤچر / تاریخ</th>
                  <th className="py-3.5 px-4">کسٹمر و دکان دار</th>
                  <th className="py-3.5 px-4">دکان و کسٹمر کھاتہ</th>
                  <th className="py-3.5 px-4">گوشت اوزان و تفصیل</th>
                  <th className="py-3.5 px-4 text-right">آج کا بل</th>
                  <th className="py-3.5 px-4 text-right">بقایا رقم</th>
                  <th className="py-3.5 px-4 text-right">کل رقم</th>
                  <th className="py-3.5 px-4 text-right">وصول / باقی</th>
                  <th className="py-3.5 px-4 text-center">سٹیٹس</th>
                  <th className="py-3.5 px-4 text-center">ایکشنز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.map(rec => (
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

                    {/* Customer Name & Phone */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rec.customer_name}</div>
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
                          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-block w-fit">
                            دکان: {rec.dokan_khata}
                          </span>
                        )}
                        {rec.customer_khata && (
                          <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block w-fit">
                            کسٹمر: {rec.customer_khata}
                          </span>
                        )}
                        {!rec.dokan_khata && !rec.customer_khata && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Meat breakdown */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {rec.boles_weight > 0 && (
                          <div className="text-slate-700">
                            <span className="font-bold text-slate-900">بونلیس:</span>{' '}
                            <span className="font-mono">{rec.boles_weight} KG</span> @ Rs.{rec.boles_rate}
                          </div>
                        )}
                        {rec.thai_weight > 0 && (
                          <div className="text-slate-700">
                            <span className="font-bold text-slate-900">تھائی:</span>{' '}
                            <span className="font-mono">{rec.thai_weight} KG</span> @ Rs.{rec.thai_rate}
                          </div>
                        )}
                        {rec.gosht_weight > 0 && (
                          <div className="text-slate-700">
                            <span className="font-bold text-slate-900">گوشت:</span>{' '}
                            <span className="font-mono">{rec.gosht_weight} KG</span> @ Rs.{rec.gosht_rate}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-bold pt-0.5 border-t border-slate-100">
                          کل وزن: <span className="font-mono">{formatWeight(rec.total_weight)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      Rs. {rec.subtotal_amount.toLocaleString()}
                    </td>

                    {/* Bakaya Raqam */}
                    <td className="py-3 px-4 text-right font-mono">
                      {rec.bakaya_raqam > 0 ? (
                        <span className="text-rose-700 font-bold">
                          Rs. {rec.bakaya_raqam.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Rs. 0</span>
                      )}
                    </td>

                    {/* Total Raqam */}
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                      Rs. {rec.total_raqam.toLocaleString()}
                    </td>

                    {/* Received & Remaining */}
                    <td className="py-3 px-4 text-right font-mono">
                      <div className="text-emerald-700 font-bold">
                        وصول: Rs. {rec.received_amount.toLocaleString()}
                      </div>
                      <div className={`text-[11px] ${rec.remaining_balance > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                        باقی: Rs. {rec.remaining_balance.toLocaleString()}
                      </div>
                    </td>

                    {/* Payment Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {rec.payment_status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ادا شدہ
                        </span>
                      ) : rec.payment_status === 'partial' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-600" /> جزوی ادا
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> غیر ادا
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingRecord(rec)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                          title="رسید واؤچر دیکھیں اور پرنٹ کریں"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(rec)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="واٹس ایپ پر رسید بھیجیں"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="تبدیل کریں (Edit)"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Chicken Shop Record Modal */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title={editingRecord?.id ? 'چکن شاپ کھاتہ بل میں ترمیم' : 'نیا چکن شاپ کھاتہ بل درج کریں'}
        subtitle="بونلیس، تھائی، گوشت کے اوزان، ریٹس، دکان کھاتہ اور وصولی و بقایہ جات"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRecord} className="space-y-4">
          {/* Customer & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer / Shop Name (دکان دار یا کسٹمر کا نام) *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: الحرمین چکن شاپ، حاجی ارشد"
                value={editingRecord?.customer_name || ''}
                onChange={e => handleUpdateRecordField('customer_name', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Record Date (تاریخ) *
              </label>
              <input
                type="date"
                required
                value={editingRecord?.record_date || ''}
                onChange={e => handleUpdateRecordField('record_date', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          {/* Contact & Khata Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number (رابطہ نمبر)
              </label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={editingRecord?.phone || ''}
                onChange={e => handleUpdateRecordField('phone', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Dokan Khata (دکان کھاتہ #)
              </label>
              <input
                type="text"
                placeholder="مثال: کھاتہ نمبر 14"
                value={editingRecord?.dokan_khata || ''}
                onChange={e => handleUpdateRecordField('dokan_khata', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-urdu focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer Khata (کسٹمر کھاتہ)
              </label>
              <input
                type="text"
                placeholder="کسٹمر کھاتہ نمبر یا ریفرنس"
                value={editingRecord?.customer_khata || ''}
                onChange={e => handleUpdateRecordField('customer_khata', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-urdu focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Meat Weights & Rates Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>گوشت کی اقسام، اوزان اور ریٹس (Meat Weights & Rates)</span>
              <span className="text-[10px] text-slate-500 font-normal">کل وزن اور رقوم خودکار حساب ہوں گی</span>
            </h4>

            {/* Boles Row */}
            <div className="grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border border-slate-200">
              <div className="col-span-12 sm:col-span-4">
                <span className="font-bold text-xs text-slate-900 block">Boles (بونلیس چکن)</span>
                <span className="text-[10px] text-slate-400">Boneless Chicken Meat</span>
              </div>
              <div className="col-span-6 sm:col-span-4">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Weight (وزن KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={editingRecord?.boles_weight ?? ''}
                  onChange={e => handleUpdateRecordField('boles_weight', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Rate (ریٹ PKR)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={editingRecord?.boles_rate ?? ''}
                  onChange={e => handleUpdateRecordField('boles_rate', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>

            {/* Thai Row */}
            <div className="grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border border-slate-200">
              <div className="col-span-12 sm:col-span-4">
                <span className="font-bold text-xs text-slate-900 block">Thai (تھائی)</span>
                <span className="text-[10px] text-slate-400">Chicken Thai Portions</span>
              </div>
              <div className="col-span-6 sm:col-span-4">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Weight (وزن KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={editingRecord?.thai_weight ?? ''}
                  onChange={e => handleUpdateRecordField('thai_weight', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Rate (ریٹ PKR)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={editingRecord?.thai_rate ?? ''}
                  onChange={e => handleUpdateRecordField('thai_rate', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>

            {/* Gosht Row */}
            <div className="grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border border-slate-200">
              <div className="col-span-12 sm:col-span-4">
                <span className="font-bold text-xs text-slate-900 block">Gosht (گوشت)</span>
                <span className="text-[10px] text-slate-400">Standard Broiler Meat</span>
              </div>
              <div className="col-span-6 sm:col-span-4">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Weight (وزن KG)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={editingRecord?.gosht_weight ?? ''}
                  onChange={e => handleUpdateRecordField('gosht_weight', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Rate (ریٹ PKR)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={editingRecord?.gosht_rate ?? ''}
                  onChange={e => handleUpdateRecordField('gosht_rate', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>
          </div>

          {/* Financial Calculation Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Subtotal */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">آج کا بل (Subtotal)</span>
              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                Rs. {(editingRecord?.subtotal_amount || 0).toLocaleString()}
              </span>
            </div>

            {/* Bakaya Raqam Input */}
            <div>
              <label className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">
                Bakaya Raqam (سابقہ بقایا رقم)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={editingRecord?.bakaya_raqam ?? ''}
                onChange={e => handleUpdateRecordField('bakaya_raqam', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full bg-rose-50/40 border border-rose-300 rounded-xl px-3 py-2 text-xs text-rose-900 font-mono font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Total Raqam Auto */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
              <span className="text-[10px] text-blue-700 font-bold uppercase block">Total Raqam (کل رقم)</span>
              <span className="text-base font-black text-blue-900 font-mono mt-0.5 block">
                Rs. {(editingRecord?.total_raqam || 0).toLocaleString()}
              </span>
            </div>

            {/* Received Amount Input */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                Received (وصول رقم)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={editingRecord?.received_amount ?? ''}
                onChange={e => handleUpdateRecordField('received_amount', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-50/40 border border-emerald-300 rounded-xl px-3 py-2 text-xs text-emerald-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Remaining Balance & Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase block">باقی بقایا رقم (Remaining Balance)</span>
                <span className="text-sm font-black text-amber-900 font-mono mt-0.5 block">
                  Rs. {(editingRecord?.remaining_balance || 0).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-bold text-amber-800 font-urdu">
                {editingRecord?.remaining_balance === 0 ? '✓ مکمل بے باق' : 'بقایہ واجب الادا'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                تفصیل / ریمارکس (Notes)
              </label>
              <input
                type="text"
                placeholder="ادائیگی یا سامان بارے کوئی ضروری نوٹ..."
                value={editingRecord?.notes || ''}
                onChange={e => handleUpdateRecordField('notes', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              منسوخ کریں (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>محفوظ کریں (Save Record)</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View & Print Voucher Modal */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={viewingRecord ? `چکن شاپ واؤچر: ${viewingRecord.voucher_no || 'CS-REC'}` : 'Voucher Receipt'}
        subtitle="پرنٹ ایبل سیلز رسید و کھاتہ بل"
        maxWidth="md"
      >
        {viewingRecord && (
          <div className="space-y-4">
            <div id="chicken-shop-printable-receipt" className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b border-slate-200">
                <h3 className="text-base font-black text-slate-900">شان پولٹری پروٹین</h3>
                <p className="text-xs font-bold text-slate-600 font-urdu mt-0.5">چکن شاپ سیلز و کھاتہ رسید</p>
                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 font-mono mt-1">
                  <span>واؤچر: {viewingRecord.voucher_no || 'CS-REC'}</span>
                  <span>•</span>
                  <span>تاریخ: {formatDate(viewingRecord.record_date)}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">دکان دار / گاہک:</span>
                  <span className="font-bold text-slate-900">{viewingRecord.customer_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">رابطہ فون:</span>
                  <span className="font-mono text-slate-700">{viewingRecord.phone || '—'}</span>
                </div>
                {viewingRecord.dokan_khata && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">دکان کھاتہ:</span>
                    <span className="font-bold text-blue-700">{viewingRecord.dokan_khata}</span>
                  </div>
                )}
                {viewingRecord.customer_khata && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">کسٹمر کھاتہ:</span>
                    <span className="font-bold text-slate-700">{viewingRecord.customer_khata}</span>
                  </div>
                )}
              </div>

              {/* Items Breakdown Table */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2 text-left">آئٹم</th>
                    <th className="py-2 text-right">وزن (KG)</th>
                    <th className="py-2 text-right">ریٹ (PKR)</th>
                    <th className="py-2 text-right">رقم (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {viewingRecord.boles_weight > 0 && (
                    <tr>
                      <td className="py-2 text-left font-sans font-bold text-slate-900">بونلیس (Boles)</td>
                      <td className="py-2 text-right">{viewingRecord.boles_weight}</td>
                      <td className="py-2 text-right">Rs. {viewingRecord.boles_rate}</td>
                      <td className="py-2 text-right font-bold">Rs. {viewingRecord.boles_total.toLocaleString()}</td>
                    </tr>
                  )}
                  {viewingRecord.thai_weight > 0 && (
                    <tr>
                      <td className="py-2 text-left font-sans font-bold text-slate-900">تھائی (Thai)</td>
                      <td className="py-2 text-right">{viewingRecord.thai_weight}</td>
                      <td className="py-2 text-right">Rs. {viewingRecord.thai_rate}</td>
                      <td className="py-2 text-right font-bold">Rs. {viewingRecord.thai_total.toLocaleString()}</td>
                    </tr>
                  )}
                  {viewingRecord.gosht_weight > 0 && (
                    <tr>
                      <td className="py-2 text-left font-sans font-bold text-slate-900">گوشت (Gosht)</td>
                      <td className="py-2 text-right">{viewingRecord.gosht_weight}</td>
                      <td className="py-2 text-right">Rs. {viewingRecord.gosht_rate}</td>
                      <td className="py-2 text-right font-bold">Rs. {viewingRecord.gosht_total.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Financial Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-600">
                  <span>کل وزن (Total Weight):</span>
                  <span className="font-bold">{formatWeight(viewingRecord.total_weight)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <span>آج کا بل (Subtotal):</span>
                  <span className="font-bold">Rs. {viewingRecord.subtotal_amount.toLocaleString()}</span>
                </div>
                {viewingRecord.bakaya_raqam > 0 && (
                  <div className="flex justify-between items-center text-rose-700">
                    <span>سابقہ بقایا رقم (Bakaya Raqam):</span>
                    <span className="font-bold">Rs. {viewingRecord.bakaya_raqam.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                  <span>کل رقم (Total Raqam):</span>
                  <span>Rs. {viewingRecord.total_raqam.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-bold">
                  <span>وصول شدہ رقم (Received):</span>
                  <span>Rs. {viewingRecord.received_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-rose-700 font-black text-sm pt-1 border-t border-slate-200">
                  <span>باقی بقایا رقم (Remaining Balance):</span>
                  <span>Rs. {viewingRecord.remaining_balance.toLocaleString()}</span>
                </div>
              </div>

              {/* Contact Footer */}
              <div className="text-center pt-2 text-xs font-bold text-slate-600 border-t border-slate-200">
                <span>Shan Contact: {settings?.receipt_footer_phone || settings?.business_phone || '0300-0000000'}</span>
              </div>
            </div>

            {/* Print & Share Actions */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => handleShareWhatsApp(viewingRecord)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>واٹس ایپ شیئر کریں</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>پرنٹ کریں (Print)</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
