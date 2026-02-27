import { useMemo, useCallback, useState } from 'react';
import type { ListRenderItem } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import SearchBar from '../../components/common/SearchBar';
import InfoCard from '../../components/cards/InfoCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import SkeletonCard from '../../components/common/SkeletonCard';

import { usePGs } from '../../hooks/usePGs';
import { Spacing } from '../../constants/spacing';

type TenantEntry = {
  id: string;
  name: string;
  property: string;
  status: string;
};

const TenantsScreen = () => {
  const { pgs, loading } = usePGs();
  const [query, setQuery] = useState('');

  const tenants = useMemo<TenantEntry[]>(() => {
    const entries = pgs.flatMap((pg) => {
      const residents = pg.analytics?.residentsCount || 0;
      return Array.from({ length: Math.min(residents, 3) }).map((_, index) => ({
        id: `${pg.id}-${index}`,
        name: `Tenant ${index + 1}`,
        property: pg.name,
        status: index === 0 ? 'Active' : 'Pending',
      }));
    });
    return entries;
  }, [pgs]);

  const filtered = useMemo(() => {
    if (!query) return tenants;
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [tenants, query]);

  const renderItem = useCallback<ListRenderItem<TenantEntry>>(
    ({ item }) => (
      <InfoCard
        title={item.name}
        subtitle={`${item.property} • ${item.status}`}
        onPress={() => {}}
      />
    ),
    []
  );

  return (
    <ScreenContainer>
      <AppHeader title="Resident Directory" />
      <SectionHeader title="Tenants" />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search tenants" />
      <FlatList<TenantEntry>
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonWrapper}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState message="No tenant data available." icon="people-outline" />
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
  skeletonWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});

export default TenantsScreen;
