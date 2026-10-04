import React, { useState, useEffect } from 'react';
import { Radio, Clock, Plus, Printer } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { triggerPrint } from '../../utils/exportUtils';
import { NotificationBell } from './NotificationBell';
import { Collection } from '../../types/database';

interface HeaderProps {
  title: string;
  subtitle?: string;
  realtimeActive?: boolean;
  onOpenNewCollection?: () => void;
  showPrint?: boolean;
  latestEvent?: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    collection?: Collection;
    timestamp: Date;
  } | null;
  onViewCollection?: (collection: Collection) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  realtimeActive = false,
  onOpenNewCollection,
  showPrint = false,
  latestEvent,
  onViewCollection,
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
    <header className="h-20 bg-white/95 backdrop-blur border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 no-print">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Realtime Status Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            realtimeActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isSupabaseConfigured()
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
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
          <span>{realtimeActive ? 'Supabase Live' : 'Database Ready'}</span>
        </div>

        {/* Karachi Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono font-medium">{currentTime}</span>
        </div>

        {/* Notification Bell with Chime Sound */}
        <NotificationBell latestEvent={latestEvent} onViewCollection={onViewCollection} />

        {/* Print Button */}
        {showPrint && (
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        )}

        {/* Action Button */}
        {onOpenNewCollection && (
          <button
            onClick={onOpenNewCollection}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
          </button>
        )}
      </div>
    </header>
  );
};
