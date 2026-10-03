// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Home Dashboard
// Daylight Clean B2B Corporate Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { offlineQueue } from '../services/offlineQueue';
import { OfflineQueueItem, MobileCollection } from '../types';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { worker } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [pendingQueue, setPendingQueue] = useState<OfflineQueueItem[]>([]);
  const [todaySlips, setTodaySlips] = useState<MobileCollection[]>([
    {
      id: 'mock-1',
      receipt_no: 'SPP-202610-00101',
      client_uuid: 'uuid-1',
      customer_id: 'c1',
      worker_id: worker?.id || 'w1',
      collection_date: new Date().toISOString().split('T')[0],
      collection_time: '08:30:00',
      gross_weight: 82.5,
      tare_weight: 2.5,
      total_net_weight: 80.0,
      rate_per_kg: 45.0,
      total_amount: 3600.0,
      status: 'submitted',
      customer: {
        id: 'c1',
        customer_code: 'CUST-001',
        name: 'Al-Rehman Chicken Center',
        contact_person: 'Haji Rehman',
        phone: '+92 300 1112233',
        alternate_phone: null,
        address: 'Main Market',
        area: 'Gaggoo Mandi',
        rate_per_kg: 45.0,
        status: 'active',
        notes: null,
      },
    },
    {
      id: 'mock-2',
      receipt_no: 'SPP-202610-00102',
      client_uuid: 'uuid-2',
      customer_id: 'c2',
      worker_id: worker?.id || 'w1',
      collection_date: new Date().toISOString().split('T')[0],
      collection_time: '09:15:00',
      gross_weight: 125.0,
      tare_weight: 5.0,
      total_net_weight: 120.0,
      rate_per_kg: 48.0,
      total_amount: 5760.0,
      status: 'submitted',
      customer: {
        id: 'c2',
        customer_code: 'CUST-002',
        name: 'Madina Poultry & Broilers',
        contact_person: 'Muhammad Tariq',
        phone: '+92 301 2223344',
        alternate_phone: null,
        address: 'College Road',
        area: 'Burewala',
        rate_per_kg: 48.0,
        status: 'active',
        notes: null,
      },
    },
  ]);

  const loadData = async () => {
    const queue = await offlineQueue.getQueue();
    setPendingQueue(queue);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const todayTotalWeight = todaySlips.reduce((acc, s) => acc + s.total_net_weight, 0);
  const todayTotalAmount = todaySlips.reduce((acc, s) => acc + s.total_amount, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* Worker Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.workerName}>{worker?.full_name}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FIELD ACTIVE</Text>
          </View>
        </View>

        {/* Offline Queue Alert Banner if items pending */}
        {pendingQueue.length > 0 && (
          <TouchableOpacity
            style={styles.offlineBanner}
            onPress={() => onNavigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.offlineBannerText}>
              ⚡ {pendingQueue.length} collection slip(s) pending offline sync. Tap to sync now.
            </Text>
          </TouchableOpacity>
        )}

        {/* KPI Counter Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Net Weight</Text>
            <Text style={styles.statValueBlue}>{todayTotalWeight.toFixed(1)} KG</Text>
            <Text style={styles.statSubtext}>{todaySlips.length} slips recorded</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Billed</Text>
            <Text style={styles.statValueAmber}>Rs. {todayTotalAmount.toLocaleString()}</Text>
            <Text style={styles.statSubtext}>{pendingQueue.length} pending sync</Text>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('NewCollection')}
          activeOpacity={0.85}
        >
          <View style={styles.actionButtonCircle}>
            <Text style={styles.actionButtonIcon}>＋</Text>
          </View>
          <View>
            <Text style={styles.actionButtonTitle}>RECORD NEW COLLECTION</Text>
            <Text style={styles.actionButtonSubtitle}>Tap to enter weights & shop signature</Text>
          </View>
        </TouchableOpacity>

        {/* Recent Slips Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Collections ({todaySlips.length})</Text>
          <TouchableOpacity onPress={() => onNavigate('MyCollections')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {todaySlips.map(s => (
          <View key={s.id} style={styles.slipCard}>
            <View style={styles.slipHeader}>
              <Text style={styles.slipReceipt}>{s.receipt_no}</Text>
              <Text style={styles.slipTime}>{s.collection_time.substring(0, 5)}</Text>
            </View>
            <Text style={styles.slipCustomer}>{s.customer?.name}</Text>
            <Text style={styles.slipArea}>{s.customer?.area}</Text>
            <View style={styles.slipFooter}>
              <Text style={styles.slipWeight}>{s.total_net_weight} KG</Text>
              <Text style={styles.slipAmount}>Rs. {s.total_amount.toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValueBlue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2563EB',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  statValueAmber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D97706',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionButtonIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: -2,
  },
  actionButtonTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionButtonSubtitle: {
    color: '#BFDBFE',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  slipCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  slipReceipt: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 13,
    color: '#2563EB',
  },
  slipTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  slipCustomer: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  slipArea: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  slipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  slipWeight: {
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 16,
    color: '#2563EB',
  },
  slipAmount: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 15,
    color: '#D97706',
  },
});
