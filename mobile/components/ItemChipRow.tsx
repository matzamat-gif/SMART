import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useI18n } from '../lib/i18n';
import { haptics } from '../lib/haptics';

export interface ChipOption {
  key: string;
  label: string;
}

interface Props {
  title: string;
  options: ChipOption[];
  value: string | null;
  onChange: (key: string) => void;
  // When true: no option is pre-selected; user must pick explicitly.
  forceChoice?: boolean;
  onOverride?: () => void;
  overrideLabel?: string;
}

export default function ItemChipRow({
  title,
  options,
  value,
  onChange,
  forceChoice,
  onOverride,
  overrideLabel,
}: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chips}>
        {options.map((opt) => {
          const selected = !forceChoice && value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={async () => {
                await haptics.selection();
                onChange(opt.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {onOverride ? (
        <Pressable onPress={onOverride} hitSlop={8}>
          <Text style={styles.override}>
            {overrideLabel ?? t('addItem.looksWrong')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  override: {
    marginTop: 8,
    fontSize: 12,
    color: '#059669',
    textDecorationLine: 'underline',
  },
});
