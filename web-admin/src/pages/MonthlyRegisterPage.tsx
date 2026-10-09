// =============================================================================
// SHAN POULTRY PROTEIN - Monthly Register View (Digital Handwritten Register)
// Daylight B2B Clean Palette Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MonthlyRegisterCustomerRow, BusinessSettings } from '../types/database';
import { MonthlyMatrixTable } from '../components/register/MonthlyMatrixTable';
import { formatWeight, formatCurrency } from '../utils/formatters';
import { Calendar, RefreshCw, Scale, DollarSign, Users, Wallet, TrendingUp, Loader2 } from 'lucide-react';
import { NewCollectionModal } from '../components/collections/NewCollectionModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface MonthlyRegisterPageProps {
  refreshTrigger?: number;
}

export const MonthlyRegisterPage: React.FC<MonthlyRegisterPageProps> = ({ refreshTrigger }) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(now.getMonth());
  const [loading, setLoading] = useState<boolean>(true);
  const [registerData, setRegisterData] = useState<{
    rows: MonthlyRegisterCustomerRow[];
    daysInMonth: number;
    dailyTotals: number[];
    grandTotalWeight: number;
    grandTotalAmount: number;
    totalCharbiWeight?: number;
    totalKacharaWeight?: number;
    totalCustomersAdvance?: number;
    totalRemainingAdvance?: number;
    activeSuppliersCount?: number;
  }>({
    rows: [],
    daysInMonth: 30,
    dailyTotals: [],
    grandTotalWeight: 0,
    grandTotalAmount: 0,
    totalCharbiWeight: 0,
    totalKacharaWeight: 0,
    totalCustomersAdvance: 0,
    totalRemainingAdvance: 0,
    activeSuppliersCount: 0,
  });
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Modal for adding a slip on clicked cell
  const [newSlipModalOpen, setNewSlipModalOpen] = useState<boolean>(false);
  const [modalCustomer, setModalCustomer] = useState<string | undefined>(undefined);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);

  const fetchRegister = async () => {
    try {
      setLoading(true);
      const [data, s] = await Promise.all([
        api.getMonthlyRegisterData(selectedYear, selectedMonthIndex),
        api.getSettings(),
      ]);
      setRegisterData(data);
      setSettings(s);
    } catch (err) {
      console.error('Error fetching monthly register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegister();

    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel(`monthly-register-rt-${selectedYear}-${selectedMonthIndex}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
          fetchRegister();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          fetchRegister();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedYear, selectedMonthIndex, refreshTrigger]);

  const handleCellClick = (customer: any, day: number, _weight: number | null) => {
    const dateStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setModalCustomer(customer.id);
    setModalDate(dateStr);
    setNewSlipModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-card no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Digitized Monthly Weight Register
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Replaces the physical register sheet. Displays each customer against days 1 to {registerData.daysInMonth}.
            </p>
          </div>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={selectedMonthIndex}
            onChange={e => setSelectedMonthIndex(parseInt(e.target.value, 10))}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={fetchRegister}
            title="Refresh Register"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges for the Selected Month */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 no-print">
        {/* Card 1: Month Net Weight */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ماہانہ کل وزن</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-blue-700 font-mono tracking-tight">
              {formatWeight(registerData.grandTotalWeight)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              چربی: {formatWeight(registerData.totalCharbiWeight || 0)} • کچرا: {formatWeight(registerData.totalKacharaWeight || 0)}
            </p>
          </div>
        </div>

        {/* Card 2: Month Net Amount */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">ماہانہ کل ویسٹ بل</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-amber-700 font-mono tracking-tight">
              {formatCurrency(registerData.grandTotalAmount)}
            </p>
            <p className="text-[10px] text-amber-600 font-medium truncate mt-0.5">
              اس مہینے کا کل واجب الادا مال
            </p>
          </div>
        </div>

        {/* Card 3: Total Advance of All Customers */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">تمام گاہکوں کا کل ایڈوانس</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-emerald-700 font-mono tracking-tight">
              {formatCurrency(registerData.totalCustomersAdvance || 0)}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium truncate mt-0.5">
              کل پیشگی ادا شدہ رقم
            </p>
          </div>
        </div>

        {/* Card 4: Total Remaining Advance Balance */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">باقی ایڈوانس بیلنس</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className={`text-xl font-black font-mono tracking-tight ${
              (registerData.totalRemainingAdvance || 0) <= 0 ? 'text-rose-700' : 'text-indigo-700'
            }`}>
              {formatCurrency(registerData.totalRemainingAdvance || 0)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
              ویسٹ کٹوتی کے بعد باقی ریمائنڈر
            </p>
          </div>
        </div>

        {/* Card 5: Total Suppliers & Active Shops */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">کل سپلائرز و دکانیں</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-mono tracking-tight">
              <span className="text-purple-700">{registerData.activeSuppliersCount || 0}</span>
              <span className="text-sm text-slate-400 font-normal"> / {registerData.rows.length}</span>
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              فعال سپلائرز جنہوں نے مال دیا
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-card text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600">Reconciling {MONTH_NAMES[selectedMonthIndex]} {selectedYear} register records...</p>
        </div>
      ) : (
        <MonthlyMatrixTable
          year={selectedYear}
          monthIndex={selectedMonthIndex}
          monthName={MONTH_NAMES[selectedMonthIndex]}
          daysInMonth={registerData.daysInMonth}
          rows={registerData.rows}
          dailyTotals={registerData.dailyTotals}
          grandTotalWeight={registerData.grandTotalWeight}
          grandTotalAmount={registerData.grandTotalAmount}
          emptySymbol={settings?.monthly_register_empty_symbol || 'X'}
          onCellClick={handleCellClick}
        />
      )}

      {/* Quick Collection Entry Modal on Cell Click */}
      <NewCollectionModal
        isOpen={newSlipModalOpen}
        onClose={() => setNewSlipModalOpen(false)}
        initialCustomerId={modalCustomer}
        initialDate={modalDate}
        onCreated={() => {
          fetchRegister();
        }}
      />
    </div>
  );
};
