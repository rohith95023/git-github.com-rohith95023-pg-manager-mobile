import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';

const RoomsScreen = () => {
  const rooms: any[] = [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Rooms & Beds" />
      {rooms.length === 0 ? (
        <EmptyState
          message="No rooms added yet. Add a room to manage availability."
          icon="bed-outline"
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default RoomsScreen;
