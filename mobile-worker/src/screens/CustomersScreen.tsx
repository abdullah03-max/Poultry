// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Customers Directory Screen
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
      <View style={styles.header}>
        <Text style={styles.title}>Customer Directory</Text>
        <Text style={styles.subtitle}>Direct phone & location contacts for assigned shops</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer, area, or phone..."
          placeholderTextColor="#64748b"
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
              <View>
                <Text style={styles.code}>{item.customer_code}</Text>
                <Text style={styles.name}>{item.name}</Text>
                {item.contact_person && (
                  <Text style={styles.contact}>Contact: {item.contact_person}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(item.phone)}
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
    backgroundColor: '#090d16',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
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
  searchBox: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  searchInput: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  code: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  contact: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  callButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  details: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
  rateText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
});
