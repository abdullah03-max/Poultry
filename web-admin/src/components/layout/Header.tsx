import React, { useState, useEffect } from 'react';
import { Clock, Plus, Printer, Menu, Download } from 'lucide-react';
import { triggerPrint } from '../../utils/exportUtils';
import { NotificationBell } from './NotificationBell';
import { Collection } from '../../types/database';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface HeaderProps {
  title: string;
  subtitle?: string;
  realtimeActive?: boolean;
  collections?: Collection[];
  onOpenNewCollection?: () => void;
  showPrint?: boolean;
  latestEvent?: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    collection?: Collection;
    timestamp: Date;
  } | null;
  onViewCollection?: (collection: Collection) => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  realtimeActive = false,
  collections = [],
  onOpenNewCollection,
  showPrint = false,
  latestEvent,
  onViewCollection,
  onToggleMobileSidebar,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const { isInstalled, triggerInstall } = usePWAInstall();

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
    <header className="h-16 sm:h-20 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 no-print">
      {/* Title & Hamburger Menu */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="hidden md:block text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Karachi Clock (hidden on smaller screens) */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono font-medium">{currentTime}</span>
        </div>

        {/* Notification Bell with Chime Sound */}
        <NotificationBell
          latestEvent={latestEvent}
          onViewCollection={onViewCollection}
          collections={collections}
        />

        {/* Install Desktop App (PWA) Button */}
        {!isInstalled && (
          <button
            onClick={triggerInstall}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-sm transition"
            title="Install Shan Poultry as a Windows Desktop App"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Install App</span>
          </button>
        )}

        {/* Print Button (hidden on mobile, print is desktop oriented) */}
        {showPrint && (
          <button
            onClick={triggerPrint}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        )}

        {/* Action Button: New Collection */}
        {onOpenNewCollection && (
          <button
            onClick={onOpenNewCollection}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Collection</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
      </div>
    </header>
  );
};
