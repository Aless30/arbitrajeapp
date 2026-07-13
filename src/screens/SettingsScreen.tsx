/**
 * Pantalla de Configuración
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Switch, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { DEFAULT_CONFIG, EngineConfig } from '../services/arbitrageEngine';
import { loadConfig, saveConfig, clearHistory } from '../utils/storage';

export function SettingsScreen() {
  const [config, setConfig] = useState<EngineConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await loadConfig();
      if (c) setConfig(c);
    })();
  }, []);

  const handleSave = async () => {
    await saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Borrar Historial',
      'Se eliminara todo el historial de oportunidades detectadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: () => clearHistory() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Configuracion</Text>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Inversión */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simulacion</Text>
          <SettingInput
            label="Monto de inversión (USD)"
            value={config.investmentAmount.toString()}
            onChangeText={v => setConfig(c => ({ ...c, investmentAmount: parseFloat(v) || 0 }))}
            keyboardType="numeric"
          />
        </View>

        {/* Umbrales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Umbrales de Ganancia</Text>
          <SettingInput
            label="Min. profit inter-exchange (%)"
            value={config.minProfitPercent.toString()}
            onChangeText={v => setConfig(c => ({ ...c, minProfitPercent: parseFloat(v) || 0 }))}
            keyboardType="decimal-pad"
          />
          <SettingInput
            label="Min. profit triangular (%)"
            value={config.minProfitTriangular.toString()}
            onChangeText={v => setConfig(c => ({ ...c, minProfitTriangular: parseFloat(v) || 0 }))}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Costos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Costos Estimados</Text>
          <SettingInput
            label="Fee de trading (%)"
            value={config.tradingFeePercent.toString()}
            onChangeText={v => setConfig(c => ({ ...c, tradingFeePercent: parseFloat(v) || 0 }))}
            keyboardType="decimal-pad"
          />
          <SettingInput
            label="Slippage (%)"
            value={config.slippagePercent.toString()}
            onChangeText={v => setConfig(c => ({ ...c, slippagePercent: parseFloat(v) || 0 }))}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Exchanges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exchanges</Text>
          <Text style={styles.hint}>
            Exchanges activos: {config.exchanges.join(', ')}
          </Text>
          <Text style={styles.hint}>
            Exchange triangular: {config.triangularExchange}
          </Text>
        </View>

        {/* Acciones */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>
            {saved ? '✓ Guardado' : 'Guardar Cambios'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearBtn} onPress={handleClearHistory} activeOpacity={0.8}>
          <Text style={styles.clearBtnText}>Borrar Historial</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingInput({ label, value, onChangeText, keyboardType }: any) {
  return (
    <View style={inputStyles.wrapper}>
      <Text style={inputStyles.label}>{label}</Text>
      <TextInput
        style={inputStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hint: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveBtnText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  clearBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  clearBtnText: { fontSize: fontSize.md, fontWeight: '600', color: colors.danger },
});
