// =============================================================================
// SHAN POULTRY PROTEIN - Fast Mobile Collection Workflow Screen
// Built for high-speed field weigh-in, touch signature, and offline sync
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { Customer, WeightCategory, CollectionItemInput } from '../types';
import { CustomerPickerModal } from '../components/CustomerPickerModal';
import { SignaturePadModal } from '../components/SignaturePadModal';
import { offlineQueue } from '../services/offlineQueue';

const defaultCategories: WeightCategory[] = [
  { id: 'cat_1', code: 'cat_1', name: 'Weight Category 1', urdu_name: 'وزن کیٹیگری ۱', unit: 'KG', default_rate: 45, is_active: true, display_order: 1 },
  { id: 'cat_2', code: 'cat_2', name: 'Weight Category 2', urdu_name: 'وزن کیٹیگری ۲', unit: 'KG', default_rate: 40, is_active: true, display_order: 2 },
  { id: 'waste', code: 'waste', name: 'Waste Weight', urdu_name: 'فضلہ وزن', unit: 'KG', default_rate: 48, is_active: true, display_order: 3 },
  { id: 'fat', code: 'fat', name: 'Fat Weight', urdu_name: 'چربی وزن', unit: 'KG', default_rate: 55, is_active: true, display_order: 4 },
];

const mockCustomers: Customer[] = [
  { id: 'c1', customer_code: 'CUST-001', name: 'Al-Rehman Chicken Center', contact_person: 'Haji Rehman', phone: '+92 300 1112233', alternate_phone: null, address: 'Main Market, Shop #12', area: 'Gaggoo Mandi', rate_per_kg: 45, status: 'active', notes: null },
  { id: 'c2', customer_code: 'CUST-002', name: 'Madina Poultry & Broilers', contact_person: 'Muhammad Tariq', phone: '+92 301 2223344', alternate_phone: null, address: 'College Road', area: 'Burewala', rate_per_kg: 48, status: 'active', notes: null },
  { id: 'c3', customer_code: 'CUST-003', name: 'Bilal Meat & Broiler Point', contact_person: 'Bilal Ahmed', phone: '+92 302 3334455', alternate_phone: null, address: 'Railway Road', area: 'Vehari', rate_per_kg: 42, status: 'active', notes: null },
  { id: 'c4', customer_code: 'CUST-004', name: 'Subhan Poultry Dressing', contact_person: 'Subhan Ali', phone: '+92 303 4445566', alternate_phone: null, address: 'Grain Market', area: 'Chichawatni', rate_per_kg: 46.5, status: 'active', notes: null },
  { id: 'c5', customer_code: 'CUST-005', name: 'Ittehad Broiler Wholesale', contact_person: 'Malik Ittehad', phone: '+92 304 5556677', alternate_phone: null, address: 'Katchery Chowk', area: 'Sahiwal', rate_per_kg: 50, status: 'active', notes: null },
];

interface NewCollectionScreenProps {
  onSuccessReturn: () => void;
}

