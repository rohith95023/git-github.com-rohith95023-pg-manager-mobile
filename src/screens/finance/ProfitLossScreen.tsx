import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import AppHeader from '../../components/AppHeader';
import { VictoryPie, VictoryChart, VictoryBar, VictoryTheme, VictoryAxis } from 'victory-native';

const ProfitLossScreen = () => {
    const data = [
        { quarter: 1, earnings: 13000 },
        { quarter: 2, earnings: 16500 },
        { quarter: 3, earnings: 14250 },
        { quarter: 4, earnings: 19000 }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Profit & Loss" showMenu={false} showBack={true} />
            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Monthly Revenue Trend</Text>
                    <VictoryChart theme={VictoryTheme.material} domainPadding={20} height={250}>
                        <VictoryAxis tickValues={[1, 2, 3, 4]} tickFormat={["Q1", "Q2", "Q3", "Q4"]} />
                        <VictoryAxis dependentAxis tickFormat={(x: any) => `₹${x / 1000}k`} />
                        <VictoryBar data={data} x="quarter" y="earnings" style={{ data: { fill: "#3B82F6" } }} />
                    </VictoryChart>
                </View>

                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Expense Distribution</Text>
                    <VictoryPie
                        data={[
                            { x: "Utilities", y: 35 },
                            { x: "Salary", y: 40 },
                            { x: "Repair", y: 25 }
                        ]}
                        colorScale={["#3B82F6", "#10B981", "#EF4444"]}
                        height={250}
                        padding={50}
                        labels={({ datum }: { datum: any }) => `${datum.x}: ${datum.y}%`}
                        style={{ labels: { fontSize: 10, fontWeight: "bold" } }}
                    />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        padding: 16,
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
    },
});

export default ProfitLossScreen;
