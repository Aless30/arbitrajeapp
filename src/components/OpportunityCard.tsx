/**
 * Tarjeta de oportunidad de arbitraje
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { ArbitrageOpportunity } from '../services/arbitrageEngine';
import { GlowCard } from './GlowCard';
import { ScoreRing } from './ScoreRing';
import { StatusBadge } from './StatusBadge';

interface OpportunityCardProps {
  opportunity: ArbitrageOpportunity;
  onPress?: () => void;
}

export function OpportunityCard({ opportunity, onPress }: OpportunityCardProps) {
  const isProfitable = opportunity.netProfitPercent > 0;
  const riskVariant = opportunity.riskLevel === 'bajo' ? 'success' :
                      opportunity.riskLevel === 'medio' ? 'warning' : 'danger';
  const typeLabel = opportunity.type === 'inter_exchange' ? 'INTER-EX' :
                    opportunity.type === 'triangular' ? 'TRIANGULAR' : 'FOREX';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlowCard active={isProfitable && opportunity.score >= 60}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <StatusBadge label={typeLabel} variant="primary" />
            <StatusBadge label={opportunity.riskLevel} variant={riskVariant} />
          </View>
          <ScoreRing score={opportunity.score} />
        </View>

        <Text style={styles.pair}>{opportunity.pair}</Text>

        <View style={styles.route}>
          <Text style={styles.routeText}>
            {opportunity.buyExchange} → {opportunity.sellExchange}
          </Text>
        </View>

        <View style={styles.profitRow}>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>Bruto</Text>
            <Text style={[styles.profitValue, { color: colors.textSecondary }]}>
              {opportunity.grossProfitPercent.toFixed(3)}%
            </Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>Costos</Text>
            <Text style={[styles.profitValue, { color: colors.danger }]}>
              -${opportunity.totalCosts.toFixed(2)}
            </Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>Neto</Text>
            <Text style={[
              styles.profitValue,
              styles.profitNet,
              { color: isProfitable ? colors.success : colors.danger }
            ]}>
              {isProfitable ? '+' : ''}${opportunity.netProfitUsd.toFixed(2)}
            </Text>
          </View>
        </View>

        {opportunity.transferTimeMin > 0 && (
          <Text style={styles.transferTime}>
            ⏱ ~{opportunity.transferTimeMin} min transferencia
          </Text>
        )}
      </GlowCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pair: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  route: {
    marginBottom: spacing.md,
  },
  routeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  profitItem: {
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profitValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  profitNet: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  transferTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'right',
  },
});
