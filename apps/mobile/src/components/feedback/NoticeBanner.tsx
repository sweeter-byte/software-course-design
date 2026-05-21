import { StyleSheet, Text, View } from 'react-native'

export type NoticeType = 'success' | 'error' | 'info'

export type NoticeState = {
  type: NoticeType
  message: string
}

type NoticeBannerProps = {
  notice: NoticeState | null
}

export function NoticeBanner({ notice }: NoticeBannerProps) {
  if (!notice) return null

  return (
    <View style={[styles.banner, styles[notice.type]]}>
      <Text style={[styles.text, styles[`${notice.type}Text`]]}>{notice.message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
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
})
