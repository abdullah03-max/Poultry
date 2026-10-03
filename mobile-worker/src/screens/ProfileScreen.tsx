// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Profile & Offline Queue Sync Manager
// Daylight Clean B2B Corporate Edition
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { offlineQueue } from '../services/offlineQueue';
import { OfflineQueueItem } from '../types';

export const ProfileScreen: React.FC = () => {
  const { worker, logout } = useAuth();
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);

  const loadQueue = async () => {
    const q = await offlineQueue.getQueue();
    setQueue(q);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleSyncAll = async () => {
    if (queue.length === 0) {
      Alert.alert('Queue Empty', 'All collection slips are already synchronized with Supabase.');
      return;
    }

    try {
      setSyncing(true);
      const res = await offlineQueue.syncAll();
      await loadQueue();
      Alert.alert(
        'Sync Complete',
        `Successfully synced ${res.synced} slips. (${res.failed} failed/retry)`
      );
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Failed to sync offline items.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Worker Profile & Sync</Text>
          <Text style={styles.subtitle}>Field operations & local offline data manager</Text>
        </View>

        {/* Worker Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {worker?.full_name ? worker.full_name.substring(0, 2).toUpperCase() : 'CO'}
            </Text>
          </View>
          <Text style={styles.name}>{worker?.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{worker?.role?.toUpperCase()} • ACTIVE</Text>
          </View>
          <Text style={styles.phone}>{worker?.phone || '+92 300 0000002'}</Text>
        </View>

        {/* Offline Queue Section */}
        <View style={styles.card}>
          <View style={styles.queueHeader}>
            <Text style={styles.cardTitle}>OFFLINE PENDING QUEUE</Text>
            <View style={[styles.queueBadge, queue.length > 0 ? styles.queueBadgeWarning : styles.queueBadgeSuccess]}>
              <Text style={[styles.queueBadgeText, queue.length > 0 ? styles.queueBadgeTextWarning : styles.queueBadgeTextSuccess]}>
                {queue.length} PENDING
              </Text>
            </View>
          </View>

          <Text style={styles.queueDescription}>
            Slips saved while network was poor or offline. Tap sync when connected to 4G/WiFi.
          </Text>

          {queue.map(item => (
            <View key={item.id} style={styles.queueItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueCustomer}>{item.customer_name}</Text>
                <Text style={styles.queueMeta}>
                  {item.customer_code} • {item.payload.total_net_weight} KG (Rs. {item.payload.total_amount})
                </Text>
              </View>
              <Text style={styles.queueStatus}>Offline</Text>
            </View>
          ))}

          {queue.length === 0 && (
            <View style={styles.emptyQueue}>
              <Text style={styles.emptyQueueText}>✓ All collections are fully synchronized to cloud.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.syncButton, syncing ? styles.syncButtonDisabled : null]}
            onPress={handleSyncAll}
            disabled={syncing}
            activeOpacity={0.85}
          >
            {syncing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.syncButtonText}>SYNC ALL OFFLINE SLIPS NOW 🔄</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* System Settings & Logout */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SYSTEM CONFIGURATION</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company:</Text>
            <Text style={styles.infoValue}>SHAN POULTRY PROTEIN</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timezone:</Text>
            <Text style={styles.infoValue}>Asia/Karachi (PKT)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight Unit:</Text>
            <Text style={styles.infoValue}>KG (Kilograms)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Worker Edit Window:</Text>
            <Text style={styles.infoValue}>2 Hours</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
            <Text style={styles.logoutButtonText}>Sign Out from Device</Text>
          </TouchableOpacity>
        </View>
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
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    marginBottom: 6,
  },
  roleText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  phone: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  queueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  queueBadgeWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  queueBadgeSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  queueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  queueBadgeTextWarning: {
    color: '#B45309',
  },
  queueBadgeTextSuccess: {
    color: '#059669',
  },
  queueDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  queueCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  queueMeta: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  queueStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  emptyQueue: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyQueueText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  syncButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
