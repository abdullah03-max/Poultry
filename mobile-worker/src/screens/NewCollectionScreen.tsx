// =============================================================================
// SHAN POULTRY PROTEIN - Fast Mobile Collection Workflow Screen
// Daylight Clean B2B Corporate Edition
// Built for high-speed field weigh-in, touch signature, and offline sync
// =============================================================================

import React, { useState } from 'react';
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
  Image,
  StatusBar,
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
    try {
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
    } catch (err: any) {
      Alert.alert('Camera Error', err.message);
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
      // Valid RFC4122 v4 UUID
      const clientUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

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
        worker_id: worker?.id && worker.id.length > 20 ? worker.id : null,
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Step 1: Customer Selection Bar */}
        <TouchableOpacity
          style={styles.customerSelector}
          onPress={() => setPickerModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
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
                  placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={tareWeight}
                onChangeText={setTareWeight}
              />
            </View>
          </View>
        </View>

        {/* Step 3: Live Slip Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>STEP 3: SLIP COMPUTATION</Text>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Total Net Weight</Text>
              <Text style={styles.summaryNetWeight}>{effectiveNetWeight.toFixed(1)} KG</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>Calculated Amount</Text>
              <Text style={styles.summaryAmount}>Rs. {totalAmount.toLocaleString()}</Text>
              <Text style={styles.summaryRate}>@ Rs. {customerRate}/KG</Text>
            </View>
          </View>
        </View>

        {/* Step 4: Verification & Attachments */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>STEP 4: SHOP SIGNATURE & PHOTO</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.verificationButton, signatureData && styles.buttonCompleted]}
              onPress={() => setSignatureModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.verificationButtonIcon}>{signatureData ? '✓' : '✍️'}</Text>
              <Text style={[styles.verificationButtonText, signatureData && styles.textCompleted]}>
                {signatureData ? 'Signature Captured' : 'Get Shop Signature'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.verificationButton, attachmentUri && styles.buttonCompleted]}
              onPress={handlePickPhoto}
              activeOpacity={0.7}
            >
              <Text style={styles.verificationButtonIcon}>{attachmentUri ? '✓' : '📷'}</Text>
              <Text style={[styles.verificationButtonText, attachmentUri && styles.textCompleted]}>
                {attachmentUri ? 'Photo Attached' : 'Capture Scale Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {attachmentUri && (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: attachmentUri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => setAttachmentUri(null)}
              >
                <Text style={styles.removePhotoText}>Remove Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notes field */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.smallLabel}>Optional Notes / Special Remarks</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Offal dampness, extra crates, paid on spot..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Step 5: Save & Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, saving && { opacity: 0.7 }]}
          onPress={handleSaveCollection}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>CONFIRM & SAVE SLIP</Text>
              <Text style={styles.submitButtonSub}>Saves locally and syncs to cloud</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Picker Modal */}
      <CustomerPickerModal
        visible={pickerModalVisible}
        onClose={() => setPickerModalVisible(false)}
        onSelectCustomer={customer => {
          setSelectedCustomer(customer);
          setPickerModalVisible(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      />

      {/* Signature Pad Modal */}
      <SignaturePadModal
        visible={signatureModalVisible}
        onClose={() => setSignatureModalVisible(false)}
        onSaveSignature={sig => {
          setSignatureData(sig);
          setSignatureModalVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
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
  customerSelector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  stepBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedCustomerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  placeholderCustomer: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#2563EB',
    fontWeight: '700',
    paddingLeft: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryUrdu: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  weightInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    textAlign: 'center',
  },
  grossTareRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  grossTareItem: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  smallInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryNetWeight: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2563EB',
    fontFamily: 'monospace',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#D97706',
    fontFamily: 'monospace',
  },
  summaryRate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  verificationButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  verificationButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  verificationButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  textCompleted: {
    color: '#059669',
  },
  photoPreviewWrapper: {
    marginTop: 12,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  removePhotoButton: {
    marginTop: 6,
  },
  removePhotoText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  submitButtonSub: {
    color: '#BFDBFE',
    fontSize: 11,
    marginTop: 2,
  },
});
