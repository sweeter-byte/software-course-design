import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

export type SegmentedTabItem<T extends string> = {
  value: T
  label: string
}

type SegmentedTabsProps<T extends string> = {
  items: ReadonlyArray<SegmentedTabItem<T>>
  value: T
  onChange: (next: T) => void
  /**
   * Horizontal chip style. Used for course workspace inner tabs so 4-5 tabs do
   * not wrap on narrow phones. Falls back to wrap mode when forced.
   */
  variant?: 'scroll' | 'wrap'
}

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'scroll',
}: SegmentedTabsProps<T>) {
  const buttons = items.map((item) => {
    const isActive = item.value === value
    return (
      <Pressable
        key={item.value}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        onPress={() => onChange(item.value)}
        style={[styles.chip, isActive ? styles.chipActive : null]}
      >
        <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{item.label}</Text>
      </Pressable>
    )
  })

  if (variant === 'wrap') {
    return <View style={styles.wrapRow}>{buttons}</View>
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollRow}
    >
      {buttons}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#005bac',
    borderColor: '#004080',
  },
  chipText: {
    color: '#004080',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#ffffff',
  },
})
