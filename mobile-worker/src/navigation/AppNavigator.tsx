// =============================================================================
// SHAN POULTRY PROTEIN - Mobile App Navigator
// =============================================================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
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
        <Text style={styles.loadingText}>Initializing Worker System...</Text>
      </View>
    );
  }

  if (!worker) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.root}>
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
        >
          <Text style={[styles.tabIcon, activeTab === 'Home' && styles.tabActiveText]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabActiveText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('MyCollections')}
        >
          <Text style={[styles.tabIcon, activeTab === 'MyCollections' && styles.tabActiveText]}>📋</Text>
          <Text style={[styles.tabLabel, activeTab === 'MyCollections' && styles.tabActiveText]}>Slips</Text>
        </TouchableOpacity>

        {/* Center Prominent "+ New" Action */}
        <TouchableOpacity
          style={styles.centerTabItem}
          onPress={() => setActiveTab('NewCollection')}
          activeOpacity={0.8}
        >
          <View style={[styles.centerCircle, activeTab === 'NewCollection' && styles.centerCircleActive]}>
            <Text style={styles.centerIcon}>＋</Text>
          </View>
          <Text style={[styles.centerLabel, activeTab === 'NewCollection' && styles.tabActiveText]}>New Slip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Customers')}
        >
          <Text style={[styles.tabIcon, activeTab === 'Customers' && styles.tabActiveText]}>👥</Text>
          <Text style={[styles.tabLabel, activeTab === 'Customers' && styles.tabActiveText]}>Shops</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Profile')}
        >
          <Text style={[styles.tabIcon, activeTab === 'Profile' && styles.tabActiveText]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabActiveText]}>Sync</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIcon: {
    fontSize: 18,
    color: '#64748b',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  tabActiveText: {
    color: '#10b981',
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
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  centerCircleActive: {
    backgroundColor: '#34d399',
  },
  centerIcon: {
    color: '#090d16',
    fontSize: 26,
    fontWeight: '900',
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 4,
  },
});
