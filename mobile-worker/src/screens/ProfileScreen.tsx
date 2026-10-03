// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Profile & Offline Queue Sync Manager
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
          <Text style={styles.role}>{worker?.role?.toUpperCase()} • ACTIVE</Text>
          <Text style={styles.phone}>{worker?.phone || '+92 300 0000002'}</Text>
        </View>

        {/* Offline Queue Section */}
        <View style={styles.card}>
          <View style={styles.queueHeader}>
            <Text style={styles.cardTitle}>OFFLINE PENDING QUEUE</Text>
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>{queue.length} PENDING</Text>
            </View>
          </View>

          <Text style={styles.queueDescription}>
            Slips saved while network was poor or offline. Tap sync when connected to 4G/WiFi.
          </Text>

          {queue.map(item => (
            <View key={item.id} style={styles.queueItem}>
              <View>
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
              <Text style={styles.emptyQueueText}>✓ All collections are fully synchronized.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.syncButton, syncing ? styles.syncButtonDisabled : null]}
            onPress={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#090d16" />
            ) : (
              <Text style={styles.syncButtonText}>SYNC ALL OFFLINE SLIPS NOW 🔄</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* System Settings & Logout */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SYSTEM INFO</Text>
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

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Sign Out from Mobile Device</Text>
          </TouchableOpacity>
        </View>
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
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#090d16',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  role: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  phone: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  queueBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  queueBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
  },
  queueDescription: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 14,
  },
  queueItem: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  queueCustomer: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  queueMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  queueStatus: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyQueue: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyQueueText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  syncButtonDisabled: {
    backgroundColor: '#334155',
  },
  syncButtonText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
