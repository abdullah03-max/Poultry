// =============================================================================
// SHAN POULTRY PROTEIN - Collection Schedule Alerts Hook
// Monitors customer collection start & end times and notifies admin if missed
// =============================================================================

import { useState, useEffect } from 'react';
import { Customer, Collection } from '../types/database';
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

  // Load customers
  useEffect(() => {
    const loadCust = async () => {
      try {
        const list = await api.getCustomers();
        setCustomers(list.filter(c => c.status === 'active'));
      } catch (err) {
        console.warn('Could not load customers for schedule alerts:', err);
      }
    };
    loadCust();
  }, []);

  // Check schedule compliance every 60 seconds
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

      const newAlerts: ScheduleAlert[] = [];

      customers.forEach(cust => {
        // If already collected today, no alert needed
        if (collectedCustomerIds.has(cust.id)) return;

        // Only alert if the admin configured a collection time window for this customer
        if (!cust.collection_end_time) return;

        const startTime = cust.collection_start_time || '08:00';
        const endTime = cust.collection_end_time;

        // Format times for comparison (HH:mm:ss)
        const cleanEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

        // If current time has passed the customer's scheduled end time:
        if (currentPktTimeStr > cleanEndTime) {
          const alertId = `alert-${cust.id}-${todayPktDateStr}`;
          const alertItem: ScheduleAlert = {
            id: alertId,
            customer_id: cust.id,
            customer_name: cust.name,
            customer_phone: cust.phone,
            customer_area: cust.area,
            start_time: startTime.substring(0, 5),
            end_time: endTime.substring(0, 5),
            overdue_since: endTime.substring(0, 5),
            message: `No collection has been recorded from ${cust.name} within its scheduled collection time (${startTime.substring(0, 5)} – ${endTime.substring(0, 5)}).`,
            created_at: new Date(),
          };
          newAlerts.push(alertItem);
        }
      });

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
    const interval = setInterval(checkCompliance, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [customers, collections]);

  return { alerts, totalAlerts: alerts.length };
}
