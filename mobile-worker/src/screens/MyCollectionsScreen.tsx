// =============================================================================
// SHAN POULTRY PROTEIN - Mobile My Collections History Screen
// Daylight Clean B2B Corporate Edition
// Shows worker's historical slips with 2-hour edit lock window
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MobileCollection } from '../types';

export const MyCollectionsScreen: React.FC = () => {
  const [slips] = useState<MobileCollection[]>([
    {
      id: 's1',
      receipt_no: 'SPP-202610-00101',
      client_uuid: 'u1',
      customer_id: 'c1',
      worker_id: 'w1',
      collection_date: '2026-10-03',
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
        rate_per_kg: 45,
        status: 'active',
        notes: null,
      },
    },
    {
      id: 's2',
      receipt_no: 'SPP-202610-00102',
      client_uuid: 'u2',
      customer_id: 'c2',
      worker_id: 'w1',
      collection_date: '2026-10-03',
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
        rate_per_kg: 48,
        status: 'active',
        notes: null,
      },
    },
    {
      id: 's3',
      receipt_no: 'SPP-202610-00094',
      client_uuid: 'u3',
      customer_id: 'c3',
      worker_id: 'w1',
      collection_date: '2026-10-02',
      collection_time: '10:00:00',
      gross_weight: 95.0,
      tare_weight: 3.0,
      total_net_weight: 92.0,
      rate_per_kg: 42.0,
      total_amount: 3864.0,
      status: 'verified',
      customer: {
        id: 'c3',
        customer_code: 'CUST-003',
        name: 'Bilal Meat & Broiler Point',
        contact_person: 'Bilal Ahmed',
        phone: '+92 302 3334455',
        alternate_phone: null,
        address: 'Railway Road',
        area: 'Vehari',
        rate_per_kg: 42,
        status: 'active',
        notes: null,
      },
    },
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>My Collection Slips</Text>
        <Text style={styles.subtitle}>Slips recorded under your worker ID ({slips.length} total)</Text>
      </View>

      <FlatList
        data={slips}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.receiptNo}>{item.receipt_no}</Text>
              <View style={[
                styles.statusBadge,
                item.status === 'verified' ? styles.statusBadgeVerified : styles.statusBadgeSubmitted
              ]}>
                <Text style={[
                  styles.statusText,
                  item.status === 'verified' ? styles.statusTextVerified : styles.statusTextSubmitted
                ]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.customerName}>{item.customer?.name}</Text>
            <Text style={styles.areaText}>
              {item.customer?.area} • {item.collection_date} at {item.collection_time.substring(0, 5)}
            </Text>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.metricLabel}>NET WEIGHT</Text>
                <Text style={styles.metricWeight}>{item.total_net_weight} KG</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.metricLabel}>AMOUNT (PKR)</Text>
                <Text style={styles.metricAmount}>Rs. {item.total_amount.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
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
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  receiptNo: {
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#2563EB',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeSubmitted: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusBadgeVerified: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTextSubmitted: {
    color: '#2563EB',
  },
  statusTextVerified: {
    color: '#059669',
  },
  customerName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  areaText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
  },
  metricWeight: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2563EB',
    fontFamily: 'monospace',
  },
  metricAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#D97706',
    fontFamily: 'monospace',
  },
});
