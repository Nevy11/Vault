import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { 
  Bell, 
  Search, 
  Eye, 
  EyeOff, 
  Send, 
  PlusCircle, 
  ArrowDownCircle, 
  CreditCard, 
  PieChart, 
  Lock, 
  TrendingUp, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

/**
 * 1. TYPES & INTERFACES
 */
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  color: string;
}

interface SubAccount {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
}

/**
 * 2. COMPONENTS
 */

// A. Time-Aware Header
const DashboardHeader: React.FC<{ userName: string; initials: string }> = ({ userName, initials }) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good morning', emoji: '🌅' };
    if (hour >= 12 && hour < 17) return { text: 'Good afternoon', emoji: '☀️' };
    return { text: 'Good evening', emoji: '🌙' };
  }, []);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <View style={styles.initialsBadge}>
          <Text style={styles.initialsText}>{initials}</Text>
        </View>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingSubText}>{greeting.text}, {greeting.emoji}</Text>
          <Text style={styles.greetingMainText}>{userName}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIcon}>
          <Search size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <View style={styles.notificationDot} />
          <Bell size={22} color="#F8FAFC" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// B. Secure Balance Carousel Card
const BalanceCard: React.FC<{ balance: number; currency: string }> = ({ balance, currency }) => {
  const [isHidden, setIsHidden] = useState(false);

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <View style={styles.balanceLabelRow}>
          <ShieldAlert size={14} color="#10B981" />
          <Text style={styles.balanceLabel}>Vault Ledger Balance</Text>
        </View>
        <TouchableOpacity onPress={() => setIsHidden(!isHidden)}>
          {isHidden ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.balanceValue}>
        {isHidden ? '••••••••••' : `${currency} ${balance.toLocaleString()}`}
      </Text>

      <TouchableOpacity style={styles.viewStatementsBtn}>
        <Text style={styles.viewStatementsText}>View Statements</Text>
        <ChevronRight size={14} color="#10B981" />
      </TouchableOpacity>
    </View>
  );
};

/**
 * 3. MAIN DASHBOARD SCREEN
 */
export const VaultDashboard: React.FC = () => {
  const quickActions: QuickAction[] = [
    { id: '1', label: 'Send Money', icon: Send, route: 'Send', color: '#3B82F6' },
    { id: '2', label: 'Deposit', icon: PlusCircle, route: 'Deposit', color: '#10B981' },
    { id: '3', label: 'Withdraw', icon: ArrowDownCircle, route: 'Withdraw', color: '#F59E0B' },
    { id: '4', label: 'Pay Vendor', icon: CreditCard, route: 'Pay', color: '#8B5CF6' },
    { id: '5', label: 'Analytics', icon: PieChart, route: 'Analytics', color: '#EC4899' },
    { id: '6', label: 'Crypto', icon: Lock, route: 'Crypto', color: '#F97316' },
    { id: '7', label: 'Invest', icon: TrendingUp, route: 'Invest', color: '#06B6D4' },
    { id: '8', label: 'Security', icon: ShieldAlert, route: 'Security', color: '#EF4444' },
  ];

  const subAccounts: SubAccount[] = [
    { id: 's1', name: 'Vault Trade', balance: 12400.50, icon: '📈', color: '#1E293B' },
    { id: 's2', name: 'Fixed Yield', balance: 50000.00, icon: '🏦', color: '#1E293B' },
    { id: 's3', name: 'Emergencies', balance: 2500.00, icon: '🚨', color: '#1E293B' },
    { id: 's4', name: 'Crypto Lock', balance: 0.45, icon: '₿', color: '#1E293B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <DashboardHeader userName="Maxwell" initials="MN" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Carousel Section */}
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={styles.carouselContainer}
        >
          <BalanceCard balance={245800.00} currency="KES" />
          <BalanceCard balance={1890.50} currency="USD" />
        </ScrollView>

        {/* Quick Actions Grid */}
        <View style={styles.gridContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.id} style={styles.gridItem}>
                <View style={[styles.gridIconContainer, { backgroundColor: `${action.color}20` }]}>
                  <action.icon size={24} color={action.color} />
                </View>
                <Text style={styles.gridLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Finances Ecosystem */}
        <View style={styles.ecosystemContainer}>
          <Text style={styles.sectionTitle}>My Finances</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ecosystemRow}>
            {subAccounts.map((sub) => (
              <TouchableOpacity key={sub.id} style={styles.subAccountCard}>
                <View style={styles.subAccountIcon}>
                  <Text style={{ fontSize: 24 }}>{sub.icon}</Text>
                </View>
                <Text style={styles.subAccountName}>{sub.name}</Text>
                <Text style={styles.subAccountBalance}>
                  {sub.balance.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  initialsBadge: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  greetingTextContainer: {
    marginLeft: 12,
  },
  greetingSubText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  greetingMainText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  carouselContainer: {
    marginTop: 10,
  },
  balanceCard: {
    width: width - 40,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  viewStatementsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  viewStatementsText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  gridContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - 60) / 4,
    alignItems: 'center',
    marginBottom: 25,
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  ecosystemContainer: {
    marginTop: 10,
    paddingBottom: 40,
  },
  ecosystemRow: {
    paddingLeft: 20,
  },
  subAccountCard: {
    width: 130,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    marginRight: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  subAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  subAccountName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  subAccountBalance: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
});
