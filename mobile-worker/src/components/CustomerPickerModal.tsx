// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Customer Picker Modal
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
} from 'react-native';
import { Customer } from '../types';

interface CustomerPickerModalProps {
  visible: boolean;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

export const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({
  visible,
  customers,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState<string>('');

  const filtered = customers.filter(
    c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query) ||
      c.area.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Select Customer / Shop</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by shop name, code, phone, or area..."
            placeholderTextColor="#64748b"
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.customerItem}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.codeText}>{item.customer_code}</Text>
                <Text style={styles.rateText}>Rate: Rs. {item.rate_per_kg} / KG</Text>
              </View>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.areaText}>
                {item.area} {item.address ? `• ${item.address}` : ''}
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
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  searchInput: {
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  customerItem: {
    backgroundColor: '#111827',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  codeText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  rateText: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 12,
  },
  nameText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  areaText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 4,
  },
  phoneText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});
