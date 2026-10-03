// =============================================================================
// SHAN POULTRY PROTEIN - Mobile App Navigator
// Daylight Clean B2B Corporate Edition
// =============================================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NewCollectionScreen } from '../screens/NewCollectionScreen';
import { MyCollectionsScreen } from '../screens/MyCollectionsScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

type TabType = 'Home' | 'NewCollection' | 'MyCollections' | 'Customers' | 'Profile';

export const AppNavigator: React.FC = () => {
  const { worker, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('Home');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <Text style={styles.loadingText}>Initializing Worker System...</Text>
      </View>
    );
  }

  if (!worker) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Active Screen Content */}
      <View style={styles.content}>
        {activeTab === 'Home' && <HomeScreen onNavigate={(screen) => setActiveTab(screen as TabType)} />}
        {activeTab === 'NewCollection' && <NewCollectionScreen onSuccessReturn={() => setActiveTab('Home')} />}
        {activeTab === 'MyCollections' && <MyCollectionsScreen />}
        {activeTab === 'Customers' && <CustomersScreen />}
        {activeTab === 'Profile' && <ProfileScreen />}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Home')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'Home' && styles.tabActiveIcon]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabActiveText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('MyCollections')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'MyCollections' && styles.tabActiveIcon]}>📋</Text>
          <Text style={[styles.tabLabel, activeTab === 'MyCollections' && styles.tabActiveText]}>Slips</Text>
        </TouchableOpacity>

        {/* Center Prominent "+ New" Action */}
        <TouchableOpacity
          style={styles.centerTabItem}
          onPress={() => setActiveTab('NewCollection')}
          activeOpacity={0.85}
        >
          <View style={[styles.centerCircle, activeTab === 'NewCollection' && styles.centerCircleActive]}>
            <Text style={styles.centerIcon}>＋</Text>
          </View>
          <Text style={[styles.centerLabel, activeTab === 'NewCollection' && styles.tabActiveText]}>New Slip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Customers')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'Customers' && styles.tabActiveIcon]}>🏪</Text>
          <Text style={[styles.tabLabel, activeTab === 'Customers' && styles.tabActiveText]}>Shops</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Profile')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'Profile' && styles.tabActiveIcon]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabActiveText]}>Sync</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 68,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  tabActiveIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabActiveText: {
    color: '#2563EB',
    fontWeight: '800',
  },
  centerTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -16,
  },
  centerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  centerCircleActive: {
    backgroundColor: '#1D4ED8',
  },
  centerIcon: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: -2,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
  },
});
