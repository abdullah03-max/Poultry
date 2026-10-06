// =============================================================================
// SHAN POULTRY PROTEIN - Collection Schedule Alerts Hook
// Monitors common collection start & end times and notifies admin if missed
// =============================================================================

import { useState, useEffect } from 'react';
import { Customer, Collection, BusinessSettings } from '../types/database';
import { api } from '../services/api';
import { playNotificationChime } from '../utils/audio';

export interface ScheduleAlert {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_area: string;
  start_time: string;
  end_time: string;
  overdue_since: string;
  message: string;
  created_at: Date;
}

export function useCollectionScheduleAlerts(collections: Collection[]) {
  const [alerts, setAlerts] = useState<ScheduleAlert[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Load customers & settings
  useEffect(() => {
    const loadData = async () => {
      try {
        const [custList, sett] = await Promise.all([
          api.getCustomers(),
          api.getSettings(),
        ]);
        setCustomers(custList.filter(c => c.status === 'active' && !c.is_deleted));
        setSettings(sett);
      } catch (err) {
        console.warn('Could not load data for schedule alerts:', err);
      }
    };
    loadData();
  }, []);

  // Check schedule compliance every 30 seconds
  useEffect(() => {
    if (customers.length === 0) return;

    const checkCompliance = () => {
      const now = new Date();
      // Current Pakistan Time formatted as HH:mm:ss
      const currentPktTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const todayPktDateStr = now.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Karachi',
      }); // YYYY-MM-DD

      // Get customer IDs that have collections recorded today
      const collectedCustomerIds = new Set(
        collections
          .filter(c => c.collection_date === todayPktDateStr)
          .map(c => c.customer_id)
      );

      // Common schedule for all customers (defaults to 08:00 AM - 02:00 PM)
      const commonStartTime = settings?.common_collection_start_time || '08:00';
      const commonEndTime = settings?.common_collection_end_time || '14:00';

      // Format end time for comparison (HH:mm:ss)
      const cleanEndTime = commonEndTime.length === 5 ? `${commonEndTime}:00` : commonEndTime;

      const newAlerts: ScheduleAlert[] = [];

      // Only alert after defined End Time has passed
      if (currentPktTimeStr > cleanEndTime) {
        customers.forEach(cust => {
          // If already collected today, no alert needed
          if (collectedCustomerIds.has(cust.id)) return;

          const alertId = `alert-${cust.id}-${todayPktDateStr}`;
          const alertItem: ScheduleAlert = {
            id: alertId,
            customer_id: cust.id,
            customer_name: cust.name,
            customer_phone: cust.phone,
            customer_area: cust.area,
            start_time: commonStartTime.substring(0, 5),
            end_time: commonEndTime.substring(0, 5),
            overdue_since: commonEndTime.substring(0, 5),
            message: `No collection has been recorded for ${cust.name} within today's scheduled collection time.`,
            created_at: new Date(),
          };
          newAlerts.push(alertItem);
        });
      }

      setAlerts(prev => {
        // Only trigger audio chime if a brand new alert appeared
        if (newAlerts.length > prev.length) {
          try {
            playNotificationChime();
          } catch {}
        }
        return newAlerts;
      });
    };

    checkCompliance();
    const interval = setInterval(checkCompliance, 30000);
    return () => clearInterval(interval);
  }, [customers, collections, settings]);

  return { alerts, totalAlerts: alerts.length };
}
