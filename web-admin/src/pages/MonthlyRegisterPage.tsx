// =============================================================================
// SHAN POULTRY PROTEIN - Monthly Register View (Digital Handwritten Register)
// Daylight B2B Clean Palette Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MonthlyRegisterCustomerRow, BusinessSettings } from '../types/database';
import { MonthlyMatrixTable } from '../components/register/MonthlyMatrixTable';
import { formatWeight, formatCurrency } from '../utils/formatters';
import { Calendar, RefreshCw, Scale, DollarSign, Users, Award, Loader2 } from 'lucide-react';
import { NewCollectionModal } from '../components/collections/NewCollectionModal';

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
  }>({
    rows: [],
    daysInMonth: 30,
    dailyTotals: [],
    grandTotalWeight: 0,
    grandTotalAmount: 0,
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Month Net Weight</p>
            <p className="text-xl font-black text-blue-700 font-mono mt-0.5">
              {formatWeight(registerData.grandTotalWeight)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Month Net Amount</p>
            <p className="text-xl font-black text-amber-700 font-mono mt-0.5">
              {formatCurrency(registerData.grandTotalAmount)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Total Suppliers</p>
            <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {registerData.rows.length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Empty Day Symbol</p>
            <p className="text-xl font-black text-purple-700 font-mono mt-0.5">
              "{settings?.monthly_register_empty_symbol || 'X'}"
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
