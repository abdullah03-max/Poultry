// =============================================================================
// SHAN POULTRY PROTEIN - Mobile Worker Login Screen
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [phoneOrEmail, setPhoneOrEmail] = useState<string>('03000000002');
  const [password, setPassword] = useState<string>('worker12345');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!phoneOrEmail || !password) {
      setErrorMsg('Please enter your phone number and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await login(phoneOrEmail, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Login failed. Please check credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>SP</Text>
        </View>

        <Text style={styles.title}>SHAN POULTRY PROTEIN</Text>
        <Text style={styles.subtitle}>Field Worker Mobile Portal</Text>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile Phone or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="0300 1234567"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
            value={phoneOrEmail}
            onChangeText={setPhoneOrEmail}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Worker Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#090d16" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In as Collector</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Authorized field collectors only. Offline entry supported.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#090d16',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#090d16',
    fontSize: 15,
    fontWeight: '800',
  },
  footerInfo: {
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
});
