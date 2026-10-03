// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Customers Directory Screen
// Daylight Clean B2B Corporate Edition
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Customer } from '../types';

const sampleCustomers: Customer[] = [
  { id: 'c1', customer_code: 'CUST-001', name: 'Al-Rehman Chicken Center', contact_person: 'Haji Rehman', phone: '+92 300 1112233', alternate_phone: null, address: 'Main Market, Shop #12', area: 'Gaggoo Mandi', rate_per_kg: 45, status: 'active', notes: null },
  { id: 'c2', customer_code: 'CUST-002', name: 'Madina Poultry & Broilers', contact_person: 'Muhammad Tariq', phone: '+92 301 2223344', alternate_phone: null, address: 'College Road', area: 'Burewala', rate_per_kg: 48, status: 'active', notes: null },
  { id: 'c3', customer_code: 'CUST-003', name: 'Bilal Meat & Broiler Point', contact_person: 'Bilal Ahmed', phone: '+92 302 3334455', alternate_phone: null, address: 'Railway Road', area: 'Vehari', rate_per_kg: 42, status: 'active', notes: null },
  { id: 'c4', customer_code: 'CUST-004', name: 'Subhan Poultry Dressing', contact_person: 'Subhan Ali', phone: '+92 303 4445566', alternate_phone: null, address: 'Grain Market Gate 2', area: 'Chichawatni', rate_per_kg: 46.5, status: 'active', notes: null },
  { id: 'c5', customer_code: 'CUST-005', name: 'Ittehad Broiler Wholesale', contact_person: 'Malik Ittehad', phone: '+92 304 5556677', alternate_phone: null, address: 'Katchery Chowk', area: 'Sahiwal', rate_per_kg: 50, status: 'active', notes: null },
];

export const CustomersScreen: React.FC = () => {
  const [query, setQuery] = useState<string>('');

  const filtered = sampleCustomers.filter(
    c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.area.toLowerCase().includes(query.toLowerCase())
  );

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Customer Directory</Text>
        <Text style={styles.subtitle}>Direct phone & location contacts for assigned shops</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer, area, or phone..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.customer_code}</Text>
                <Text style={styles.name}>{item.name}</Text>
                {item.contact_person && (
                  <Text style={styles.contact}>Contact: {item.contact_person}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(item.phone)}
                activeOpacity={0.7}
              >
                <Text style={styles.callButtonText}>📞 Call</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.details}>
              <Text style={styles.detailText}>📍 {item.area} — {item.address || 'Standard Location'}</Text>
              <Text style={styles.rateText}>Rate: Rs. {item.rate_per_kg} / KG</Text>
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
  searchBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  code: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 12,
    color: '#2563EB',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  contact: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  callButtonText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
  },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  rateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    fontFamily: 'monospace',
  },
});
