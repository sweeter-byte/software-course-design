import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

const PRESETS: ReadonlyArray<{ label: string; value: string; hint: string }> = [
  {
    label: '本机 Web',
    value: 'http://localhost:4100/api/v1',
    hint: 'Expo Web 或 iOS 模拟器直接访问本机服务',
  },
  {
    label: 'Android 模拟器',
    value: 'http://10.0.2.2:4100/api/v1',
    hint: 'Android Emulator 通过 10.0.2.2 访问宿主机',
  },
]

type DevSettingsSectionProps = {
  apiBaseUrl: string
  onChangeApiBaseUrl: (next: string) => void
}

export function DevSettingsSection({ apiBaseUrl, onChangeApiBaseUrl }: DevSettingsSectionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>开发设置</Text>
          <Text style={styles.helper}>仅在切换后端环境时需要调整。</Text>
        </View>
        <Text style={styles.toggleText}>{expanded ? '收起' : '展开'}</Text>
      </Pressable>

      {expanded ? (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>API Base URL</Text>
            <TextInput
              value={apiBaseUrl}
              onChangeText={onChangeApiBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />
          </View>
          <View style={styles.presetRow}>
            {PRESETS.map((preset) => (
              <Pressable
                key={preset.value}
                style={[
                  styles.preset,
                  apiBaseUrl === preset.value ? styles.presetActive : null,
                ]}
                onPress={() => onChangeApiBaseUrl(preset.value)}
              >
                <Text
                  style={[
                    styles.presetTitle,
                    apiBaseUrl === preset.value ? styles.presetTitleActive : null,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text style={styles.presetHint}>{preset.hint}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helper}>
            真机连局域网时改成宿主机 IP + 端口，例如 http://192.168.1.10:4100/api/v1。
          </Text>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
  },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: '#111827', fontWeight: '800', fontSize: 16 },
  helper: { color: '#6b7280', lineHeight: 20 },
  toggleText: { color: '#005bac', fontWeight: '800' },
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 12 },
  input: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#fbfcfe',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    minHeight: 44,
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#f4f7fb',
    gap: 2,
  },
  presetActive: { backgroundColor: '#eaf3ff', borderColor: '#005bac' },
  presetTitle: { color: '#004080', fontWeight: '800' },
  presetTitleActive: { color: '#005bac' },
  presetHint: { color: '#6b7280', fontSize: 11 },
})