export const NewCollectionScreen: React.FC<NewCollectionScreenProps> = ({ onSuccessReturn }) => {
  const { worker } = useAuth();

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pickerModalVisible, setPickerModalVisible] = useState<boolean>(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState<boolean>(false);

  // Weights
  const [categoryWeights, setCategoryWeights] = useState<Record<string, string>>({
    cat_1: '',
    cat_2: '',
    waste: '',
    fat: '',
  });
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [tareWeight, setTareWeight] = useState<string>('0');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);

  // Computations
  const grossNum = parseFloat(grossWeight) || 0;
  const tareNum = parseFloat(tareWeight) || 0;
  const scaleNet = Math.max(0, grossNum - tareNum);

  const sumCategories = Object.values(categoryWeights).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );

  const effectiveNetWeight = scaleNet > 0 ? scaleNet : sumCategories;
  const customerRate = selectedCustomer?.rate_per_kg || 45;
  const totalAmount = Math.round(effectiveNetWeight * customerRate);

  const handleWeightChange = (key: string, val: string) => {
    setCategoryWeights(prev => ({ ...prev, [key]: val }));
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Camera permission is required to capture scale/receipt photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      setAttachmentUri(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSaveCollection = async () => {
    if (!selectedCustomer) {
      Alert.alert('Required', 'Please select a customer / shop first.');
      return;
    }

    if (effectiveNetWeight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight greater than 0 KG.');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const now = new Date();
      const clientUuid = `mobile-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const items: CollectionItemInput[] = defaultCategories
        .filter(c => parseFloat(categoryWeights[c.id]) > 0)
        .map(c => {
          const w = parseFloat(categoryWeights[c.id]);
          return {
            category_id: c.id,
            category_name: c.name,
            weight: w,
            rate: customerRate,
            amount: Math.round(w * customerRate),
          };
        });

      const payload = {
        client_uuid: clientUuid,
        customer_id: selectedCustomer.id,
        worker_id: worker?.id || 'w1',
        collection_date: now.toISOString().split('T')[0],
        collection_time: now.toTimeString().split(' ')[0],
        gross_weight: grossNum > 0 ? grossNum : effectiveNetWeight,
        tare_weight: tareNum,
        total_net_weight: effectiveNetWeight,
        rate_per_kg: customerRate,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        signature_base64: signatureData,
        attachment_uri: attachmentUri,
        items,
      };

      // Enqueue to offline queue with immediate attempt to sync
      const queueItem = await offlineQueue.enqueue(payload, selectedCustomer.name, selectedCustomer.customer_code);
      offlineQueue.syncItem(queueItem); // Fire in background

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Slip Saved!',
        `Collection recorded for ${selectedCustomer.name} (${effectiveNetWeight} KG = Rs. ${totalAmount.toLocaleString()})`,
        [
          {
            text: 'Next Collection',
            onPress: () => {
              // Reset state immediately for next entry without re-tapping
              setCategoryWeights({ cat_1: '', cat_2: '', waste: '', fat: '' });
              setGrossWeight('');
              setTareWeight('0');
              setSignatureData(null);
              setAttachmentUri(null);
              setNotes('');
              setSelectedCustomer(null);
            },
          },
          {
            text: 'Finish & View Home',
            onPress: onSuccessReturn,
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record collection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Step 1: Customer Selection Bar */}
        <TouchableOpacity
          style={styles.customerSelector}
          onPress={() => setPickerModalVisible(true)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.stepBadge}>STEP 1: SELECT SHOP</Text>
            {selectedCustomer ? (
              <>
                <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                <Text style={styles.selectedCustomerSub}>
                  {selectedCustomer.customer_code} • {selectedCustomer.area} • Rs. {selectedCustomer.rate_per_kg} / KG
                </Text>
              </>
            ) : (
              <Text style={styles.placeholderCustomer}>Tap here to select customer / shop 🔍</Text>
            )}
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>

        {/* Step 2: Weight Category Inputs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>STEP 2: ENTER WEIGHT (KG)</Text>

          <View style={styles.categoryGrid}>
            {defaultCategories.map(cat => (
              <View key={cat.id} style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>{cat.name}</Text>
                <Text style={styles.categoryUrdu}>{cat.urdu_name}</Text>
                <TextInput
                  style={styles.weightInput}
                  placeholder="0.0"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  value={categoryWeights[cat.id]}
                  onChangeText={v => handleWeightChange(cat.id, v)}
                />
              </View>
            ))}
          </View>

          {/* Scale Gross / Crate Tare Alternative */}
          <View style={styles.grossTareRow}>
            <View style={styles.grossTareItem}>
              <Text style={styles.smallLabel}>Scale Gross (KG)</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="Optional"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={grossWeight}
                onChangeText={setGrossWeight}
              />
            </View>
            <View style={styles.grossTareItem}>
              <Text style={styles.smallLabel}>Crate Tare (KG)</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={tareWeight}
                onChangeText={setTareWeight}
              />
            </View>
          </View>
        </View>

        {/* Step 3: Realtime Calculated Net Weight & Billing */}
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>TOTAL NET WEIGHT</Text>
            <Text style={styles.summaryWeight}>{effectiveNetWeight.toFixed(2)} KG</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryLabel}>ESTIMATED AMOUNT</Text>
            <Text style={styles.summaryAmount}>Rs. {totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Step 4: Signature & Attachments */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>STEP 3: VERIFICATION (OPTIONAL)</Text>

          <View style={styles.verificationRow}>
            {/* Signature Trigger */}
            <TouchableOpacity
              style={[styles.verificationButton, signatureData ? styles.verificationButtonSuccess : null]}
              onPress={() => setSignatureModalVisible(true)}
            >
              <Text style={styles.verificationIcon}>✍️</Text>
              <Text style={styles.verificationText}>
                {signatureData ? 'Signature Added ✓' : 'Customer Sign'}
              </Text>
            </TouchableOpacity>

            {/* Camera Photo Trigger */}
            <TouchableOpacity
              style={[styles.verificationButton, attachmentUri ? styles.verificationButtonSuccess : null]}
              onPress={handlePickPhoto}
            >
              <Text style={styles.verificationIcon}>📷</Text>
              <Text style={styles.verificationText}>
                {attachmentUri ? 'Photo Attached ✓' : 'Scale Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Optional Notes */}
          <TextInput
            style={styles.notesInput}
            placeholder="Add slip notes (e.g. good clean batch, special crate)..."
            placeholderTextColor="#64748b"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Step 5: Save Collection Button with Duplicate Lock */}
        <TouchableOpacity
          style={[styles.saveButton, saving || effectiveNetWeight <= 0 ? styles.saveButtonDisabled : null]}
          onPress={handleSaveCollection}
          disabled={saving || effectiveNetWeight <= 0}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#090d16" />
          ) : (
            <Text style={styles.saveButtonText}>SAVE & PREPARE NEXT SLIP 💾</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Picker Modal */}
      <CustomerPickerModal
        visible={pickerModalVisible}
        customers={mockCustomers}
        onSelect={c => {
          setSelectedCustomer(c);
          Haptics.selectionAsync();
        }}
        onClose={() => setPickerModalVisible(false)}
      />

      {/* Signature Pad Modal */}
      <SignaturePadModal
        visible={signatureModalVisible}
        onSave={sig => {
          setSignatureData(sig);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onClose={() => setSignatureModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  customerSelector: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  selectedCustomerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  placeholderCustomer: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38bdf8',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#10b981',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoryUrdu: {
    fontSize: 11,
    color: '#10b981',
    marginBottom: 8,
  },
  weightInput: {
    backgroundColor: '#090d16',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  grossTareRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  grossTareItem: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  smallInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#064e3b',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a7f3d0',
    letterSpacing: 0.5,
  },
  summaryWeight: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fef08a',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  verificationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  verificationButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  verificationButtonSuccess: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  verificationIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  verificationText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#1e293b',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#090d16',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
