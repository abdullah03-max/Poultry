import React, { useState, useEffect } from 'react';
import { Radio, Clock, Plus, Printer } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { triggerPrint } from '../../utils/exportUtils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  realtimeActive?: boolean;
  onOpenNewCollection?: () => void;
  showPrint?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  realtimeActive = false,
  onOpenNewCollection,
  showPrint = false,
}) => {
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

  return (
    <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-20 no-print">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Realtime Status Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            realtimeActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : isSupabaseConfigured()
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                realtimeActive ? 'bg-emerald-400' : 'bg-blue-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                realtimeActive ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            />
          </span>
          <Radio className="w-3.5 h-3.5" />
          <span>{realtimeActive ? 'Supabase Realtime Live' : 'Demo Sync Ready'}</span>
        </div>

        {/* Karachi Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-medium">{currentTime}</span>
        </div>

        {/* Print Button */}
        {showPrint && (
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        )}

        {/* Action Button */}
        {onOpenNewCollection && (
          <button
            onClick={onOpenNewCollection}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
          </button>
        )}
      </div>
    </header>
  );
};
