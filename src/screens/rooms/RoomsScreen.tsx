import React, { useMemo, useCallback, useState } from 'react';
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

const RoomsScreen = () => {
  const { rooms, loading } = usePGs();
  const [query, setQuery] = useState('');

  const filteredRooms = useMemo(() => {
    if (!query) return rooms;
    return rooms.filter((room) =>
      room.name?.toLowerCase().includes(query.toLowerCase())
    );
  }, [rooms, query]);

  type RoomEntry = {
    id: string;
    name?: string;
    room_type?: string;
    current_occupancy?: number;
    total_beds?: number;
  };

  const renderItem = useCallback(
    ({ item }: { item: RoomEntry }) => (
      <InfoCard
        title={item.name || 'Unknown room'}
        subtitle={`Type: ${item.room_type || 'Shared'}`}
        value={`${item.current_occupancy || 0}/${item.total_beds || 0} beds`}
        onPress={() => {}}
      />
    ),
    []
  );

  return (
    <ScreenContainer>
      <AppHeader title="Rooms & Beds" />
      <SectionHeader title="Browse rooms" />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search rooms" />
      <FlatList
        data={filteredRooms}
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
            <EmptyState message="No rooms available yet." icon="bed-outline" />
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

export default RoomsScreen;
