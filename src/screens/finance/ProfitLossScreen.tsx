import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryPie } from 'victory-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import { usePGs } from '../../hooks/usePGs';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const chartWidth = Dimensions.get('window').width - Spacing.xxxl;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const ProfitLossScreen = () => {
  const { pgs } = usePGs();

  const revenueData = useMemo(() => {
    return months.map((month, index) => ({
      month,
      revenue: (pgs[index]?.analytics?.currentMonthRevenue || 0) + 10000 * (index + 1),
    }));
  }, [pgs]);

  const occupancyData = useMemo(() => {
    const totalBeds = pgs.reduce((sum, pg) => sum + (pg.analytics?.totalBeds || 0), 0);
    const occupied = pgs.reduce((sum, pg) => sum + (pg.analytics?.occupiedBeds || 0), 0);
    return [
      { x: 'Occupied', y: occupied || 1, color: Colors.Success },
      { x: 'Available', y: Math.max(totalBeds - occupied, 0) || 0, color: Colors.Warning },
    ];
  }, [pgs]);

  return (
    <ScreenContainer>
      <AppHeader title="Profit & Loss" />
      <SectionHeader title="Revenue Overview" actionLabel="Insights" onActionPress={() => {}} />
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Revenue</Text>
        <VictoryChart
          width={chartWidth}
          height={240}
          domainPadding={20}
        >
          <VictoryAxis
            tickValues={MONTHS}
            style={{
              axis: { stroke: Colors.Border },
              tickLabels: { fill: Colors.TextSecondary, ...Typography.Caption },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(value) => `₹${(value / 1000).toFixed(0)}k`}
            style={{
              axis: { stroke: Colors.Border },
              tickLabels: { fill: Colors.TextSecondary, ...Typography.Caption },
            }}
          />
          <VictoryBar
            data={revenueData}
            x="month"
            y="revenue"
            style={{
              data: {
                fill: Colors.Primary,
                borderRadius: 8,
              },
            }}
          />
        </VictoryChart>
      </View>
      <SectionHeader title="Occupancy" />
      <View style={styles.chartCard}>
        <VictoryPie
          width={chartWidth}
          height={220}
          data={occupancyData}
          colorScale={[Colors.Success, Colors.Warning]}
          innerRadius={50}
          labels={({ datum }) => `${datum.x}`}
          style={{ labels: { fill: Colors.TextPrimary, ...Typography.Body, fontWeight: '600' } }}
        />
        <View style={styles.legend}>
          {occupancyData.map((entry) => (
            <View key={entry.x} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
              <Text style={styles.legendLabel}>{entry.x}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: Colors.Card,
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.Border,
    minHeight: 280,
  },
  chartTitle: {
    ...Typography.H3,
    color: Colors.TextPrimary,
    marginBottom: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.xs,
  },
  legendLabel: {
    ...Typography.Body,
    color: Colors.TextSecondary,
  },
});

export default ProfitLossScreen;
