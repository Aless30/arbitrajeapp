/**
 * Pantalla de Detalle de Oportunidad
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { ArbitrageOpportunity } from '../services/arbitrageEngine';
import { ScoreRing } from '../components/ScoreRing';
import { StatusBadge } from '../components/StatusBadge';

export function DetailScreen({ route, navigation }: any) {
  const opportunity: ArbitrageOpportunity = route.params.opportunity;
  const isProfitable = opportunity.netProfitPercent > 0;
  const riskVariant = opportunity.riskLevel === 'bajo' ? 'success' :
                      opportunity.riskLevel === 'medio' ? 'warning' : 'danger';

  const typeLabel = opportunity.type === 'inter_exchange' ? 'Inter-Exchange' :
                    opportunity.type === 'triangular' ? 'Triangular' : 'Forex';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Score */}
        <View style={styles.scoreSection}>
          <ScoreRing score={opportunity.score} size={88} />
          <View style={styles.scoreMeta}>
            <Text style={styles.pairTitle}>{opportunity.pair}</Text>
            <View style={styles.badges}>
              <StatusBadge label={typeLabel} variant="primary" />
              <StatusBadge label={opportunity.riskLevel} variant={riskVariant} />
            </View>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.card}>
          <Text style={styles.description}>{opportunity.description}</Text>
        </View>

        {/* Desglose */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Desglose Financiero</Text>
          <CostRow label="Inversión" value={`$${opportunity.investmentUsd.toFixed(2)}`} />
          <CostRow label="Ganancia Bruta" value={`+${opportunity.grossProfitPercent.toFixed(4)}%`}
            color={colors.textSecondary} />
          <View style={styles.divider} />
          <CostRow label="Fees de Trading" value={`-$${opportunity.tradingFees.toFixed(4)}`}
            color={colors.danger} />
          <CostRow label="Fee de Retiro" value={`-$${opportunity.withdrawalFee.toFixed(4)}`}
            color={colors.danger} />
          <CostRow label="Slippage" value={`-$${opportunity.slippageCost.toFixed(4)}`}
            color={colors.danger} />
          <CostRow label="Riesgo Transf." value={`-$${opportunity.transferRisk.toFixed(4)}`}
            color={colors.danger} />
          <View style={styles.divider} />
          <CostRow label="Total Costos" value={`-$${opportunity.totalCosts.toFixed(4)}`}
            color={colors.warning} bold />
          <View style={styles.divider} />
          <CostRow
            label="GANANCIA NETA"
            value={`${isProfitable ? '+' : ''}$${opportunity.netProfitUsd.toFixed(4)}`}
            color={isProfitable ? colors.success : colors.danger}
            bold
            large
          />
          <CostRow
            label=""
            value={`${opportunity.netProfitPercent.toFixed(4)}%`}
            color={isProfitable ? colors.success : colors.danger}
          />
        </View>

        {/* Info adicional */}
        {opportunity.transferTimeMin > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tiempo Estimado</Text>
            <Text style={styles.timeValue}>~{opportunity.transferTimeMin} minutos</Text>
            <Text style={styles.timeNote}>
              El precio puede cambiar durante la transferencia
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function CostRow({ label, value, color, bold, large }: {
  label: string; value: string; color?: string; bold?: boolean; large?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && { fontWeight: '600' }]}>{label}</Text>
      <Text style={[
        rowStyles.value,
        color ? { color } : {},
        bold && { fontWeight: '700' },
        large && { fontSize: fontSize.xl },
      ]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  backBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  scoreSection: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg,
  },
  scoreMeta: { flex: 1 },
  pairTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.primary, marginBottom: spacing.sm,
  },
  description: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  divider: {
    height: 1, backgroundColor: colors.border, marginVertical: spacing.sm,
  },
  timeValue: { fontSize: fontSize.xl, fontWeight: '600', color: colors.textPrimary },
  timeNote: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
});
