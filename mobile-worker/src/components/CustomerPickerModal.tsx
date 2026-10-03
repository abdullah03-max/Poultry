// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Customer Picker Modal
// Daylight Clean B2B Corporate Edition
// Fast searching by Name, Customer ID, Phone, or Area
// =============================================================================

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Customer } from '../types';

const defaultCustomers: Customer[] = [
  { id: 'c1', customer_code: 'CUST-001', name: 'Al-Rehman Chicken Center', contact_person: 'Haji Rehman', phone: '+92 300 1112233', alternate_phone: null, address: 'Main Market, Shop #12', area: 'Gaggoo Mandi', rate_per_kg: 45, status: 'active', notes: null },
  { id: 'c2', customer_code: 'CUST-002', name: 'Madina Poultry & Broilers', contact_person: 'Muhammad Tariq', phone: '+92 301 2223344', alternate_phone: null, address: 'College Road', area: 'Burewala', rate_per_kg: 48, status: 'active', notes: null },
  { id: 'c3', customer_code: 'CUST-003', name: 'Bilal Meat & Broiler Point', contact_person: 'Bilal Ahmed', phone: '+92 302 3334455', alternate_phone: null, address: 'Railway Road', area: 'Vehari', rate_per_kg: 42, status: 'active', notes: null },
  { id: 'c4', customer_code: 'CUST-004', name: 'Subhan Poultry Dressing', contact_person: 'Subhan Ali', phone: '+92 303 4445566', alternate_phone: null, address: 'Grain Market Gate 2', area: 'Chichawatni', rate_per_kg: 46.5, status: 'active', notes: null },
  { id: 'c5', customer_code: 'CUST-005', name: 'Ittehad Broiler Wholesale', contact_person: 'Malik Ittehad', phone: '+92 304 5556677', alternate_phone: null, address: 'Katchery Chowk', area: 'Sahiwal', rate_per_kg: 50, status: 'active', notes: null },
];

interface CustomerPickerModalProps {
  visible: boolean;
  customers?: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  onSelect?: (customer: Customer) => void;
  onClose: () => void;
}

export const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({
  visible,
  customers = defaultCustomers,
  onSelectCustomer,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState<string>('');

  const customerList = customers && customers.length > 0 ? customers : defaultCustomers;

  const filtered = customerList.filter(
    c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.area.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (customer: Customer) => {
    if (onSelectCustomer) onSelectCustomer(customer);
    if (onSelect) onSelect(customer);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Select Customer / Shop</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by shop name, code, phone, or area..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        {/* Customer List */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.customerItem}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.codeText}>{item.customer_code}</Text>
                <Text style={styles.rateText}>Rate: Rs. {item.rate_per_kg} / KG</Text>
              </View>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.areaText}>
                📍 {item.area} {item.address ? `• ${item.address}` : ''}
              </Text>
              <Text style={styles.phoneText}>📞 {item.phone}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No customers matching "{query}"</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  customerItem: {
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 12,
    color: '#2563EB',
  },
  rateText: {
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 12,
    color: '#D97706',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  areaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
