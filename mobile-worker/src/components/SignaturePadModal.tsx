// =============================================================================
// SHAN POULTRY PROTEIN - Touch Signature Pad Modal
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Touch Signature</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
              <Path key={index} d={d} stroke="#0f172a" strokeWidth={3} fill="none" />
            ))}
            {currentPath ? (
              <Path d={currentPath} stroke="#0f172a" strokeWidth={3} fill="none" />
            ) : null}
          </Svg>

          {paths.length === 0 && !currentPath && (
            <Text style={styles.placeholderText}>Sign here with finger</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Confirm Signature</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
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
  instructions: {
    color: '#94a3b8',
    fontSize: 13,
    marginVertical: 12,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#38bdf8',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#090d16',
    fontSize: 14,
    fontWeight: '800',
  },
});
