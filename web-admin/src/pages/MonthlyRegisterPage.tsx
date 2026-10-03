// =============================================================================
// SHAN POULTRY PROTEIN - Monthly Register View (Digital Handwritten Register)
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

export const MonthlyRegisterPage: React.FC = () => {
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
  }, [selectedYear, selectedMonthIndex]);

  const handleCellClick = (customer: any, day: number, _weight: number | null) => {
    const dateStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setModalCustomer(customer.id);
    setModalDate(dateStr);
    setNewSlipModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl no-print">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Digitized Monthly Weight Register
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Replaces the physical register sheet. Displays each customer against days 1 to {registerData.daysInMonth}.
          </p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-3">
          <select
            value={selectedMonthIndex}
            onChange={e => setSelectedMonthIndex(parseInt(e.target.value, 10))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={fetchRegister}
            title="Refresh Register"
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges for the Selected Month */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Month Net Weight</p>
            <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              {formatWeight(registerData.grandTotalWeight)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Month Net Amount</p>
            <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
              {formatCurrency(registerData.grandTotalAmount)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Suppliers</p>
            <p className="text-lg font-black text-white font-mono mt-0.5">
              {registerData.rows.length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Empty Day Indicator</p>
            <p className="text-lg font-black text-purple-300 font-mono mt-0.5">
              "{settings?.monthly_register_empty_symbol || 'X'}"
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm font-medium">Reconciling {MONTH_NAMES[selectedMonthIndex]} {selectedYear} register records...</p>
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
