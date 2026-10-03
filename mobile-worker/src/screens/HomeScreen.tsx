// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Home Dashboard
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
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
          >
            <Text style={styles.offlineBannerText}>
              ⚡ {pendingQueue.length} collection slip(s) pending offline sync. Tap to sync.
            </Text>
          </TouchableOpacity>
        )}

        {/* KPI Counter Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Net Weight</Text>
            <Text style={styles.statValueEmerald}>{todayTotalWeight.toFixed(1)} KG</Text>
            <Text style={styles.statSubtext}>{todaySlips.length} slips recorded</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Sync</Text>
            <Text style={styles.statValueAmber}>{pendingQueue.length}</Text>
            <Text style={styles.statSubtext}>Offline queue</Text>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('NewCollection')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonIcon}>＋</Text>
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
    backgroundColor: '#090d16',
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
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  workerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#fbbf24',
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
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValueEmerald: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
    fontFamily: 'monospace',
  },
  statValueAmber: {
    color: '#f59e0b',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4,
    fontFamily: 'monospace',
  },
  statSubtext: {
    color: '#64748b',
    fontSize: 11,
  },
  actionButton: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionButtonIcon: {
    fontSize: 32,
    fontWeight: '900',
    color: '#090d16',
  },
  actionButtonTitle: {
    color: '#090d16',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionButtonSubtitle: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  seeAllText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  slipCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slipReceipt: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 12,
  },
  slipTime: {
    color: '#64748b',
    fontSize: 11,
  },
  slipCustomer: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  slipArea: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  slipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  slipWeight: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  slipAmount: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});
