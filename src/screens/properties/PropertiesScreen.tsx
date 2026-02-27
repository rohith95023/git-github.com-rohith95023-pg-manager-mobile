import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';

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

const PropertiesScreen = () => {
  const { displayPgs, searchTerm, setSearchTerm, loading } = usePGs();
  const filtered = useMemo(() => displayPgs, [displayPgs]);

  type PropertyEntry = {
    id: string;
    name: string;
    city?: string;
    state?: string;
    computedRooms?: number;
  };

  const renderItem = useCallback(
    ({ item }: { item: PropertyEntry }) => (
      <InfoCard
        title={item.name}
        subtitle={`${item.city || 'Unknown'}, ${item.state || 'India'}`}
        value={`${item.computedRooms || 0} rooms`}
        onPress={() => {}}
      />
    ),
    []
  );

  return (
    <ScreenContainer>
      <AppHeader title="PG Properties" />
      <SectionHeader title="Properties" />
      <SearchBar value={searchTerm} onChangeText={setSearchTerm} placeholder="Search properties" />
      <FlatList
        data={filtered}
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
            <EmptyState message="No properties found. Add your first PG to get started." icon="business-outline" />
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

export default PropertiesScreen;
