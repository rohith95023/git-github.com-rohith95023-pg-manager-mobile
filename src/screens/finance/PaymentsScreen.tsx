import React, { useMemo, useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import FinanceCard from '../../components/cards/FinanceCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import SkeletonCard from '../../components/common/SkeletonCard';
import SearchBar from '../../components/common/SearchBar';

import { usePGs } from '../../hooks/usePGs';
import { Spacing } from '../../constants/spacing';

type PaymentRecord = {
  id: string;
  title: string;
  amount: string;
  subtitle: string;
};

const PaymentsScreen = () => {
  const { pgs, loading } = usePGs();
  const [filter, setFilter] = useState('');

  const paymentRecords = useMemo(() => {
    return pgs
      .slice(0, 8)
      .map((pg, index) => ({
        id: `${pg.id || index}-payment`,
        title: `${pg.name} collection`,
        amount: `₹${(pg.analytics?.currentMonthRevenue || 0).toLocaleString()}`,
        subtitle: `${pg.analytics?.residentsCount || 0} tenants`,
      }))
      .filter((entry) => entry.title.toLowerCase().includes(filter.toLowerCase()));
  }, [pgs, filter]);

  const renderItem = useCallback(
    ({ item }: { item: PaymentRecord }) => (
      <FinanceCard
        title={item.title}
        subtitle={item.subtitle}
        amount={item.amount}
        type="income"
        onPress={() => {}}
      />
    ),
    []
  );

  return (
    <ScreenContainer>
      <AppHeader title="Financial Records" />
      <SectionHeader title="Collections" actionLabel="Refresh" onActionPress={() => {}} />
      <SearchBar value={filter} onChangeText={setFilter} placeholder="Filter payments" />
      <FlatList
        data={paymentRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <EmptyState message="No collections recorded yet." icon="cash-outline" />
          )
        }
        initialNumToRender={4}
        windowSize={5}
      />
      {loading && <LoadingOverlay />}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
});

export default PaymentsScreen;
