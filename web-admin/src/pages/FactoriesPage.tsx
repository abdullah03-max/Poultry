// =============================================================================
// SHAN POULTRY PROTEIN - Factories & Buyer Management Page
// Industrial buyers of Charbi (چربی) & Kachara (کچرا), deliveries, payments & WhatsApp
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Factory, FactoryTransaction, BusinessSettings } from '../types/database';
import { formatCurrency, formatWeight, formatDate } from '../utils/formatters';
import {
  Factory as FactoryIcon,
  Plus,
  Search,
  Phone,
  MapPin,
  Calendar,
  Truck,
  DollarSign,
  Share2,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const FactoriesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'directory'>('deliveries');
  const [factories, setFactories] = useState<Factory[]>([]);
  const [transactions, setTransactions] = useState<FactoryTransaction[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [factoryModalOpen, setFactoryModalOpen] = useState<boolean>(false);
  const [editingFactory, setEditingFactory] = useState<Partial<Factory> | null>(null);

  const [transactionModalOpen, setTransactionModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<FactoryTransaction> | null>(null);

  const [saving, setSaving] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fList, txList, bSettings] = await Promise.all([
        api.getFactories(),
        api.getFactoryTransactions(),
        api.getSettings().catch(() => null),
      ]);
      setFactories(fList);
      setTransactions(txList);
      if (bSettings) setSettings(bSettings);
    } catch (err) {
      console.error('Failed to load factory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute overall KPIs
  const totalSuppliedWeight = transactions.reduce((acc, t) => acc + (t.total_weight || 0), 0);
  const totalBilledAmount = transactions.reduce((acc, t) => acc + (t.total_amount || 0), 0);
  const totalReceivedAmount = transactions.reduce((acc, t) => acc + (t.received_amount || 0), 0);
  const totalBalanceDue = Math.max(0, totalBilledAmount - totalReceivedAmount);

  // Save Factory
  const handleSaveFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactory?.name?.trim()) return;

    try {
      setSaving(true);
      if (editingFactory.id) {
        await api.updateFactory(editingFactory.id, editingFactory);
      } else {
        await api.createFactory({
          factory_code: `FAC-${Date.now().toString().slice(-4)}`,
          name: editingFactory.name.trim(),
          contact_person: editingFactory.contact_person || null,
          phone: editingFactory.phone || '',
          whatsapp_no: editingFactory.whatsapp_no || editingFactory.phone || '',
          address: editingFactory.address || null,
          area: editingFactory.area || 'Lahore',
          rate_charbi: editingFactory.rate_charbi ?? 75,
          rate_kachara: editingFactory.rate_kachara ?? 60,
          status: editingFactory.status || 'active',
          notes: editingFactory.notes || null,
        });
      }
      setFactoryModalOpen(false);
      setEditingFactory(null);
      fetchData();
    } catch (err: any) {
      alert('Error saving factory: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  // Delete Factory
  const handleDeleteFactory = async (f: Factory) => {
    if (!confirm(`Are you sure you want to delete factory "${f.name}"?`)) return;
    try {
      await api.deleteFactory(f.id);
      fetchData();
    } catch (err: any) {
      alert('Error deleting factory: ' + (err.message || 'Error'));
    }
  };

  // Save Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction?.factory_id) {
      alert('براہ کرم فیکٹری منتخب کریں (Please select a factory).');
      return;
    }

    try {
      setSaving(true);
      const cWeight = parseFloat(String(editingTransaction.charbi_weight || 0)) || 0;
      const cRate = parseFloat(String(editingTransaction.charbi_rate || 0)) || 0;
      const cAmt = Math.round(cWeight * cRate);

      const kWeight = parseFloat(String(editingTransaction.kachara_weight || 0)) || 0;
      const kRate = parseFloat(String(editingTransaction.kachara_rate || 0)) || 0;
      const kAmt = Math.round(kWeight * kRate);

      const totW = Number((cWeight + kWeight).toFixed(2));
      const totAmt = cAmt + kAmt;

      const advRec = parseFloat(String(editingTransaction.advance_amount || 0)) || 0;
      const recAmt = parseFloat(String(editingTransaction.received_amount || 0)) || 0;
      const balAmt = Math.max(0, totAmt - (advRec + recAmt));

      let payStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (balAmt === 0 && totAmt > 0) payStatus = 'paid';
      else if ((advRec + recAmt) > 0) payStatus = 'partial';

      const payload: Partial<FactoryTransaction> = {
        ...editingTransaction,
        charbi_weight: cWeight,
        charbi_rate: cRate,
        charbi_total: cAmt,
        kachara_weight: kWeight,
        kachara_rate: kRate,
        kachara_total: kAmt,
        total_weight: totW,
        total_amount: totAmt,
        advance_amount: advRec,
        received_amount: recAmt,
        remaining_balance: balAmt,
        payment_status: payStatus,
      };

      if (editingTransaction.id) {
        const updated = await api.updateFactoryTransaction(editingTransaction.id, payload);
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await api.createFactoryTransaction({
          factory_id: editingTransaction.factory_id,
          transaction_date: editingTransaction.transaction_date || new Date().toISOString().split('T')[0],
          invoice_no: editingTransaction.invoice_no || `SPP-FAC-${Math.floor(1000 + Math.random() * 9000)}`,
          vehicle_no: editingTransaction.vehicle_no || null,
          driver_name: editingTransaction.driver_name || null,
          charbi_weight: cWeight,
          charbi_rate: cRate,
          charbi_total: cAmt,
          kachara_weight: kWeight,
          kachara_rate: kRate,
          kachara_total: kAmt,
          total_weight: totW,
          total_amount: totAmt,
          advance_amount: advRec,
          received_amount: recAmt,
          remaining_balance: balAmt,
          payment_status: payStatus,
          notes: editingTransaction.notes || null,
        });
        setTransactions(prev => [created, ...prev]);
      }

      setTransactionModalOpen(false);
      setEditingTransaction(null);
      await fetchData();
    } catch (err: any) {
      console.error('Save transaction error:', err);
      alert('Error saving delivery record: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (t: FactoryTransaction) => {
    if (!confirm(`Are you sure you want to delete delivery receipt "${t.invoice_no}"?`)) return;
    try {
      await api.deleteFactoryTransaction(t.id);
      fetchData();
    } catch (err: any) {
      alert('Error deleting delivery: ' + (err.message || 'Error'));
    }
  };

  // WhatsApp Message Generator & Sender
  const handleSendWhatsApp = (tx: FactoryTransaction) => {
    const f = factories.find(fac => fac.id === tx.factory_id) || tx.factory;
    const phone = f?.whatsapp_no || f?.phone || '';
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('03')) cleanPhone = '92' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('3') && cleanPhone.length === 10) cleanPhone = '92' + cleanPhone;

    const receiptTitle =
      settings?.receipt_title ||
      (typeof window !== 'undefined' ? localStorage.getItem('spp_receipt_title') : null) ||
      '🐔 SHAN POULTRY PROTEIN - رسید 🐔';

    const shanPhone =
      settings?.business_phone ||
      (typeof window !== 'undefined' ? localStorage.getItem('spp_business_phone') : null) ||
      '0300-0000000';

    const message = `*${receiptTitle}*
*انوائس نمبر:* ${tx.invoice_no}
*تاریخ:* ${formatDate(tx.transaction_date)}
*فیکٹری:* ${f?.name || 'Factory'}
*گاڑی نمبر:* ${tx.vehicle_no || '—'} (ڈرائیور: ${tx.driver_name || '—'})

*سپلائی تفصیل:*
• چربی وزن: ${tx.charbi_weight} KG @ Rs. ${tx.charbi_rate} = Rs. ${tx.charbi_total.toLocaleString()}
• کچرا وزن: ${tx.kachara_weight} KG @ Rs. ${tx.kachara_rate} = Rs. ${tx.kachara_total.toLocaleString()}

*کل وزن:* ${tx.total_weight} KG
*کل رقم بل:* Rs. ${tx.total_amount.toLocaleString()}
*وصول شدہ:* Rs. ${(tx.received_amount || 0).toLocaleString()}
*بقایا رقم:* Rs. ${tx.remaining_balance.toLocaleString()}
*اسٹیٹس:* ${tx.payment_status === 'paid' ? 'مکمل ادا شدہ (PAID)' : tx.payment_status === 'partial' ? 'جزوی ادائیگی (PARTIAL)' : 'غیر ادا شدہ (UNPAID)'}

Shan Contact: ${shanPhone}`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
  };

  // Filtered Deliveries
  const filteredTransactions = transactions.filter(t => {
    const f = factories.find(fac => fac.id === t.factory_id);
    const fname = f?.name || '';
    const inv = t.invoice_no || '';
    const veh = t.vehicle_no || '';
    const q = search.toLowerCase();
    return fname.toLowerCase().includes(q) || inv.toLowerCase().includes(q) || veh.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Header & Quick Actions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <FactoryIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Factories & Industrial Buyers (فیکٹریاں و سپلائی ریکارڈ)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage buyers of Charbi & Kachara, track dispatch ledgers, rates, payments, and WhatsApp statements.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingTransaction({
                factory_id: factories[0]?.id || '',
                transaction_date: new Date().toISOString().split('T')[0],
                invoice_no: `SPP-FAC-${Math.floor(1000 + Math.random() * 9000)}`,
                vehicle_no: '',
                driver_name: '',
                charbi_weight: 0,
                charbi_rate: factories[0]?.rate_charbi || 75,
                charbi_total: 0,
                kachara_weight: 0,
                kachara_rate: factories[0]?.rate_kachara || 60,
                kachara_total: 0,
                total_weight: 0,
                total_amount: 0,
                advance_amount: 0,
                received_amount: 0,
                remaining_balance: 0,
                payment_status: 'unpaid',
              });
              setTransactionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>نئی سپلائی اندراج (Add Delivery)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingFactory({
                name: '',
                contact_person: '',
                phone: '+92 3',
                whatsapp_no: '+92 3',
                area: 'Lahore',
                address: '',
                rate_charbi: 75,
                rate_kachara: 60,
                status: 'active',
              });
              setFactoryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>نئی فیکٹری (New Factory)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">کل سپلائی وزن</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">{formatWeight(totalSuppliedWeight)}</p>
          <p className="text-[10px] text-slate-400 mt-1">چربی و کچرا مال فیکٹریوں کو بھیجا گیا</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">کل مالیت (بل)</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 font-mono">{formatCurrency(totalBilledAmount)}</p>
          <p className="text-[10px] text-slate-400 mt-1">ٹوٹل انوائسز ویلیو</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">وصول شدہ رقم</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 font-mono">{formatCurrency(totalReceivedAmount)}</p>
          <p className="text-[10px] text-slate-400 mt-1">ایڈوانس + نقد وصولیاں</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">واجب الادا بقایا</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 font-mono">{formatCurrency(totalBalanceDue)}</p>
          <p className="text-[10px] text-slate-400 mt-1">فیکٹریوں سے وصول طلب رقم</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('deliveries')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-1.5 ${
            activeTab === 'deliveries'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>سپلائی و سیلز لیجر (Delivery Ledger) ({transactions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-1.5 ${
            activeTab === 'directory'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FactoryIcon className="w-3.5 h-3.5" />
          <span>فیکٹریاں ڈائریکٹری (Factories Directory) ({factories.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search factory name, invoice, vehicle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white"
        />
      </div>

      {/* TAB 1: DELIVERIES / TRANSACTIONS LEDGER */}
      {activeTab === 'deliveries' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">انوائس #</th>
                  <th className="py-3 px-3">تاریخ</th>
                  <th className="py-3 px-4">خریدار فیکٹری</th>
                  <th className="py-3 px-3">گاڑی / ڈرائیور</th>
                  <th className="py-3 px-3 text-right">چربی (KG)</th>
                  <th className="py-3 px-3 text-right">کچرا (KG)</th>
                  <th className="py-3 px-3 text-right">کل وزن</th>
                  <th className="py-3 px-3 text-right">ٹوٹل رقم</th>
                  <th className="py-3 px-3 text-right">وصول شدہ</th>
                  <th className="py-3 px-3 text-right">بقایا</th>
                  <th className="py-3 px-3 text-center">اسٹیٹس</th>
                  <th className="py-3 px-3 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredTransactions.map(tx => {
                  const f = factories.find(fac => fac.id === tx.factory_id) || tx.factory;
                  const receivedTotal = tx.received_amount || 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-purple-700">{tx.invoice_no}</td>
                      <td className="py-3 px-3 text-slate-600 font-sans">{formatDate(tx.transaction_date)}</td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">{f?.name || '—'}</td>
                      <td className="py-3 px-3 text-slate-600 font-sans">
                        {tx.vehicle_no ? `${tx.vehicle_no}` : '—'}
                        {tx.driver_name && <span className="text-[10px] text-slate-400 block">{tx.driver_name}</span>}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-800 font-bold">
                        {tx.charbi_weight} KG
                        <span className="text-[10px] text-slate-400 block">@{tx.charbi_rate}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-amber-800 font-bold">
                        {tx.kachara_weight} KG
                        <span className="text-[10px] text-slate-400 block">@{tx.kachara_rate}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">{tx.total_weight} KG</td>
                      <td className="py-3 px-3 text-right font-black text-blue-700">{formatCurrency(tx.total_amount)}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatCurrency(receivedTotal)}</td>
                      <td className="py-3 px-3 text-right font-black text-amber-700">{formatCurrency(tx.remaining_balance)}</td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.payment_status === 'partial'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {tx.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(tx)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="واٹس ایپ پر رسید بھیجیں"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTransaction(tx);
                              setTransactionModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="ایڈٹ کریں"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف کریں"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-sans">
                      کوئی سپلائی ریکارڈ موجود نہیں۔ اوپر "نئی سپلائی اندراج" پر کلک کریں۔
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FACTORIES DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factories.map(f => (
            <div
              key={f.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                    {f.area || 'City'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    f.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {f.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900">{f.name}</h3>
                  {f.contact_person && (
                    <p className="text-xs text-slate-500 font-medium">رابطہ شخص: {f.contact_person}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{f.phone}</span>
                  </div>
                  {f.whatsapp_no && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp: {f.whatsapp_no}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{f.address || 'Standard Plant Address'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    چربی ریٹ: {f.rate_charbi} PKR/KG
                  </span>
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg">
                    کچرا ریٹ: {f.rate_kachara} PKR/KG
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFactory(f);
                    setFactoryModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="ایڈٹ کریں"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFactory(f)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="حذف کریں"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT FACTORY */}
      <Modal
        isOpen={factoryModalOpen}
        onClose={() => setFactoryModalOpen(false)}
        title={editingFactory?.id ? 'Edit Factory' : 'Add New Factory (نئی فیکٹری شامل کریں)'}
        subtitle="Manage buyer profile, location, and standard buying rates"
        maxWidth="md"
      >
        <form onSubmit={handleSaveFactory} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Factory Name (فیکٹری کا نام) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Al-Hamd Protein Plant"
              value={editingFactory?.name || ''}
              onChange={e => setEditingFactory(prev => ({ ...(prev || {}), name: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Contact Person (رابطہ شخص)
              </label>
              <input
                type="text"
                placeholder="e.g. Sheikh Zahid"
                value={editingFactory?.contact_person || ''}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), contact_person: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                City / Location (شہر)
              </label>
              <input
                type="text"
                placeholder="e.g. Lahore / Sheikhupura"
                value={editingFactory?.area || ''}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), area: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Phone Number (فون نمبر) *
              </label>
              <input
                type="text"
                required
                placeholder="+92 300 0000000"
                value={editingFactory?.phone || ''}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), phone: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                WhatsApp Number (واٹس ایپ)
              </label>
              <input
                type="text"
                placeholder="+92 300 0000000"
                value={editingFactory?.whatsapp_no || ''}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), whatsapp_no: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-800 uppercase mb-1">
                Charbi Buying Rate (PKR/KG)
              </label>
              <input
                type="number"
                step="0.5"
                value={editingFactory?.rate_charbi ?? 75}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), rate_charbi: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-800 uppercase mb-1">
                Kachara Buying Rate (PKR/KG)
              </label>
              <input
                type="number"
                step="0.5"
                value={editingFactory?.rate_kachara ?? 60}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), rate_kachara: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Plant Address (پلانٹ کا پتہ)
            </label>
            <input
              type="text"
              placeholder="e.g. Multan Road, Near Sundar Estate"
              value={editingFactory?.address || ''}
              onChange={e => setEditingFactory(prev => ({ ...(prev || {}), address: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFactoryModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Factory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD / EDIT DELIVERY TRANSACTION */}
      <Modal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        title={editingTransaction?.id ? 'Edit Delivery Receipt' : 'نئی سپلائی ڈلیوری ریکارڈ (New Factory Delivery)'}
        subtitle="Record Charbi & Kachara supply weights, rates, total bill, and received payments"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Factory (خریدار فیکٹری) *
              </label>
              <select
                required
                value={editingTransaction?.factory_id || ''}
                onChange={e => {
                  const fId = e.target.value;
                  const f = factories.find(fac => fac.id === fId);
                  setEditingTransaction(prev => ({
                    ...(prev || {}),
                    factory_id: fId,
                    charbi_rate: f?.rate_charbi ?? (prev?.charbi_rate || 75),
                    kachara_rate: f?.rate_kachara ?? (prev?.kachara_rate || 60),
                  }));
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-600"
              >
                <option value="">Select Factory...</option>
                {factories.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.area})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Date (تاریخ) *
              </label>
              <input
                type="date"
                required
                value={editingTransaction?.transaction_date || ''}
                onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), transaction_date: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Vehicle No (گاڑی نمبر)
              </label>
              <input
                type="text"
                placeholder="e.g. LES-4921"
                value={editingTransaction?.vehicle_no || ''}
                onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), vehicle_no: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Driver Name (ڈرائیور)
              </label>
              <input
                type="text"
                placeholder="e.g. Muhammad Aslam"
                value={editingTransaction?.driver_name || ''}
                onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), driver_name: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Live Computations */}
          {(() => {
            const cWeight = parseFloat(String(editingTransaction?.charbi_weight || 0)) || 0;
            const cRate = parseFloat(String(editingTransaction?.charbi_rate || 0)) || 0;
            const cTotal = Math.round(cWeight * cRate);

            const kWeight = parseFloat(String(editingTransaction?.kachara_weight || 0)) || 0;
            const kRate = parseFloat(String(editingTransaction?.kachara_rate || 0)) || 0;
            const kTotal = Math.round(kWeight * kRate);

            const netWeight = Number((cWeight + kWeight).toFixed(2));
            const grandTotal = cTotal + kTotal;

            const adv = parseFloat(String(editingTransaction?.advance_amount || 0)) || 0;
            const rec = parseFloat(String(editingTransaction?.received_amount || 0)) || 0;
            const totalPaid = adv + rec;
            const remaining = Math.max(0, grandTotal - totalPaid);

            return (
              <>
                {/* Charbi Weights & Rates */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950">🟢 چربی وزن و ریٹ (Charbi Weight & Rate):</span>
                    <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                      کل چربی رقم: Rs. {cTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">چربی وزن (KG)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={editingTransaction?.charbi_weight || ''}
                        onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), charbi_weight: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">چربی ریٹ (PKR/KG)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="75"
                        value={editingTransaction?.charbi_rate || ''}
                        onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), charbi_rate: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-800 bg-emerald-100/50 px-2.5 py-1 rounded-lg flex justify-between items-center">
                    <span>حساب کتاب: {cWeight} KG × Rs. {cRate}</span>
                    <span className="font-black text-emerald-950">= Rs. {cTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Kachara Weights & Rates */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-950">🟠 کچرا وزن و ریٹ (Kachara Weight & Rate):</span>
                    <span className="font-mono font-bold text-xs text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                      کل کچرا رقم: Rs. {kTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">کچرا وزن (KG)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={editingTransaction?.kachara_weight || ''}
                        onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), kachara_weight: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">کچرا ریٹ (PKR/KG)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="60"
                        value={editingTransaction?.kachara_rate || ''}
                        onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), kachara_rate: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-amber-800 bg-amber-100/50 px-2.5 py-1 rounded-lg flex justify-between items-center">
                    <span>حساب کتاب: {kWeight} KG × Rs. {kRate}</span>
                    <span className="font-black text-amber-950">= Rs. {kTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Grand Summary of Weights & Bill */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-sans font-bold">⚖️ کل سپلائی وزن (Total Net Weight):</span>
                    <span className="text-sm font-black text-blue-700">{netWeight.toFixed(2)} KG</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900">
                    <span className="font-sans font-extrabold text-sm">💰 کل بل رقم (Total Bill):</span>
                    <span className="text-base font-black text-amber-700">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment & Advance */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                  <span className="font-bold text-xs text-blue-950 block">💳 ادائیگی و نقد وصولی (Payments & Balance):</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">ایڈوانس رقم (Advance PKR)</label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        placeholder="0"
                        value={editingTransaction?.advance_amount || ''}
                        onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), advance_amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">مزید وصولی (Received PKR)</label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        placeholder="0"
                        value={editingTransaction?.received_amount || ''}
                        onChange={e => setEditingTransaction(prev => ({ ...(prev || {}), received_amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Auto-Calculated Remaining Balance (Reminder Box) */}
                  <div className="p-3 bg-white border-2 border-amber-300 rounded-xl flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">بقایا رقم / ریمائنڈر (Remaining Balance):</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Rs. {grandTotal.toLocaleString()} - (Rs. {adv.toLocaleString()} + Rs. {rec.toLocaleString()})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-amber-900 block">
                        Rs. {remaining.toLocaleString()}
                      </span>
                      {remaining === 0 && grandTotal > 0 ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          مکمل ادا شدہ (Fully Paid)
                        </span>
                      ) : totalPaid > 0 ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          جزوی ادائیگی (Partial)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
                          غیر ادا شدہ (Unpaid)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTransactionModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Delivery Receipt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
