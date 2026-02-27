import React, { useMemo, useCallback, useState, type ComponentProps } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import KPIStatCard from '../../components/cards/KPIStatCard';
import FloatingActionButton from '../../components/common/FloatingActionButton';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import SkeletonCard from '../../components/common/SkeletonCard';

import { usePGs } from '../../hooks/usePGs';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

type QuickAction = {
  id: string;
  label: string;
  icon: IoniconsName;
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  type: 'income' | 'expense' | 'info';
  amount?: string;
  time: string;
};

const quickActions: QuickAction[] = [
  { id: 'add-pg', label: 'Add PG', icon: 'business-outline' },
  { id: 'add-room', label: 'Add Room', icon: 'door-open-outline' },
  { id: 'add-tenant', label: 'Add Tenant', icon: 'person-add-outline' },
  { id: 'record-payment', label: 'Record Payment', icon: 'receipt-outline' },
];

const DashboardScreen = () => {
  const { pgs, loading, fetchData } = usePGs();
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    const totalRooms = pgs.reduce((sum, pg) => sum + (pg.analytics?.totalBeds || 0), 0);
    const totalTenants = pgs.reduce((sum, pg) => sum + (pg.analytics?.residentsCount || 0), 0);
    const totalRevenue = pgs.reduce((sum, pg) => sum + (pg.analytics?.currentMonthRevenue || 0), 0);
    const occupancySum = pgs.reduce((sum, pg) => sum + (pg.analytics?.occupiedBeds || 0), 0);
    const occupancyTotal =
      pgs.reduce((sum, pg) => sum + (pg.analytics?.totalBeds || 0), 0) || 1;
    const occupancy = Math.round((occupancySum / occupancyTotal) * 100);

    return {
      pgCount: pgs.length,
      totalRooms,
      totalTenants,
      totalRevenue,
      occupancy,
    };
  }, [pgs]);

  const kpiData = useMemo(
    () => [
      {
        id: 'pgs',
        label: 'Total PGs',
        value: stats.pgCount.toString(),
        icon: <Ionicons name="business" size={20} color={Colors.Primary} />,
        color: Colors.Primary,
      },
      {
        id: 'rooms',
        label: 'Total Rooms',
        value: stats.totalRooms.toString(),
        icon: <Ionicons name="door-open" size={20} color={Colors.Success} />,
        color: Colors.Success,
      },
      {
        id: 'tenants',
        label: 'Tenants',
        value: stats.totalTenants.toString(),
        icon: <Ionicons name="people" size={20} color={Colors.Warning} />,
        color: Colors.Warning,
      },
      {
        id: 'occupancy',
        label: 'Occupancy',
        value: `${stats.occupancy}%`,
        icon: <Ionicons name="pie-chart" size={20} color={Colors.PrimaryLight} />,
        color: Colors.PrimaryLight,
      },
      {
        id: 'revenue',
        label: 'Monthly Revenue',
        value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`,
        icon: <Ionicons name="cash" size={20} color={Colors.Danger} />,
        color: Colors.Danger,
      },
    ],
    [stats]
  );

  const activity = useMemo<ActivityItem[]>(() => {
    if (!pgs.length) {
      return [
        {
          id: 'empty',
          title: 'No activity yet',
          subtitle: 'Create a PG or record a payment to see activity.',
          type: 'info',
          amount: '',
          time: 'Just now',
        },
      ];
    }
    return pgs.slice(0, 4).map((pg, index) => ({
      id: `${pg.id}-${index}`,
      title: `${pg.name} update`,
      subtitle: `${pg.city || 'Location'} • ${pg.analytics?.residentsCount || 0} tenants`,
      type: index % 2 === 0 ? 'income' : 'expense',
      amount: index % 2 === 0 ? `+₹${(pg.analytics?.currentMonthRevenue || 0).toLocaleString()}` : `-₹${(pg.analytics?.pendingDues || 0).toLocaleString()}`,
      time: `${index + 2}h ago`,
    }));
  }, [pgs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const renderActivityItem = useCallback(
    ({ item }: { item: ActivityItem }) => {
      const isIncome = item.type === 'income';
      return (
        <View style={styles.activityItem}>
          <View style={[styles.activityBadge, { backgroundColor: (isIncome ? Colors.Success : Colors.Danger) + '12' }]}>
            <Ionicons
              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={20}
              color={isIncome ? Colors.Success : Colors.Danger}
            />
          </View>
          <View style={styles.activityDetails}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
          </View>
          <View style={styles.activityMeta}>
            {item.amount ? (
              <Text style={[styles.activityAmount, { color: isIncome ? Colors.Success : Colors.Danger }]}>
                {item.amount}
              </Text>
            ) : null}
            <Text style={styles.activityTime}>{item.time}</Text>
          </View>
        </View>
      );
    },
    []
  );

  return (
    <ScreenContainer>
      <AppHeader subtitle="Overview" />
      <FlatList
        data={activity}
        keyExtractor={(item) => item.id}
        renderItem={renderActivityItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <SectionHeader title="Key Metrics" />
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <View style={styles.kpiStack}>
                {kpiData.map((item) => (
                  <KPIStatCard
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    icon={item.icon}
                    color={item.color}
                  />
                ))}
              </View>
            )}
            <SectionHeader title="Quick Actions" />
            <View style={styles.quickActionGrid}>
              {quickActions.map((action) => (
                <View key={action.id} style={styles.quickActionCard}>
                  <View style={styles.quickIcon}>
                    <Ionicons name={action.icon as any} size={20} color={Colors.Primary} />
                  </View>
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </View>
              ))}
            </View>
            <SectionHeader title="Recent Activity" actionLabel="View All" onActionPress={() => fetchData()} />
          </>
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        initialNumToRender={4}
        windowSize={5}
      />
      {loading && <LoadingOverlay />}
      <FloatingActionButton label="New" onPress={() => fetchData()} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 120,
  },
  kpiStack: {
    paddingHorizontal: Spacing.lg,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: Colors.Card,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.Border,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    marginTop: Spacing.md,
    color: Colors.TextPrimary,
    ...Typography.Body,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.Border,
    minHeight: 64,
  },
  activityBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    ...Typography.Body,
    fontWeight: '600',
    color: Colors.TextPrimary,
  },
  activitySubtitle: {
    ...Typography.Caption,
    color: Colors.TextSecondary,
    marginTop: 2,
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    ...Typography.Body,
    fontWeight: '700',
  },
  activityTime: {
    ...Typography.Caption,
    color: Colors.TextSecondary,
    marginTop: 4,
  },
  footerSpacer: {
    height: Spacing.xxxl,
  },
});

export default DashboardScreen;
