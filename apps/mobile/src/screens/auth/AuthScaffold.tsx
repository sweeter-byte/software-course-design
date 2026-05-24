import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { NoticeBanner, type NoticeState } from '../../components/feedback/NoticeBanner'

type AuthScaffoldProps = {
  title: string
  helper: string
  notice: NoticeState | null
  onDismissNotice?: () => void
  children: ReactNode
}

export function AuthScaffold({
  title,
  helper,
  notice,
  onDismissNotice,
  children,
}: AuthScaffoldProps) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.hero}>
        <View style={styles.heroBrandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>NUAA</Text>
          </View>
          <View style={styles.heroBrandCopy}>
            <Text style={styles.eyebrow}>统一身份认证</Text>
            <Text style={styles.heroTitle}>课程互动管理系统</Text>
          </View>
        </View>
      </View>

      <NoticeBanner notice={notice} onDismiss={onDismissNotice} />

      <View style={styles.card}>
        <View style={styles.authHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.helper}>{helper}</Text>
        </View>
        {children}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 14,
  },
  hero: {
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#004080',
    backgroundColor: '#002b5c',
    gap: 14,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: '#005bac',
  },
  brandMarkText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  heroBrandCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#dbeafe', fontSize: 11, fontWeight: '800' },
  heroTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 14,
  },
  authHeader: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d9e2ef',
  },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  helper: { color: '#6b7280', lineHeight: 20 },
})
