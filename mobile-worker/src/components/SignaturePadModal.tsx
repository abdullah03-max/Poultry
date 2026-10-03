// =============================================================================
// SHAN POULTRY PROTEIN - Touch Signature Pad Modal
// Daylight Clean B2B Corporate Edition
// Captures customer / shop representative signature on mobile touch screens
// =============================================================================

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  PanResponder,
  StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SignaturePadModalProps {
  visible: boolean;
  onSave: (signatureData: string) => void;
  onClose: () => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  visible,
  onSave,
  onClose,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [paths, setPaths] = useState<string[]>([]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M${locationX},${locationY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths((prev) => [...prev, currentPath]);
        setCurrentPath('');
      }
    },
  });

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleConfirm = () => {
    // Generate an SVG path data representation
    const fullPath = [...paths, currentPath].filter(Boolean).join(' ');
    if (!fullPath) {
      alert('Please draw a signature before confirming.');
      return;
    }
    // Return SVG signature string representation
    onSave(fullPath);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Touch Signature</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instructions}>
          Please ask the shop owner / representative to sign inside the box below:
        </Text>

        {/* Canvas Area */}
        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg style={styles.svg}>
            {paths.map((d, index) => (
              <Path key={index} d={d} stroke="#0F172A" strokeWidth={3} fill="none" />
            ))}
            {currentPath ? (
              <Path d={currentPath} stroke="#0F172A" strokeWidth={3} fill="none" />
            ) : null}
          </Svg>

          {paths.length === 0 && !currentPath && (
            <View style={styles.placeholderContainer} pointerEvents="none">
              <Text style={styles.placeholderIcon}>✍️</Text>
              <Text style={styles.placeholderText}>Sign here with finger</Text>
              <View style={styles.signatureLine} />
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton} activeOpacity={0.7}>
            <Text style={styles.clearButtonText}>Clear Pad</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton} activeOpacity={0.85}>
            <Text style={styles.confirmButtonText}>Confirm Signature ✓</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
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
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  instructions: {
    color: '#64748B',
    fontSize: 13,
    marginVertical: 12,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  svg: {
    flex: 1,
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.4,
    marginBottom: 6,
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearButtonText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
