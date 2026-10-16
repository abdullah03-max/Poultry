// =============================================================================
// SHAN POULTRY PROTEIN - Daily Record Reconciliation Page
// Daylight B2B Clean Palette Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, WeightCategory } from '../types/database';
import { formatDate, formatTime, formatWeight, formatCurrency } from '../utils/formatters';
import { Calendar, Printer, Scale, Eye, Edit2, Trash2, Loader2, ArrowLeft, ArrowRight, DollarSign, FileSpreadsheet } from 'lucide-react';
import { CollectionDetailModal } from '../components/collections/CollectionDetailModal';
import { EditCollectionModal } from '../components/collections/EditCollectionModal';
import { triggerPrint } from '../utils/exportUtils';

interface DailyRecordPageProps {
  refreshTrigger?: number;
}

const getTodayPK = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Returns "YYYY-MM-DD"
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

const getYesterdayPK = (): string => {
  const parts = getTodayPK().split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DailyRecordPage: React.FC<DailyRecordPageProps> = ({ refreshTrigger }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayPK());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<WeightCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSlip, setSelectedSlip] = useState<Collection | null>(null);
  const [editingSlip, setEditingSlip] = useState<Collection | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const [res, cats] = await Promise.all([
        api.getCollections({ startDate: selectedDate, endDate: selectedDate, limit: 500 }),
        api.getWeightCategories(),
      ]);
      setCollections(res.collections);
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching daily records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate, refreshTrigger]);

  const changeDateByDays = (delta: number) => {
    const parts = selectedDate.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleDeleteCollection = async (id: string, receipt_no: string) => {
    if (!confirm(`Are you sure you want to delete collection slip ${receipt_no}? This will recalculate the daily records and register.`)) {
      return;
    }
    try {
      await api.deleteCollection(id);
      fetchDailyData();
    } catch (err: any) {
      alert(`Failed to delete collection: ${err.message || 'Error'}`);
    }
  };

  const totalGross = collections.reduce((acc, c) => acc + (Number(c.gross_weight) || 0), 0);
  const totalTare = collections.reduce((acc, c) => acc + (Number(c.tare_weight) || 0), 0);
  const totalCharbi = collections.reduce((acc, c) => acc + (Number(c.charbi_net) || 0), 0);
  const totalKachara = collections.reduce((acc, c) => {
    const k = Number(c.kachara_net || 0);
    const charbi = Number(c.charbi_net || 0);
    if (k === 0 && charbi === 0 && Number(c.total_net_weight || 0) > 0) {
      return acc + Number(c.total_net_weight);
    }
    return acc + k;
  }, 0);
  const totalNet = collections.reduce((acc, c) => acc + (Number(c.total_net_weight) || 0), 0);
  const totalAmount = collections.reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);

  // Category subtotals for the day
  const categoryDaySums: Record<string, number> = {};
  collections.forEach(c => {
    c.items?.forEach((it: any) => {
      categoryDaySums[it.category_id] = (categoryDaySums[it.category_id] || 0) + it.weight;
    });
  });

  // Group daily collections by customer_id to detect multiple collections on the same day
  const duplicateCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    collections.forEach(c => {
      if (c.customer_id) {
        map.set(c.customer_id, (map.get(c.customer_id) || 0) + 1);
      }
    });
    return map;
  }, [collections]);

  const suspectedDuplicatesCount = React.useMemo(() => {
    return collections.filter(c => (duplicateCounts.get(c.customer_id) || 0) > 1 && !c.duplicate_cleared).length;
  }, [collections, duplicateCounts]);

  const handleToggleDuplicateCleared = async (collectionId: string, cleared: boolean) => {
    try {
      await api.setCollectionDuplicateCleared(collectionId, cleared);
      setCollections(prev => prev.map(c => c.id === collectionId ? {
        ...c,
        duplicate_cleared: cleared,
        duplicate_cleared_at: cleared ? new Date().toISOString() : null,
        duplicate_cleared_by: cleared ? 'Admin' : null,
      } : c));
    } catch (err: any) {
      alert(`ڈپلیکیٹ اسٹیٹس تبدیل نہیں ہو سکا: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Header & Quick Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-card no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-urdu">
                روزانہ کلیکشن ریکارڈ شیٹ (Daily Weight Record)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تاریخ <strong>{formatDate(selectedDate)}</strong> کے تمام ویسٹ کلیکشن اور پرچیوں کا روزنامچہ
                <span className="ml-2 font-mono font-bold text-blue-600">({collections.length} Slips)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/80 p-1">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
              title="Previous Day"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none font-mono"
            />

            <button
              onClick={() => changeDateByDays(1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
              title="Next Day"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(getTodayPK())}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition font-urdu ${
              selectedDate === getTodayPK()
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            📅 آج (Today)
          </button>

          <button
            onClick={() => setSelectedDate(getYesterdayPK())}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition font-urdu ${
              selectedDate === getYesterdayPK()
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            ◀ کل (Yesterday)
          </button>

          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition font-urdu cursor-pointer active:scale-95"
            title="مکمل روزانہ شیٹ پرنٹ کریں"
          >
            <Printer className="w-4 h-4" />
            <span>پرنٹ شیٹ (Print)</span>
          </button>
        </div>
      </div>

      {/* Helpful banner when selected date has no slips */}
      {collections.length === 0 && !loading && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print shadow-xs">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">منتخب تاریخ ({formatDate(selectedDate)}):</span>
              <span className="ml-1 text-slate-700">اس تاریخ کی کوئی کلیکشن پرچی سسٹم میں نہیں ملی۔</span>
            </div>
          </div>
          {selectedDate !== getYesterdayPK() && (
            <button
              onClick={() => setSelectedDate(getYesterdayPK())}
              className="text-xs font-bold px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition shadow-2xs font-urdu whitespace-nowrap"
            >
              گزشتہ کل (15 Oct) کا ریکارڈ دیکھیں ➔
            </button>
          )}
        </div>
      )}

      {/* Suspected Duplicate Notice Banner */}
      {suspectedDuplicatesCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-center justify-between gap-3 no-print shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-200 text-rose-800 text-base">⚠️</span>
            <div>
              <h4 className="font-bold text-sm font-urdu">
                مشکوک ڈپلیکیٹ پرچیاں موجود ہیں ({suspectedDuplicatesCount})
              </h4>
              <p className="text-xs text-rose-700 font-urdu mt-0.5">
                ایک ہی گاہک کے لیے آج کی تاریخ میں ایک سے زائد پرچیاں ملی ہیں۔ اگر یہ چربی اور کچرا کی جائز الگ الگ پرچیاں ہیں تو نیچے پرچی کے سامنے <strong className="bg-rose-200 px-1.5 py-0.5 rounded font-bold font-mono">✓ کلیئر کریں</strong> پر کلک کر کے تصدیق کریں۔
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Print-Only Professional Header & 1-Line Compact Summary */}
      <div className="hidden print-only mb-3">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">SHAN POULTRY PROTEIN</h1>
            <p className="text-xs font-bold text-slate-700 font-urdu">
              روزانہ ویسٹ کلیکشن و وزن ریکارڈ شیٹ (Daily Weight Collection Sheet)
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900">
              تاریخ (Date): <span className="font-mono text-sm underline">{formatDate(selectedDate)}</span>
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              پرنٹ وقت: {new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' })} {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })} PKT
            </p>
          </div>
        </div>

        {/* Ultra-compact 1-line KPI summary box for print */}
        <div className="grid grid-cols-6 gap-1 bg-slate-100 border border-slate-400 rounded p-1.5 text-center text-[10px]">
          <div>
            <span className="text-slate-600 block text-[9px] uppercase font-bold">Slips (پرچیاں)</span>
            <span className="font-mono font-black text-slate-900 text-xs">{collections.length}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[9px] uppercase font-bold">Net (کل وزن)</span>
            <span className="font-mono font-black text-blue-900 text-xs">{totalNet.toFixed(1)} KG</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[9px] uppercase font-bold">Charbi (چربی)</span>
            <span className="font-mono font-black text-amber-900 text-xs">{totalCharbi.toFixed(1)} KG</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[9px] uppercase font-bold">Kachra (کچرا)</span>
            <span className="font-mono font-black text-slate-900 text-xs">{totalKachara.toFixed(1)} KG</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[9px] uppercase font-bold">Gross / Tare</span>
            <span className="font-mono font-bold text-slate-700 text-[10px]">{totalGross.toFixed(1)} / -{totalTare.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[9px] uppercase font-bold">Day Total (کل رقم)</span>
            <span className="font-mono font-black text-emerald-900 text-xs">Rs. {totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Screen-Only Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 no-print">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Net Weight</p>
              <p className="text-xs font-urdu font-semibold text-slate-800 mt-0.5">کل خالص وزن</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-700 font-mono mt-2">{formatWeight(totalNet)}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">Gross: {totalGross.toFixed(1)} | Tare: -{totalTare.toFixed(1)}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-amber-200/90 shadow-card flex flex-col justify-between bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Charbi</p>
              <p className="text-xs font-urdu font-semibold text-amber-950 mt-0.5">کل چربی وزن</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-100/70 text-amber-700">
              <span className="text-sm">🥩</span>
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-700 font-mono mt-2">{totalCharbi.toFixed(1)} <span className="text-xs text-amber-800 font-sans">KG</span></p>
          <p className="text-[10px] text-amber-600 mt-1 font-urdu">چربی مال مجموعہ</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-300/80 shadow-card flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Kachra</p>
              <p className="text-xs font-urdu font-semibold text-slate-900 mt-0.5">کل کچرا وزن</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <span className="text-sm">🗑️</span>
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-2">{totalKachara.toFixed(1)} <span className="text-xs text-slate-500 font-sans">KG</span></p>
          <p className="text-[10px] text-slate-500 mt-1 font-urdu">کچرا و آلائش مجموعہ</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Day Billing</p>
              <p className="text-xs font-urdu font-semibold text-emerald-900 mt-0.5">کل مالیت رقم</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-2">{formatCurrency(totalAmount)}</p>
          <p className="text-[10px] text-emerald-600 mt-1">آج کی کل رقم</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Slips Completed</p>
              <p className="text-xs font-urdu font-semibold text-indigo-900 mt-0.5">کل پرچیاں</p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-indigo-700 font-mono mt-2">{collections.length}</p>
          <p className="text-[10px] text-indigo-600 mt-1">فیلڈ پرچیاں</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Average / Slip</p>
              <p className="text-xs font-urdu font-semibold text-purple-900 mt-0.5">اوسط وزن فی دکان</p>
            </div>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-purple-700 font-mono mt-2">
            {formatWeight(collections.length > 0 ? totalNet / collections.length : 0)}
          </p>
          <p className="text-[10px] text-purple-600 mt-1">فی پرچی اوسط</p>
        </div>
      </div>

      {/* Slips Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card print:border-none print:shadow-none">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 no-print">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Daily Collection Slips ({collections.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">{formatDate(selectedDate)}</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs">Loading daily records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse text-xs print-table min-w-[850px] print:min-w-0">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-2 print:py-1 print:px-1 text-center w-8 print:w-6">#</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 whitespace-nowrap">Receipt No</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 whitespace-nowrap">Time</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-2">Customer Name</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5">Area</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5">Collector</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 text-right whitespace-nowrap">Gross (KG)</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 text-right whitespace-nowrap">Tare (KG)</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 text-right text-amber-700 font-bold whitespace-nowrap">Charbi (KG)</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 text-right text-slate-800 font-bold whitespace-nowrap">Kachra (KG)</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 text-right text-blue-700 font-bold whitespace-nowrap">Net (KG)</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 text-right whitespace-nowrap">Rate</th>
                  <th className="py-2.5 px-2 print:py-1 print:px-1.5 text-right text-amber-700 font-bold whitespace-nowrap">Amount (PKR)</th>
                  <th className="py-2.5 px-2 text-center no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.map((c, idx) => {
                  const isMultiSlip = (duplicateCounts.get(c.customer_id) || 0) > 1;
                  const isSuspectedDuplicate = isMultiSlip && !c.duplicate_cleared;
                  const isClearedDuplicate = isMultiSlip && Boolean(c.duplicate_cleared);

                  return (
                    <tr
                      key={c.id}
                      className={`transition ${
                        isSuspectedDuplicate
                          ? 'bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-l-rose-500'
                          : isClearedDuplicate
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2.5 px-2 print:py-1 print:px-1 text-slate-400 text-center font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 font-mono font-bold text-blue-600 print:text-slate-900 whitespace-nowrap">
                        {c.receipt_no}
                      </td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-slate-600 font-mono whitespace-nowrap">{formatTime(c.collection_time)}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-2 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{c.customer?.name}</span>
                          {isSuspectedDuplicate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse font-urdu">
                              ⚠️ مشکوک ڈپلیکیٹ
                            </span>
                          )}
                          {isClearedDuplicate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-urdu">
                              ✓ تصدیق شدہ علیحدہ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 print:text-[8px] font-normal">{c.customer?.customer_code}</div>
                      </td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-slate-600 whitespace-nowrap">{c.customer?.area}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-slate-700 font-medium whitespace-nowrap">{c.worker?.full_name || 'Admin'}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-right font-mono text-slate-600 whitespace-nowrap">{Number(c.gross_weight).toFixed(1)}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-right font-mono text-rose-600 whitespace-nowrap">-{Number(c.tare_weight).toFixed(1)}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-right font-mono font-bold text-amber-700 print:text-slate-900 whitespace-nowrap">
                        {c.charbi_net && Number(c.charbi_net) > 0 ? (
                          Number(c.charbi_net).toFixed(1)
                        ) : (
                          <span className="text-slate-300 font-normal">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {(() => {
                          const k = Number(c.kachara_net || 0);
                          const charbi = Number(c.charbi_net || 0);
                          const displayK = (k === 0 && charbi === 0 && Number(c.total_net_weight || 0) > 0) ? Number(c.total_net_weight) : k;
                          return displayK > 0 ? displayK.toFixed(1) : <span className="text-slate-300 font-normal">0</span>;
                        })()}
                      </td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-right font-mono font-bold text-blue-700 print:text-slate-900 whitespace-nowrap">{Number(c.total_net_weight).toFixed(1)}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-right font-mono text-slate-500 whitespace-nowrap">{c.rate_per_kg}</td>
                      <td className="py-2.5 px-2 print:py-1 print:px-1.5 text-right font-mono font-bold text-amber-700 print:text-slate-900 whitespace-nowrap">{formatCurrency(c.total_amount, '')}</td>
                      <td className="py-2.5 px-2 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {isSuspectedDuplicate && (
                            <button
                              type="button"
                              onClick={() => handleToggleDuplicateCleared(c.id, true)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black font-urdu flex items-center gap-1 transition shadow-2xs whitespace-nowrap cursor-pointer"
                              title="یہ درست علیحدہ پرچی ہے، ڈپلیکیٹ وارننگ ختم کریں"
                            >
                              <span>✓ کلیئر کریں</span>
                            </button>
                          )}
                          {isClearedDuplicate && (
                            <button
                              type="button"
                              onClick={() => handleToggleDuplicateCleared(c.id, false)}
                              className="px-1.5 py-0.5 text-slate-400 hover:text-rose-600 rounded text-[9px] font-urdu transition whitespace-nowrap cursor-pointer"
                              title="دوبارہ ڈپلیکیٹ وارننگ لگائیں"
                            >
                              دوبارہ وارننگ
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSlip(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                            title="View Slip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingSlip(c);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                            title="Edit Slip"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCollection(c.id, c.receipt_no)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Slip"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {collections.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      No collection slips found for {formatDate(selectedDate)}.
                    </td>
                  </tr>
                )}
              </tbody>

              {collections.length > 0 && (
                <tfoot className="print:table-row-group">
                  <tr className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={6} className="py-2 px-2 print:py-1.5 print:px-2 uppercase text-slate-800 font-urdu whitespace-nowrap">
                      کل میزان (Daily Total):
                    </td>
                    <td className="py-2 px-2 print:py-1.5 print:px-1.5 text-right font-mono text-slate-700 whitespace-nowrap">{totalGross.toFixed(1)}</td>
                    <td className="py-2 px-2 print:py-1.5 print:px-1.5 text-right font-mono text-rose-600 whitespace-nowrap">-{totalTare.toFixed(1)}</td>
                    <td className="py-2 px-2 print:py-1.5 print:px-1.5 text-right font-mono text-amber-700 print:text-slate-900 font-black whitespace-nowrap">{totalCharbi.toFixed(1)}</td>
                    <td className="py-2 px-2 print:py-1.5 print:px-1.5 text-right font-mono text-slate-900 font-black whitespace-nowrap">{totalKachara.toFixed(1)}</td>
                    <td className="py-2 px-2 print:py-1.5 print:px-1.5 text-right font-mono text-blue-700 print:text-slate-900 font-black whitespace-nowrap">{totalNet.toFixed(1)}</td>
                    <td className="py-2 px-2 print:py-1.5 print:px-1.5 text-right font-mono text-slate-500 whitespace-nowrap">—</td>
                    <td className="py-2 px-2 print:py-1.5 print:px-1.5 text-right font-mono text-amber-700 print:text-slate-900 font-black whitespace-nowrap">{totalAmount.toLocaleString()}</td>
                    <td className="py-2 px-2 no-print"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <CollectionDetailModal
        collection={selectedSlip}
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />

      <EditCollectionModal
        isOpen={isEditModalOpen}
        collection={editingSlip}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSlip(null);
        }}
        onSaved={fetchDailyData}
      />
    </div>
  );
};
