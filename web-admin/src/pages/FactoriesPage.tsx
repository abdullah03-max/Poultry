// =============================================================================
// SHAN POULTRY PROTEIN - Factories & Buyer Management Page
// Industrial buyers of Charbi (چربی) & Kachara (کچرا), Factory Advance Khata,
// Click-to-View Comprehensive Statement, Slip Add/Edit, and WhatsApp Sharing
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
  Printer,
  Scale,
  RefreshCcw,
  Zap,
  ArrowRight,
  X,
  Eye,
  FileText,
  Copy,
  Download,
  Check,
  Image as ImageIcon
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import {
  shareFactorySlipImage,
  shareFactoryStatementImage,
  openDirectSlipWhatsApp,
  openDirectStatementWhatsApp,
  copyBlobToClipboard,
} from '../utils/receiptImageGenerator';

export const FactoriesPage: React.FC = () => {
  // Default tab is DIRECTORY as requested by the user
  const [activeTab, setActiveTab] = useState<'directory' | 'deliveries'>('directory');
  const [factories, setFactories] = useState<Factory[]>([]);
  const [transactions, setTransactions] = useState<FactoryTransaction[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Today's auto-detected collection weights
  const [todayCharbiWeight, setTodayCharbiWeight] = useState<number>(0);
  const [todayKacharaWeight, setTodayKacharaWeight] = useState<number>(0);

  // Selected Factory for Statement & Ledger Modal
  const [statementFactoryId, setStatementFactoryId] = useState<string | null>(null);

  // Modals
  const [factoryModalOpen, setFactoryModalOpen] = useState<boolean>(false);
  const [editingFactory, setEditingFactory] = useState<Partial<Factory> | null>(null);

  const [slipModalOpen, setSlipModalOpen] = useState<boolean>(false);
  const [editingSlip, setEditingSlip] = useState<Partial<FactoryTransaction> | null>(null);

  // Quick Advance Update Modal
  const [advanceModalOpen, setAdvanceModalOpen] = useState<boolean>(false);
  const [advanceModalFactory, setAdvanceModalFactory] = useState<Factory | null>(null);
  const [advanceMode, setAdvanceMode] = useState<'add' | 'set'>('add');
  const [advanceInputValue, setAdvanceInputValue] = useState<number | ''>('');
  const [advanceInputNotes, setAdvanceInputNotes] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);

  // Receipt / Statement Image Preview Modal
  const [imagePreviewModalOpen, setImagePreviewModalOpen] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageBlob, setPreviewImageBlob] = useState<Blob | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');
  const [previewImageFilename, setPreviewImageFilename] = useState<string>('');
  const [previewPhone, setPreviewPhone] = useState<string>('');
  const [previewCaption, setPreviewCaption] = useState<string>('');
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [generatingImage, setGeneratingImage] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [fList, txList, bSettings, todayStats] = await Promise.all([
        api.getFactories(),
        api.getFactoryTransactions(),
        api.getSettings().catch(() => null),
        api.getCollectionStats({ startDate: todayStr, endDate: todayStr }).catch(() => null),
      ]);
      setFactories(fList);
      setTransactions(txList);
      if (bSettings) setSettings(bSettings);

      if (todayStats) {
        setTodayCharbiWeight(Number((todayStats.totalCharbiWeight || 0).toFixed(2)));
        setTodayKacharaWeight(Number((todayStats.totalKacharaWeight || 0).toFixed(2)));
      }
    } catch (err) {
      console.error('Failed to load factory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute overall KPIs across all factories
  const totalSuppliedWeight = transactions.reduce((acc, t) => acc + (t.total_weight || 0), 0);
  const totalBilledAmount = transactions.reduce((acc, t) => acc + (t.total_amount || 0), 0);
  const totalAdvancePool = factories.reduce((acc, f) => acc + Number(f.advance_amount || 0), 0);

  // Remaining advance per factory
  let totalAdvanceRemaining = 0;
  let totalBalanceDue = 0;
  factories.forEach(f => {
    const fTxs = transactions.filter(t => t.factory_id === f.id);
    const fBilled = fTxs.reduce((acc, t) => acc + (t.total_amount || 0), 0);
    const fAdv = Number(f.advance_amount || 0);
    const diff = fAdv - fBilled;
    if (diff > 0) {
      totalAdvanceRemaining += diff;
    } else {
      totalBalanceDue += Math.abs(diff);
    }
  });

  // Active statement factory
  const activeStatementFactory = statementFactoryId
    ? factories.find(f => f.id === statementFactoryId) || null
    : null;

  const activeStatementTxs = activeStatementFactory
    ? transactions
        .filter(t => t.factory_id === activeStatementFactory.id)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    : [];

  const activeStatementBilled = activeStatementTxs.reduce((acc, t) => acc + (t.total_amount || 0), 0);
  const activeStatementWeight = activeStatementTxs.reduce((acc, t) => acc + (t.total_weight || 0), 0);
  const activeStatementCharbiWeight = activeStatementTxs.reduce((acc, t) => acc + (t.charbi_weight || 0), 0);
  const activeStatementKacharaWeight = activeStatementTxs.reduce((acc, t) => acc + (t.kachara_weight || 0), 0);
  const activeStatementAdvance = Number(activeStatementFactory?.advance_amount || 0);
  const activeStatementRemainingAdvance = activeStatementAdvance - activeStatementBilled;

  // ---------------------------------------------------------------------------
  // FACTORY ACTIONS
  // ---------------------------------------------------------------------------
  const handleSaveFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactory?.name?.trim()) {
      alert('براہ کرم فیکٹری کا نام درج کریں۔ (Please enter factory name)');
      return;
    }

    try {
      setSaving(true);
      const advAmt = parseFloat(String(editingFactory.advance_amount || 0)) || 0;
      const cRate = parseFloat(String(editingFactory.rate_charbi ?? 75)) || 75;
      const kRate = parseFloat(String(editingFactory.rate_kachara ?? 60)) || 60;

      if (editingFactory.id) {
        await api.updateFactory(editingFactory.id, {
          name: editingFactory.name.trim(),
          contact_person: editingFactory.contact_person || null,
          phone: editingFactory.phone || '',
          whatsapp_no: editingFactory.whatsapp_no || editingFactory.phone || '',
          address: editingFactory.address || null,
          area: editingFactory.area || 'Lahore',
          rate_charbi: cRate,
          rate_kachara: kRate,
          advance_amount: advAmt,
          status: editingFactory.status || 'active',
          notes: editingFactory.notes || null,
        });
      } else {
        await api.createFactory({
          factory_code: `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
          name: editingFactory.name.trim(),
          contact_person: editingFactory.contact_person || null,
          phone: editingFactory.phone || '',
          whatsapp_no: editingFactory.whatsapp_no || editingFactory.phone || '',
          address: editingFactory.address || null,
          area: editingFactory.area || 'Lahore',
          rate_charbi: cRate,
          rate_kachara: kRate,
          advance_amount: advAmt,
          status: editingFactory.status || 'active',
          notes: editingFactory.notes || null,
        });
      }
      setFactoryModalOpen(false);
      setEditingFactory(null);
      await fetchData();
    } catch (err: any) {
      alert('فیکٹری محفوظ کرنے میں خرابی: ' + (err.message || 'Error saving factory'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFactory = async (f: Factory) => {
    if (!confirm(`کیا آپ واقعی فیکٹری "${f.name}" کو حذف کرنا چاہتے ہیں؟ اس سے منسلک ریکارڈ متاثر ہو سکتے ہیں۔`)) return;
    try {
      await api.deleteFactory(f.id);
      if (statementFactoryId === f.id) setStatementFactoryId(null);
      await fetchData();
    } catch (err: any) {
      alert('خرابی برائے حذف فیکٹری: ' + (err.message || 'Error'));
    }
  };

  // ---------------------------------------------------------------------------
  // SUPPLY SLIP (TRANSACTION) ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenNewSlip = (factory: Factory) => {
    setEditingSlip({
      factory_id: factory.id,
      transaction_date: new Date().toISOString().split('T')[0],
      invoice_no: `SPP-FAC-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicle_no: '',
      driver_name: '',
      charbi_weight: todayCharbiWeight,
      charbi_rate: factory.rate_charbi || 75,
      charbi_total: Math.round(todayCharbiWeight * (factory.rate_charbi || 75)),
      kachara_weight: todayKacharaWeight,
      kachara_rate: factory.rate_kachara || 60,
      kachara_total: Math.round(todayKacharaWeight * (factory.rate_kachara || 60)),
      total_weight: Number((todayCharbiWeight + todayKacharaWeight).toFixed(2)),
      total_amount: Math.round(
        todayCharbiWeight * (factory.rate_charbi || 75) +
        todayKacharaWeight * (factory.rate_kachara || 60)
      ),
      advance_amount: 0,
      received_amount: 0,
      remaining_balance: 0,
      payment_status: 'paid',
      notes: '',
    });
    setSlipModalOpen(true);
  };

  const handleOpenEditSlip = (tx: FactoryTransaction) => {
    setEditingSlip({ ...tx });
    setSlipModalOpen(true);
  };

  const handleSaveSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlip?.factory_id) {
      alert('براہ کرم فیکٹری منتخب کریں۔ (Please select factory)');
      return;
    }

    try {
      setSaving(true);
      const cWeight = parseFloat(String(editingSlip.charbi_weight || 0)) || 0;
      const cRate = parseFloat(String(editingSlip.charbi_rate || 0)) || 0;
      const cAmt = Math.round(cWeight * cRate);

      const kWeight = parseFloat(String(editingSlip.kachara_weight || 0)) || 0;
      const kRate = parseFloat(String(editingSlip.kachara_rate || 0)) || 0;
      const kAmt = Math.round(kWeight * kRate);

      const totW = Number((cWeight + kWeight).toFixed(2));
      const totAmt = cAmt + kAmt;

      const payload: Partial<FactoryTransaction> = {
        factory_id: editingSlip.factory_id,
        transaction_date: editingSlip.transaction_date || new Date().toISOString().split('T')[0],
        invoice_no: editingSlip.invoice_no || `SPP-FAC-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicle_no: editingSlip.vehicle_no || null,
        driver_name: editingSlip.driver_name || null,
        charbi_weight: cWeight,
        charbi_rate: cRate,
        charbi_total: cAmt,
        kachara_weight: kWeight,
        kachara_rate: kRate,
        kachara_total: kAmt,
        total_weight: totW,
        total_amount: totAmt,
        advance_amount: Number(editingSlip.advance_amount || 0),
        received_amount: Number(editingSlip.advance_amount || 0),
        remaining_balance: 0,
        payment_status: 'paid',
        notes: editingSlip.notes || null,
      };

      if (editingSlip.id) {
        await api.updateFactoryTransaction(editingSlip.id, payload);
      } else {
        await api.createFactoryTransaction(payload);
      }

      setSlipModalOpen(false);
      setEditingSlip(null);
      await fetchData();
    } catch (err: any) {
      alert('سپلائی پرچی محفوظ کرنے میں خرابی: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlip = async (tx: FactoryTransaction) => {
    if (!confirm(`کیا آپ واقعی سپلائی پرچی "${tx.invoice_no}" کو حذف کرنا چاہتے ہیں؟`)) return;
    try {
      await api.deleteFactoryTransaction(tx.id);
      await fetchData();
    } catch (err: any) {
      alert('پرچی حذف کرنے میں خرابی: ' + (err.message || 'Error'));
    }
  };

  // ---------------------------------------------------------------------------
  // QUICK ADVANCE UPDATE FOR FACTORY
  // ---------------------------------------------------------------------------
  const handleOpenAdvanceModal = (factory: Factory) => {
    setAdvanceModalFactory(factory);
    setAdvanceMode('add');
    setAdvanceInputValue('');
    setAdvanceInputNotes(`ایڈوانس وصولی بمطابق تاریخ ${new Date().toISOString().split('T')[0]}`);
    setAdvanceModalOpen(true);
  };

  const handleSaveAdvanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalFactory) return;

    try {
      setSaving(true);
      const inputAmt = parseFloat(String(advanceInputValue || 0)) || 0;
      const currentAdv = Number(advanceModalFactory.advance_amount || 0);

      let newAdvTotal = currentAdv;
      if (advanceMode === 'add') {
        newAdvTotal = currentAdv + inputAmt;
      } else {
        newAdvTotal = inputAmt;
      }

      const logEntry = `[${new Date().toISOString().split('T')[0]}] ایڈوانس اپ ڈیٹ: ${advanceMode === 'add' ? `+Rs. ${inputAmt.toLocaleString()} شامل` : `Rs. ${newAdvTotal.toLocaleString()} مقرر`} (${advanceInputNotes})`;
      const updatedNotes = advanceModalFactory.notes ? `${advanceModalFactory.notes}\n${logEntry}` : logEntry;

      await api.updateFactory(advanceModalFactory.id, {
        advance_amount: newAdvTotal,
        notes: updatedNotes,
      });

      setAdvanceModalOpen(false);
      setAdvanceModalFactory(null);
      await fetchData();
    } catch (err: any) {
      alert('ایڈوانس اپ ڈیٹ کرنے میں خرابی: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DIRECT WHATSAPP SHARING (NO CTRL+V / NO COPY-PASTE - DIRECTLY OPENS CHAT)
  // ---------------------------------------------------------------------------
  const handleSendDirectStatementWhatsApp = (factory: Factory, txs: FactoryTransaction[]) => {
    openDirectStatementWhatsApp({ factory, transactions: txs });
  };

  const handleSendDirectSlipWhatsApp = (tx: FactoryTransaction, factory: Factory) => {
    // Compute previous deliveries before this slip
    const facTxs = transactions
      .filter(t => t.factory_id === factory.id)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    let prevBilled = 0;
    for (const t of facTxs) {
      if (t.id === tx.id) break;
      prevBilled += (t.total_amount || 0);
    }

    openDirectSlipWhatsApp({
      slip: tx,
      factory,
      previousBilled: prevBilled,
      totalAdvance: Number(factory.advance_amount || 0),
    });
  };

  // ---------------------------------------------------------------------------
  // HIGH-RESOLUTION RECEIPT & STATEMENT PNG IMAGE PREVIEW & DOWNLOAD
  // ---------------------------------------------------------------------------
  const handlePreviewStatementImage = async (factory: Factory, txs: FactoryTransaction[]) => {
    try {
      setGeneratingImage(true);
      const res = await shareFactoryStatementImage({ factory, transactions: txs });
      setPreviewImageBlob(res.blob);
      setPreviewImageUrl(res.url);
      setPreviewImageTitle(`فیکٹری کھاتہ مکمل اسٹیٹمنٹ - ${factory.name}`);
      setPreviewImageFilename(res.filename);
      setPreviewPhone(res.phone);
      setPreviewCaption(res.caption);
      setCopiedFeedback(res.copied);
      setImagePreviewModalOpen(true);
    } catch (err: any) {
      alert('اسٹیٹمنٹ تصویر بنانے میں خرابی: ' + (err.message || 'Error generating image'));
    } finally {
      setGeneratingImage(false);
    }
  };

  const handlePreviewSlipImage = async (tx: FactoryTransaction, factory: Factory) => {
    try {
      setGeneratingImage(true);
      // Compute previous deliveries before this slip
      const facTxs = transactions
        .filter(t => t.factory_id === factory.id)
        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

      let prevBilled = 0;
      for (const t of facTxs) {
        if (t.id === tx.id) break;
        prevBilled += (t.total_amount || 0);
      }

      const res = await shareFactorySlipImage({
        slip: tx,
        factory,
        previousBilled: prevBilled,
        totalAdvance: Number(factory.advance_amount || 0),
      });

      setPreviewImageBlob(res.blob);
      setPreviewImageUrl(res.url);
      setPreviewImageTitle(`سپلائی رسید تصویر - انوائس #${tx.invoice_no}`);
      setPreviewImageFilename(res.filename);
      setPreviewPhone(res.phone);
      setPreviewCaption(res.caption);
      setCopiedFeedback(res.copied);
      setImagePreviewModalOpen(true);
    } catch (err: any) {
      alert('رسید تصویر بنانے میں خرابی: ' + (err.message || 'Error generating image'));
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleCopyPreviewImage = async () => {
    if (!previewImageBlob) return;
    const ok = await copyBlobToClipboard(previewImageBlob);
    if (ok) {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 3000);
    } else {
      alert('تصویر کلپ بورڈ میں کاپی نہیں ہو سکی۔ براہ کرم نیچے "ڈاؤنلوڈ" پر کلک کر کے واٹس ایپ میں بھیجیں۔');
    }
  };

  const handleDownloadPreviewImage = () => {
    if (!previewImageUrl) return;
    const a = document.createElement('a');
    a.href = previewImageUrl;
    a.download = previewImageFilename || 'receipt.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenWhatsAppFromPreview = () => {
    const encoded = encodeURIComponent(previewCaption);
    const waUrl = previewPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${previewPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Filtered factories and transactions based on search
  const filteredFactories = factories.filter(f => {
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.factory_code.toLowerCase().includes(q) ||
      (f.contact_person && f.contact_person.toLowerCase().includes(q)) ||
      (f.area && f.area.toLowerCase().includes(q)) ||
      f.phone.includes(q)
    );
  });

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
      {/* Top Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-700 shadow-2xs">
            <FactoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>فیکٹریاں و مال سپلائی کھاتہ</span>
              <span className="text-xs font-normal text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Industrial Buyers & Statement
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              فیکٹری ایڈوانس رقم، چربی و کچرا سپلائی پرچیاں، خودکار کٹوتی، کلک پر مکمل اسٹیٹمنٹ اور واٹس ایپ
            </p>
          </div>
        </div>

        {/* Header Action: Add Factory ONLY (Delivery is entered under each factory) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="ریفریش کریں"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                rate_charbi: 85,
                rate_kachara: 65,
                advance_amount: 0,
                status: 'active',
                notes: '',
              });
              setFactoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>نئی فیکٹری شامل کریں (New Factory)</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">کل سپلائی وزن</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-slate-900 font-mono">{formatWeight(totalSuppliedWeight)}</p>
          <p className="text-[10px] text-slate-400 mt-1">چربی و کچرا فیکٹریوں کو سپلائی</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">کل سپلائی بل رقم</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 font-mono">{formatCurrency(totalBilledAmount)}</p>
          <p className="text-[10px] text-slate-400 mt-1">تمام سپلائی پرچیوں کی مالیت</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">فیکٹری ایڈوانس پول</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 font-mono">{formatCurrency(totalAdvancePool)}</p>
          <p className="text-[10px] text-slate-400 mt-1">فیکٹریوں سے وصول شدہ کل ایڈوانس</p>
        </div>

        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-card bg-gradient-to-br from-white to-emerald-50/50">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">کل بقایا ایڈوانس</span>
            <span className="text-base">💰</span>
          </div>
          <p className="text-xl font-black text-emerald-700 font-mono">{formatCurrency(totalAdvanceRemaining)}</p>
          <p className="text-[10px] text-emerald-600 mt-1 font-medium">فیکٹریوں کے پاس باقی ایڈوانس بیلنس</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">بقایا واجب الادا</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 font-mono">{formatCurrency(totalBalanceDue)}</p>
          <p className="text-[10px] text-slate-400 mt-1">ایڈوانس سے زائد مال کی رقم</p>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FactoryIcon className="w-4 h-4" />
            <span>فیکٹریاں ڈائریکٹری (Factories Directory) ({factories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === 'deliveries'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>تمام سپلائی پرچیاں (All Supply Slips) ({transactions.length})</span>
          </button>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search factory name, code, invoice, vehicle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
          />
        </div>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: FACTORIES DIRECTORY (DEFAULT PRIMARY VIEW) */}
      {/* ======================================================================= */}
      {activeTab === 'directory' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              فیکٹری پر کلک کر کے اس کی مکمل اسٹیٹمنٹ دیکھیں، نئی سپلائی پرچی درج کریں، یا واٹس ایپ پر بھیجیں۔
            </span>
            <span className="font-mono text-purple-700 font-bold">
              {filteredFactories.length} فیکٹریاں موجود
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFactories.map(f => {
              const facTxs = transactions.filter(t => t.factory_id === f.id);
              const facBilled = facTxs.reduce((acc, t) => acc + (t.total_amount || 0), 0);
              const facWeight = facTxs.reduce((acc, t) => acc + (t.total_weight || 0), 0);
              const facAdvance = Number(f.advance_amount || 0);
              const facRemainingAdvance = facAdvance - facBilled;
              const hasCredit = facRemainingAdvance >= 0;

              return (
                <div
                  key={f.id}
                  onClick={() => setStatementFactoryId(f.id)}
                  className="bg-white border-2 border-slate-200 hover:border-purple-400 rounded-2xl p-5 shadow-card hover:shadow-lg transition cursor-pointer flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Top row: Name, Code & Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            {f.factory_code}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            فعال (Active)
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-purple-700 transition leading-snug">
                          {f.name}
                        </h3>
                      </div>

                      {/* Edit / Delete quick buttons */}
                      <div
                        className="flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFactory(f);
                            setFactoryModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                          title="فیکٹری ایڈٹ کریں"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFactory(f)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="فیکٹری حذف کریں"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Contact & Location Details */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {f.contact_person && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">رابطہ کار:</span>
                          <span className="font-semibold text-slate-800">{f.contact_person}</span>
                        </div>
                      )}
                      {f.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-700">{f.phone}</span>
                        </div>
                      )}
                      {f.area && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-700">{f.area}</span>
                        </div>
                      )}
                    </div>

                    {/* Rates Badges */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 block font-sans font-bold">چربی خریداری ریٹ</span>
                        <span className="font-black text-emerald-900 text-sm">Rs. {f.rate_charbi}/KG</span>
                      </div>
                      <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-amber-800 block font-sans font-bold">کچرا خریداری ریٹ</span>
                        <span className="font-black text-amber-900 text-sm">Rs. {f.rate_kachara}/KG</span>
                      </div>
                    </div>

                    {/* Live Financial Khata Summary Box */}
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-urdu">فیکٹری ایڈوانس رقم:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatCurrency(facAdvance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-urdu">کل سپلائی شدہ مالیت ({facTxs.length} پرچیاں):</span>
                        <span className="font-mono font-bold text-blue-700">
                          {formatCurrency(facBilled)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        <span>کل سپلائی وزن:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {facWeight.toFixed(2)} KG
                        </span>
                      </div>
                    </div>

                    {/* Remaining Advance Status Banner */}
                    <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between ${
                      hasCredit
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}>
                      <div>
                        <span className="text-[10px] font-bold block uppercase font-urdu">
                          {hasCredit ? '✓ صافی بقایا ایڈوانس:' : '⚠️ بقایا واجب الادا:'}
                        </span>
                        <span className="text-xs font-mono font-bold">
                          {hasCredit ? 'ایڈوانس ابھی موجود ہے' : 'فیکٹری نے دینا ہے'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-black font-mono block ${hasCredit ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {hasCredit ? `+${formatCurrency(facRemainingAdvance)}` : `-${formatCurrency(Math.abs(facRemainingAdvance))}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div
                    className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setStatementFactoryId(f.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl transition border border-purple-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>اسٹیٹمنٹ دیکھیں</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenNewSlip(f)}
                      className="flex items-center justify-center gap-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                      title="اس فیکٹری کو نئی سپلائی پرچی درج کریں"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>پرچی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendDirectStatementWhatsApp(f, facTxs)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-xl transition"
                      title="براہ راست فیکٹری واٹس ایپ پر مکمل کھاتہ اسٹیٹمنٹ بھیجیں (بغیر پیسٹ کیے)"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePreviewStatementImage(f, facTxs)}
                      className="p-2 text-purple-600 hover:bg-purple-50 border border-purple-200 rounded-xl transition"
                      title="اسٹیٹمنٹ کا تصویری کارڈ دیکھیں / ڈاؤنلوڈ کریں"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredFactories.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl p-8">
                <FactoryIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800">کوئی فیکٹری نہیں ملی</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  اوپر "نئی فیکٹری شامل کریں" کے بٹن پر کلک کر کے نئی خریدار فیکٹری کا اندراج کریں اور ایڈوانس رقم درج کریں۔
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: ALL SUPPLY SLIPS (DELIVERY LEDGER) */}
      {/* ======================================================================= */}
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
                  <th className="py-3 px-3 text-right">ٹوٹل بل</th>
                  <th className="py-3 px-3 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredTransactions.map(tx => {
                  const f = factories.find(fac => fac.id === tx.factory_id) || tx.factory;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-purple-700">{tx.invoice_no}</td>
                      <td className="py-3 px-3 text-slate-600 font-sans">{formatDate(tx.transaction_date)}</td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {f?.name || '—'}
                        {f?.area && <span className="text-[10px] text-slate-400 block font-normal">{f.area}</span>}
                      </td>
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
                      <td className="py-3 px-3 text-right font-black text-blue-700">{formatCurrency(tx.total_amount || 0)}</td>
                      <td className="py-3 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (f) handleSendDirectSlipWhatsApp(tx, f);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="براہ راست فیکٹری واٹس ایپ پر رسید بھیجیں (بغیر پیسٹ کیے)"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (f) handlePreviewSlipImage(tx, f);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="رسید کا تصویری کارڈ دیکھیں / ڈاؤنلوڈ کریں"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSlip(tx)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="پرچی ایڈٹ کریں"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlip(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="پرچی حذف کریں"
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
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                      کوئی سپلائی پرچی موجود نہیں۔ فیکٹری کارڈ پر کلک کر کے سپلائی درج کریں۔
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 1: FACTORY STATEMENT & SUPPLY LEDGER MODAL (ON CLICK FACTORY) */}
      {/* ======================================================================= */}
      {activeStatementFactory && (
        <Modal
          isOpen={statementFactoryId !== null}
          onClose={() => setStatementFactoryId(null)}
          title={`فیکٹری اسٹیٹمنٹ و کھاتہ لیجر - ${activeStatementFactory.name}`}
          subtitle={`کوڈ: ${activeStatementFactory.factory_code} | شہر: ${activeStatementFactory.area} | رابطہ: ${activeStatementFactory.contact_person || '—'} (${activeStatementFactory.phone})`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Top 3 Live Financial Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              {/* Badge 1: Advance Pool */}
              <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-purple-900 mb-1">
                    <span className="text-[11px] font-sans font-bold">فیکٹری ایڈوانس رقم</span>
                    <DollarSign className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xl font-black text-purple-900">
                    {formatCurrency(activeStatementAdvance)}
                  </p>
                  <p className="text-[10px] text-purple-600 font-sans mt-0.5">
                    فیکٹری سے وصول شدہ ایڈوانس پول
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAdvanceModal(activeStatementFactory)}
                  className="mt-2.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold font-sans transition flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ایڈوانس اپ ڈیٹ / شامل کریں</span>
                </button>
              </div>

              {/* Badge 2: Total Delivered Value & Weight */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-blue-900 mb-1">
                    <span className="text-[11px] font-sans font-bold">کل سپلائی شدہ مالیت</span>
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl font-black text-blue-900">
                    {formatCurrency(activeStatementBilled)}
                  </p>
                  <p className="text-[10px] text-blue-700 font-sans mt-0.5">
                    {activeStatementTxs.length} پرچیاں ({activeStatementWeight.toFixed(2)} KG)
                  </p>
                </div>
                <div className="mt-2 text-[10px] text-blue-800 bg-blue-100/70 p-1.5 rounded-lg">
                  چربی: {activeStatementCharbiWeight.toFixed(2)} KG | کچرا: {activeStatementKacharaWeight.toFixed(2)} KG
                </div>
              </div>

              {/* Badge 3: Net Remaining Advance Balance */}
              <div className={`rounded-2xl p-3.5 border-2 flex flex-col justify-between ${
                activeStatementRemainingAdvance >= 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-sans font-bold">
                      {activeStatementRemainingAdvance >= 0 ? 'صافی بقایا ایڈوانس' : 'بقایا واجب الادا'}
                    </span>
                    <Scale className="w-4 h-4" />
                  </div>
                  <p className={`text-xl font-black ${
                    activeStatementRemainingAdvance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {activeStatementRemainingAdvance >= 0
                      ? `+${formatCurrency(activeStatementRemainingAdvance)}`
                      : `-${formatCurrency(Math.abs(activeStatementRemainingAdvance))}`}
                  </p>
                  <p className="text-[10px] font-sans mt-0.5 font-bold">
                    {activeStatementRemainingAdvance >= 0
                      ? '✓ ایڈوانس رقم ابھی موجود ہے (Credit)'
                      : '⚠️ ایڈوانس ختم! فیکٹری نے رقم دینی ہے'}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-sans opacity-80">
                  ایڈوانس ({formatCurrency(activeStatementAdvance)}) - کل بل ({formatCurrency(activeStatementBilled)})
                </div>
              </div>
            </div>

            {/* Statement Action Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenNewSlip(activeStatementFactory)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>نئی سپلائی پرچی درج کریں (Add Slip)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingFactory(activeStatementFactory);
                    setFactoryModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                  <span>فیکٹری تفصیل بدلیں</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition"
                  title="اسٹیٹمنٹ پرنٹ کریں"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>پرنٹ (Print)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendDirectStatementWhatsApp(activeStatementFactory, activeStatementTxs)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
                  title="براہ راست فیکٹری واٹس ایپ پر مکمل کھاتہ اسٹیٹمنٹ بھیجیں (بغیر پیسٹ کیے)"
                >
                  <Share2 className="w-4 h-4" />
                  <span>واٹس ایپ پر اسٹیٹمنٹ بھیجیں</span>
                </button>

                <button
                  type="button"
                  disabled={generatingImage}
                  onClick={() => handlePreviewStatementImage(activeStatementFactory, activeStatementTxs)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-xl text-xs transition disabled:opacity-50"
                  title="اسٹیٹمنٹ کا تصویری کارڈ دیکھیں یا ڈاؤنلوڈ کریں"
                >
                  {generatingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  <span>تصویری کارڈ (PNG)</span>
                </button>
              </div>
            </div>

            {/* List of Slips for this Factory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>اس فیکٹری کی تمام سپلائی پرچیاں ({activeStatementTxs.length})</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  کسی بھی پرچی کے وزن یا ریٹ کو ایڈٹ کرنے کے لیے "ایڈٹ (✏️)" پر کلک کریں۔
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">انوائس #</th>
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">گاڑی / ڈرائیور</th>
                      <th className="py-2.5 px-3 text-right">چربی وزن و ریٹ</th>
                      <th className="py-2.5 px-3 text-right">کچرا وزن و ریٹ</th>
                      <th className="py-2.5 px-3 text-right">کل وزن</th>
                      <th className="py-2.5 px-3 text-right">کل بل رقم</th>
                      <th className="py-2.5 px-3 text-center">ایکشن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activeStatementTxs.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-purple-700">{tx.invoice_no}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-sans">{formatDate(tx.transaction_date)}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-sans">
                          {tx.vehicle_no || '—'}
                          {tx.driver_name && <span className="text-[10px] text-slate-400 block">{tx.driver_name}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-800 font-bold">
                          {tx.charbi_weight} KG
                          <span className="text-[10px] text-slate-400 block font-normal">
                            @{tx.charbi_rate} = Rs. {tx.charbi_total?.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-800 font-bold">
                          {tx.kachara_weight} KG
                          <span className="text-[10px] text-slate-400 block font-normal">
                            @{tx.kachara_rate} = Rs. {tx.kachara_total?.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{tx.total_weight} KG</td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-700">{formatCurrency(tx.total_amount || 0)}</td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSendDirectSlipWhatsApp(tx, activeStatementFactory)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="براہ راست فیکٹری واٹس ایپ پر رسید بھیجیں (بغیر پیسٹ کیے)"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePreviewSlipImage(tx, activeStatementFactory)}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              title="رسید تصویری کارڈ دیکھیں / ڈاؤنلوڈ کریں"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSlip(tx)}
                              className="p-1 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                              title="پرچی ایڈٹ کریں (وزن و ریٹ بدلیں)"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSlip(tx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="پرچی حذف کریں"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {activeStatementTxs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                          اس فیکٹری کے لیے ابھی کوئی سپلائی پرچی درج نہیں ہوئی۔ اوپر "نئی سپلائی پرچی درج کریں" پر کلک کریں۔
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer close */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatementFactoryId(null)}
                className="px-5 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
              >
                بند کریں (Close)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: ADD / EDIT FACTORY (INCLUDES ADVANCE AMOUNT FROM FACTORY) */}
      {/* ======================================================================= */}
      <Modal
        isOpen={factoryModalOpen}
        onClose={() => setFactoryModalOpen(false)}
        title={editingFactory?.id ? 'فیکٹری تفصیلات تبدیل کریں (Edit Factory)' : 'نئی خریدار فیکٹری شامل کریں (New Factory)'}
        subtitle="فیکٹری کا نام، ایڈوانس رقم، خریداری ریٹ اور رابطے کی تفصیلات"
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
              placeholder="e.g. Irfan Jatt Protien Waste Factory"
              value={editingFactory?.name || ''}
              onChange={e => setEditingFactory(prev => ({ ...(prev || {}), name: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* ADVANCE AMOUNT DIRECTLY ON FACTORY */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1.5">
            <label className="block text-xs font-bold text-purple-950 font-urdu">
              💵 فیکٹری سے موصول شدہ ایڈوانس رقم (Advance Amount Received PKR) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 87042"
              value={editingFactory?.advance_amount ?? ''}
              onChange={e =>
                setEditingFactory(prev => ({
                  ...(prev || {}),
                  advance_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2 text-sm font-mono font-black text-purple-950 focus:outline-none focus:border-purple-600 shadow-2xs"
            />
            <p className="text-[10px] text-purple-700 font-urdu">
              اس فیکٹری سے جو ایڈوانس ملا ہے یہاں درج کریں۔ تمام سپلائی پرچیاں خودکار اس سے منہا ہوں گی۔
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Contact Person (نمائندہ / رابطہ کار)
              </label>
              <input
                type="text"
                placeholder="e.g. Irfan"
                value={editingFactory?.contact_person || ''}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), contact_person: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Area / City (شہر)
              </label>
              <input
                type="text"
                placeholder="e.g. Vehari, Lahore, Multan"
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
                WhatsApp No (واٹس ایپ)
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

          {/* Rates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-800 uppercase mb-1">
                Charbi Buying Rate (چربی ریٹ PKR/KG)
              </label>
              <input
                type="number"
                step="any"
                value={editingFactory?.rate_charbi ?? 85}
                onChange={e => setEditingFactory(prev => ({ ...(prev || {}), rate_charbi: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-800 uppercase mb-1">
                Kachara Buying Rate (کچرا ریٹ PKR/KG)
              </label>
              <input
                type="number"
                step="any"
                value={editingFactory?.rate_kachara ?? 65}
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
              placeholder="e.g. Vehari Industrial Road"
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
              کینسل (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'محفوظ ہو رہا ہے...' : 'فیکٹری محفوظ کریں (Save Factory)'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================= */}
      {/* MODAL 3: ADD / EDIT SUPPLY SLIP (FOR SPECIFIC FACTORY) */}
      {/* ======================================================================= */}
      <Modal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        title={editingSlip?.id ? 'سپلائی پرچی ایڈٹ کریں (Edit Supply Slip)' : 'نئی سپلائی پرچی درج کریں (New Supply Slip)'}
        subtitle="چربی و کچرا کا وزن اور ریٹ درج کریں (آج کی کلیکشن کا وزن خودکار دستیاب ہے)"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSlip} className="space-y-4 text-xs">
          {/* Auto-detected Today's Collection Banner */}
          <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-900 block flex items-center gap-1.5 font-urdu">
                <Zap className="w-3.5 h-3.5 text-purple-600" />
                آج کی کلیکشن کا وزن (Auto-detected from Today's Collections):
              </span>
              <span className="text-[11px] text-purple-700 font-mono">
                چربی: <strong>{todayCharbiWeight} KG</strong> | کچرا: <strong>{todayKacharaWeight} KG</strong> (کل: {(todayCharbiWeight + todayKacharaWeight).toFixed(2)} KG)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSlip(prev => ({
                  ...(prev || {}),
                  charbi_weight: todayCharbiWeight,
                  kachara_weight: todayKacharaWeight,
                }));
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition font-urdu shadow-2xs"
            >
              ⚡ یہ وزن درج کریں
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Factory (خریدار فیکٹری) *
              </label>
              <select
                required
                value={editingSlip?.factory_id || ''}
                onChange={e => {
                  const fId = e.target.value;
                  const f = factories.find(fac => fac.id === fId);
                  setEditingSlip(prev => ({
                    ...(prev || {}),
                    factory_id: fId,
                    charbi_rate: f?.rate_charbi ?? (prev?.charbi_rate || 85),
                    kachara_rate: f?.rate_kachara ?? (prev?.kachara_rate || 65),
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
                value={editingSlip?.transaction_date || ''}
                onChange={e => setEditingSlip(prev => ({ ...(prev || {}), transaction_date: e.target.value }))}
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
                value={editingSlip?.vehicle_no || ''}
                onChange={e => setEditingSlip(prev => ({ ...(prev || {}), vehicle_no: e.target.value }))}
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
                value={editingSlip?.driver_name || ''}
                onChange={e => setEditingSlip(prev => ({ ...(prev || {}), driver_name: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Live Computations of Charbi & Kachara */}
          {(() => {
            const cWeight = parseFloat(String(editingSlip?.charbi_weight || 0)) || 0;
            const cRate = parseFloat(String(editingSlip?.charbi_rate || 0)) || 0;
            const cTotal = Math.round(cWeight * cRate);

            const kWeight = parseFloat(String(editingSlip?.kachara_weight || 0)) || 0;
            const kRate = parseFloat(String(editingSlip?.kachara_rate || 0)) || 0;
            const kTotal = Math.round(kWeight * kRate);

            const netWeight = Number((cWeight + kWeight).toFixed(2));
            const grandTotal = cTotal + kTotal;

            const selectedFac = factories.find(f => f.id === editingSlip?.factory_id);
            const facAdv = Number(selectedFac?.advance_amount || 0);

            // Previous slips total for this factory (excluding this slip if editing)
            const otherBilled = transactions
              .filter(t => t.factory_id === editingSlip?.factory_id && t.id !== editingSlip?.id)
              .reduce((s, t) => s + (t.total_amount || 0), 0);

            const newTotalBilled = otherBilled + grandTotal;
            const newRemainingAdvance = facAdv - newTotalBilled;

            return (
              <>
                {/* Charbi Weights & Rates */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950 font-urdu">🟢 چربی وزن و ریٹ (Charbi Weight & Rate):</span>
                    <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                      چربی رقم: Rs. {cTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 font-urdu">چربی وزن (KG) *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.0"
                        value={editingSlip?.charbi_weight ?? ''}
                        onChange={e => setEditingSlip(prev => ({ ...(prev || {}), charbi_weight: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 font-urdu">چربی ریٹ (PKR/KG) *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="85"
                        value={editingSlip?.charbi_rate ?? ''}
                        onChange={e => setEditingSlip(prev => ({ ...(prev || {}), charbi_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
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
                    <span className="font-bold text-xs text-amber-950 font-urdu">🟠 کچرا وزن و ریٹ (Kachara Weight & Rate):</span>
                    <span className="font-mono font-bold text-xs text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                      کچرا رقم: Rs. {kTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 font-urdu">کچرا وزن (KG) *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.0"
                        value={editingSlip?.kachara_weight ?? ''}
                        onChange={e => setEditingSlip(prev => ({ ...(prev || {}), kachara_weight: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 font-urdu">کچرا ریٹ (PKR/KG) *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="65"
                        value={editingSlip?.kachara_rate ?? ''}
                        onChange={e => setEditingSlip(prev => ({ ...(prev || {}), kachara_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
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
                    <span className="font-sans font-extrabold text-sm">💰 اس پرچی کا کل بل:</span>
                    <span className="text-base font-black text-blue-700">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Live Impact on Factory Advance Preview */}
                <div className={`p-3.5 rounded-xl border-2 transition ${
                  newRemainingAdvance >= 0
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50/90 border-rose-300 text-rose-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold block font-urdu">
                        {newRemainingAdvance >= 0
                          ? '✓ فیکٹری کے ایڈوانس سے خودکار کٹوتی کے بعد باقی ریمائنڈر:'
                          : '⚠️ فیکٹری کا ایڈوانس ختم ہو چکا ہے!'}
                      </span>
                      <span className="text-[10px] opacity-80 font-mono">
                        فیکٹری ایڈوانس ({formatCurrency(facAdv)}) - کل سپلائی ({formatCurrency(newTotalBilled)})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-black font-mono block ${
                        newRemainingAdvance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {newRemainingAdvance >= 0
                          ? `+${formatCurrency(newRemainingAdvance)}`
                          : `-${formatCurrency(Math.abs(newRemainingAdvance))}`}
                      </span>
                      <span className="text-[10px] font-bold uppercase font-urdu">
                        {newRemainingAdvance >= 0 ? 'ایڈوانس ابھی موجود ہے' : 'فیکٹری کے ذمے بقایا'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Notes & Dispatch Details (اضافی تفصیل یا ریمارکس)
            </label>
            <input
              type="text"
              placeholder="e.g. مال فیکٹری میں بروقت وصول پا کر وزن تسلیم کیا گیا"
              value={editingSlip?.notes || ''}
              onChange={e => setEditingSlip(prev => ({ ...(prev || {}), notes: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSlipModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
            >
              کینسل (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'محفوظ ہو رہا ہے...' : 'پرچی محفوظ کریں (Save Slip)'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================= */}
      {/* MODAL 4: QUICK ADVANCE UPDATE FOR FACTORY */}
      {/* ======================================================================= */}
      {advanceModalFactory && (
        <Modal
          isOpen={advanceModalOpen}
          onClose={() => setAdvanceModalOpen(false)}
          title={`فیکٹری ایڈوانس رقم اپ ڈیٹ کریں - ${advanceModalFactory.name}`}
          subtitle="فیکٹری سے نئی ایڈوانس رقم شامل کریں یا کل ایڈوانس تبدیل کریں"
          maxWidth="md"
        >
          <form onSubmit={handleSaveAdvanceUpdate} className="space-y-4 text-xs">
            {/* Current status */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono">
              <span className="font-sans text-slate-600">موجودہ ایڈوانس رقم:</span>
              <span className="font-black text-purple-800 text-base">
                {formatCurrency(Number(advanceModalFactory.advance_amount || 0))}
              </span>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdvanceMode('add')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                  advanceMode === 'add'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                + اضافی ایڈوانس شامل کریں
              </button>
              <button
                type="button"
                onClick={() => setAdvanceMode('set')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                  advanceMode === 'set'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                کل ایڈوانس تبدیل کریں
              </button>
            </div>

            {/* Input Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {advanceMode === 'add' ? 'نیا ایڈوانس رقم (PKR) جو شامل کرنی ہے *' : 'نئی کل ایڈوانس رقم (PKR) *'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="e.g. 50000"
                value={advanceInputValue}
                onChange={e => setAdvanceInputValue(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-purple-950 focus:outline-none focus:border-purple-600 shadow-2xs"
              />
            </div>

            {/* Preview */}
            {(() => {
              const current = Number(advanceModalFactory.advance_amount || 0);
              const input = parseFloat(String(advanceInputValue || 0)) || 0;
              const resultingAdv = advanceMode === 'add' ? current + input : input;

              return (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between font-mono text-emerald-950">
                  <span className="font-sans text-xs">اپ ڈیٹ کے بعد کل ایڈوانس:</span>
                  <span className="font-black text-lg text-emerald-700">
                    {formatCurrency(resultingAdv)}
                  </span>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                ریمارکس یا بینک تفصیل (Notes)
              </label>
              <input
                type="text"
                placeholder="e.g. چیک نمبر یا آن لائن بینک ٹرانسفر"
                value={advanceInputNotes}
                onChange={e => setAdvanceInputNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdvanceModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
              >
                کینسل (Cancel)
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {saving ? 'محفوظ ہو رہا ہے...' : 'ایڈوانس محفوظ کریں (Save Advance)'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================================= */}
      {/* MODAL 5: RECEIPT / STATEMENT IMAGE PREVIEW MODAL */}
      {/* ======================================================================= */}
      <Modal
        isOpen={imagePreviewModalOpen}
        onClose={() => setImagePreviewModalOpen(false)}
        title={previewImageTitle || 'رسید تصویر'}
        subtitle="یہ تصویر فیکٹری کو بھیجی جائے گی (وزن، ریٹ، بل اور ایڈوانس کی مکمل تفصیلات کے ساتھ)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Notification banner */}
          <div className="p-3.5 bg-purple-50/90 border border-purple-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <span className="font-bold text-xs text-purple-950 block font-urdu">
                  {copiedFeedback
                    ? '✓ تصویر آپ کے کلپ بورڈ میں کاپی ہو چکی ہے!'
                    : 'رسید کی تصویر تیار ہے!'}
                </span>
                <span className="text-[11px] text-purple-800 font-urdu block mt-0.5">
                  تصویر محفوظ کرنے کے لیے "ڈاؤنلوڈ (PNG)" پر کلک کریں، یا "واٹس ایپ چیٹ کھولیں" پر کلک کر کے براہ راست رسید بھیجیں۔
                </span>
              </div>
            </div>
            {copiedFeedback && (
              <span className="shrink-0 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl font-urdu border border-emerald-300 flex items-center gap-1 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>کاپی ہو گئی!</span>
              </span>
            )}
          </div>

          {/* Rendered Image Display */}
          {previewImageUrl && (
            <div className="max-h-[62vh] overflow-y-auto border-2 border-slate-200 rounded-2xl p-2.5 bg-slate-100/90 flex justify-center shadow-inner">
              <img
                src={previewImageUrl}
                alt="Receipt Preview"
                className="max-w-full h-auto rounded-xl shadow-md border border-slate-300"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPreviewImage}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedFeedback ? '✓ دوبارہ کاپی ہو گئی' : 'تصویر کاپی کریں (Ctrl + V)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPreviewImage}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition border border-slate-200"
              >
                <Download className="w-4 h-4" />
                <span>ڈاؤنلوڈ (PNG)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsAppFromPreview}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
              >
                <Share2 className="w-4 h-4" />
                <span>واٹس ایپ چیٹ کھولیں</span>
              </button>

              <button
                type="button"
                onClick={() => setImagePreviewModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
