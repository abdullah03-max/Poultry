// =============================================================================
// SHAN POULTRY PROTEIN - Admin Notification Bell Component
// Rings with audio chime & animated bell when new field collections arrive
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ExternalLink, Scale, User, Clock } from 'lucide-react';
import { Collection } from '../../types/database';
import { playNotificationChime } from '../../utils/audio';

export interface AdminNotification {
  id: string;
  receipt_no: string;
  customer_name: string;
  collector_name: string;
  net_weight: number;
  total_amount: number;
  timestamp: Date;
  read: boolean;
  collection: Collection;
}

interface NotificationBellProps {
  latestEvent?: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    collection?: Collection;
    timestamp: Date;
  } | null;
  onViewCollection?: (collection: Collection) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  latestEvent,
  onViewCollection,
}) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>(() => {
    try {
      const saved = localStorage.getItem('spp_admin_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
      }
    } catch {}
    return [];
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Handle incoming live collection event
  useEffect(() => {
    if (!latestEvent || latestEvent.type !== 'INSERT' || !latestEvent.collection) {
      return;
    }

    const col = latestEvent.collection;
    const newNotif: AdminNotification = {
      id: `notif-${col.id || Date.now()}`,
      receipt_no: col.receipt_no || 'New Slip',
      customer_name: col.customer?.name || 'Customer',
      collector_name: col.worker?.full_name || 'Field Collector',
      net_weight: col.total_net_weight || 0,
      total_amount: col.total_amount || 0,
      timestamp: new Date(),
      read: false,
      collection: col,
    };

    setNotifications(prev => {
      // Avoid duplicate notifications for same receipt
      if (prev.some(n => n.receipt_no === col.receipt_no)) {
        return prev;
      }
      const updated = [newNotif, ...prev].slice(0, 30);
      try {
        localStorage.setItem('spp_admin_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Play Ringing Audio & Animate Bell
    playNotificationChime();
    setIsRinging(true);
    const timer = setTimeout(() => setIsRinging(false), 2500);

    return () => clearTimeout(timer);
  }, [latestEvent]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      localStorage.setItem('spp_admin_notifications', JSON.stringify(updated));
    } catch {}
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem('spp_admin_notifications');
    } catch {}
  };

  const handleItemClick = (notif: AdminNotification) => {
    // Mark as read
    const updated = notifications.map(n => (n.id === notif.id ? { ...n, read: true } : n));
    setNotifications(updated);
    try {
      localStorage.setItem('spp_admin_notifications', JSON.stringify(updated));
    } catch {}

    setIsOpen(false);
    if (onViewCollection) {
      onViewCollection(notif.collection);
    }
  };

  const formatRelativeTime = (date: Date) => {
    const diffSec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            // Can leave unread until explicitly viewed or marked
          }
        }}
        className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center ${
          isRinging
            ? 'bg-amber-100 border-amber-400 text-amber-700 animate-bounce shadow-md shadow-amber-300/40'
            : unreadCount > 0
            ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        title="Collection Notifications"
      >
        <Bell className={`w-4 h-4 ${isRinging ? 'animate-wiggle' : ''}`} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-black shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-scaleUp">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300 stroke-1" />
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ${
                    !n.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="mt-1">
                    <span
                      className={`block w-2 h-2 rounded-full ${
                        !n.read ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-300'
                      }`}
                    />
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-blue-700">
                        {n.receipt_no}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 truncate">
                      {n.customer_name}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1 truncate max-w-[130px]">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {n.collector_name}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {n.net_weight} KG &bull; Rs. {n.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
