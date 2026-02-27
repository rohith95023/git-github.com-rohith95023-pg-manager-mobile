import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList, Dimensions } from 'react-native';
import AppHeader from '../../components/AppHeader';
import KPIStatCard from '../../components/KPIStatCard';
import SectionHeader from '../../components/SectionHeader';
import QuickActionButton from '../../components/QuickActionButton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePGs } from '../../hooks/usePGs';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
    const { pgs, loading } = usePGs();

    const stats = useMemo(() => {
        const totalRooms = pgs.reduce((sum, pg) => sum + (pg.analytics?.totalBeds || 0), 0);
        const totalTenants = pgs.reduce((sum, pg) => sum + (pg.analytics?.residentsCount || 0), 0);
        const totalRevenue = pgs.reduce((sum, pg) => sum + (pg.analytics?.currentMonthRevenue || 0), 0);

        return {
            totalRooms,
            totalTenants,
            totalRevenue,
            pgCount: pgs.length
        };
    }, [pgs]);

    const kpiData = useMemo(() => [
        { id: '1', label: 'Total PGs', value: stats.pgCount.toString(), color: '#3B82F6', icon: <Ionicons name={"business" as any} size={20} color="#3B82F6" /> },
        { id: '2', label: 'Rooms', value: stats.totalRooms.toString(), color: '#10B981', icon: <Ionicons name={"door-open" as any} size={20} color="#10B981" /> },
        { id: '3', label: 'Tenants', value: stats.totalTenants.toString(), color: '#F59E0B', icon: <Ionicons name={"people" as any} size={20} color="#F59E0B" /> },
        { id: '4', label: 'Occupancy', value: '92%', color: '#8B5CF6', icon: <Ionicons name={"pie-chart" as any} size={20} color="#8B5CF6" /> },
        { id: '5', label: 'Revenue', value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`, color: '#EF4444', icon: <Ionicons name={"cash" as any} size={20} color="#EF4444" /> },
    ], [stats]);

    const recentActivity = [
        { id: '1', title: 'Payment Received', subtitle: 'John Doe - Room 102', time: '2 mins ago', amount: '+₹8,500', type: 'income' },
        { id: '2', title: 'New Tenant Joined', subtitle: 'Alice Smith - PGP Palace', time: '1 hour ago', type: 'info' },
        { id: '3', title: 'Expense Logged', subtitle: 'Electricity Bill - June', time: '3 hours ago', amount: '-₹4,200', type: 'expense' },
        { id: '4', title: 'Room Vacated', subtitle: 'Bob Wilson - Room 304', time: '5 hours ago', type: 'warning' },
    ];

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'income': return 'arrow-down-circle';
            case 'expense': return 'arrow-up-circle';
            case 'warning': return 'alert-circle';
            default: return 'information-circle';
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'income': return '#10B981';
            case 'expense': return '#EF4444';
            case 'warning': return '#F59E0B';
            default: return '#3B82F6';
        }
    };

    const renderKPIItem = useCallback(({ item }: { item: any }) => (
        <KPIStatCard label={item.label} value={item.value} color={item.color} icon={item.icon} />
    ), []);

    const renderActivityItem = useCallback(({ item }: { item: any }) => (
        <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.type) + '15' }]}>
                <Ionicons name={getActivityIcon(item.type) as any} size={20} color={getActivityColor(item.type)} />
            </View>
            <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.activityRight}>
                {item.amount && <Text style={[styles.activityAmount, { color: item.type === 'income' ? '#10B981' : '#EF4444' }]}>{item.amount}</Text>}
                <Text style={styles.activityTime}>{item.time}</Text>
            </View>
        </View>
    ), []);

    const keyExtractor = useCallback((item: any) => item.id, []);

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* KPI Scroll */}
                <View style={styles.kpiContainer}>
                    <FlatList
                        data={kpiData}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={renderKPIItem}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={styles.kpiList}
                        initialNumToRender={5}
                        removeClippedSubviews={true}
                    />
                </View>

                {/* Quick Actions */}
                <SectionHeader title="Quick Actions" />
                <View style={styles.quickActionsContainer}>
                    <QuickActionButton label="Add PG" icon={<Ionicons name={"add-circle" as any} size={24} color="#3B82F6" />} onPress={() => { }} />
                    <QuickActionButton label="Add Room" icon={<MaterialCommunityIcons name={"door-plus" as any} size={24} color="#10B981" />} onPress={() => { }} color="#10B981" />
                    <QuickActionButton label="Add Tenant" icon={<Ionicons name={"person-add" as any} size={24} color="#F59E0B" />} onPress={() => { }} color="#F59E0B" />
                    <QuickActionButton label="Record Pay" icon={<Ionicons name={"receipt" as any} size={24} color="#EF4444" />} onPress={() => { }} color="#EF4444" />
                </View>

                {/* Recent Activity */}
                <SectionHeader title="Recent Activity" actionLabel="View All" onActionPress={() => { }} />
                <View style={styles.activityContainer}>
                    {recentActivity.map((item) => (
                        <View key={item.id}>
                            {renderActivityItem({ item })}
                        </View>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    kpiContainer: {
        marginTop: 8,
    },
    kpiList: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    activityContainer: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    activitySubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    activityRight: {
        alignItems: 'flex-end',
    },
    activityAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    activityTime: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 4,
    },
});

export default DashboardScreen;
