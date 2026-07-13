/**
 * Pantalla Principal - Dashboard
 * Muestra estado del escaneo y oportunidades en vivo
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { useArbitrageScanner } from '../hooks/useArbitrageScanner';
import { GlowCard } from '../components/GlowCard';
import { PulsingDot } from '../components/PulsingDot';
import { OpportunityCard } from '../components/OpportunityCard';

export function DashboardScreen({ navigation }: any) {
  const {
    isScanning, isInitialized, profitable, opportunities,
    lastScanTime, scanCount, stats, runScan, startScanning, stopScanning,
  } = useArbitrageScanner(true);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await runScan();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Arbitraje</Text>
          <Text style={styles.subtitle}>Detector</Text>
        </View>
        <View style={styles.statusContainer}>
          <PulsingDot active={isScanning} color={isScanning ? colors.success : colors.textMuted} />
          <Text style={[styles.statusText, { color: isScanning ? colors.success : colors.textMuted }]}>
            {isScanning ? 'Escaneando' : 'Pausado'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <GlowCard style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Escaneos</Text>
          </GlowCard>
          <GlowCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats.totalProfitable}
            </Text>
            <Text style={styles.statLabel}>Rentables</Text>
          </GlowCard>
          <GlowCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.bestScore.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Mejor Score</Text>
          </GlowCard>
        </View>

        {/* Scan info */}
        {lastScanTime > 0 && (
          <Text style={styles.scanInfo}>
            Ultimo escaneo: {(lastScanTime / 1000).toFixed(1)}s • {opportunities.length} detectadas
          </Text>
        )}

        {/* Control button */}
        <TouchableOpacity
          style={[styles.controlBtn, isScanning && styles.controlBtnActive]}
          onPress={isScanning ? stopScanning : startScanning}
          activeOpacity={0.8}
        >
          <Text style={styles.controlBtnText}>
            {isScanning ? '⏸  Pausar Monitoreo' : '▶  Iniciar Monitoreo'}
          </Text>
        </TouchableOpacity>

        {/* Opportunities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Oportunidades Rentables
          </Text>
          {profitable.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                {isScanning
                  ? 'Buscando oportunidades...'
                  : 'Sin oportunidades en este momento'}
              </Text>
              <Text style={styles.emptySubtext}>
                Las mejores aparecen en momentos de alta volatilidad
              </Text>
            </View>
          ) : (
            profitable.slice(0, 10).map((opp, index) => (
              <View key={opp.id} style={{ marginBottom: spacing.md }}>
                <OpportunityCard
                  opportunity={opp}
                  onPress={() => navigation.navigate('Detail', { opportunity: opp })}
                />
              </View>
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.primary,
    marginTop: -4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scanInfo: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  controlBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  controlBtnActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  controlBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
