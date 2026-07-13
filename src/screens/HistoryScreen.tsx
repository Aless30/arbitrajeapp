/**
 * Pantalla de Historial de Oportunidades
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../utils/theme';
import { ArbitrageOpportunity } from '../services/arbitrageEngine';
import { loadHistory } from '../utils/storage';
import { OpportunityCard } from '../components/OpportunityCard';

export function HistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<ArbitrageOpportunity[]>([]);

  useEffect(() => {
    const load = async () => {
      const h = await loadHistory();
      setHistory(h);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Historial</Text>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Sin historial aun</Text>
          <Text style={styles.emptySubtext}>
            Las oportunidades rentables se guardaran aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: spacing.md }}>
              <OpportunityCard
                opportunity={item}
                onPress={() => navigation.navigate('Detail', { opportunity: item })}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.lg, color: colors.textSecondary },
  emptySubtext: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
});
