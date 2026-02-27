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

const ExpensesScreen = () => {
  const { rooms, loading } = usePGs();
  const [filter, setFilter] = useState('');

  const expenses = useMemo(() => {
    return rooms
      .slice(0, 6)
      .map((room) => ({
        id: room.id,
        title: `Maintenance • ${room.name || 'Room'}`,
        amount: `₹${(room.maintenance_amount || 0).toLocaleString()}`,
        status: room.status,
      }))
      .filter((entry) => entry.title.toLowerCase().includes(filter.toLowerCase()));
  }, [rooms, filter]);

  type ExpenseRecord = {
    id: string;
    title: string;
    amount: string;
    status?: string;
  };

  const renderItem = useCallback(
    ({ item }: { item: ExpenseRecord }) => (
      <FinanceCard
        title={item.title}
        subtitle={item.status || 'Pending'}
        amount={item.amount}
        type="expense"
        onPress={() => {}}
      />
    ),
    []
  );

  return (
    <ScreenContainer>
      <AppHeader title="Expense Tracker" />
      <SectionHeader title="Tracked expenses" actionLabel="Export" onActionPress={() => {}} />
      <SearchBar value={filter} onChangeText={setFilter} placeholder="Search expenses" />
      <FlatList
        data={expenses}
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
            <EmptyState message="No expenses logged yet." icon="wallet-outline" />
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

export default ExpensesScreen;
