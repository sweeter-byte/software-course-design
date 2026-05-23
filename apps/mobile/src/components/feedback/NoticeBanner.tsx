import { Pressable, StyleSheet, Text, View } from 'react-native'

export type NoticeType = 'success' | 'error' | 'info'

export type NoticeState = {
  type: NoticeType
  message: string
}

type NoticeBannerProps = {
  notice: NoticeState | null
  /**
   * Optional manual-dismiss callback. The banner also auto-dismisses on a
   * timer set in App.tsx, but giving users an explicit "×" lets them clear
   * a stale "已恢复…会话" hint immediately when it gets in the way.
   */
  onDismiss?: () => void
}

export function NoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  if (!notice) return null

  return (
    <View style={[styles.banner, styles[notice.type]]}>
      <Text style={[styles.text, styles[`${notice.type}Text`]]}>{notice.message}</Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="关闭提示"
          style={styles.dismiss}
        >
          <Text style={[styles.dismissText, styles[`${notice.type}Text`]]}>×</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  info: {
    borderColor: '#bfd0e5',
    backgroundColor: '#eaf3ff',
  },
  success: {
    borderColor: '#bbdfc8',
    backgroundColor: '#eaf8ef',
  },
  error: {
    borderColor: '#f4b8b8',
    backgroundColor: '#fff1f2',
  },
  text: {
    flex: 1,
    fontWeight: '700',
    lineHeight: 20,
  },
  infoText: {
    color: '#004080',
  },
  successText: {
    color: '#116c35',
  },
  errorText: {
    color: '#b91c1c',
  },
  dismiss: {
    paddingHorizontal: 6,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
})
