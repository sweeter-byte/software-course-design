import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import type { SessionUser } from '../../domain'
import { roleLabels } from '../../navigation/navigation-model'

type RoleHeaderProps = {
  title: string
  subtitle?: string
  user: SessionUser
  isLoggingOut?: boolean
  onLogout: () => void
}

export function RoleHeader({
  title,
  subtitle,
  user,
  isLoggingOut = false,
  onLogout,
}: RoleHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>{roleLabels[user.role]}工作区</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.userBlock}>
        <Text style={styles.userName}>{user.realName}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
        <Pressable style={styles.logoutButton} onPress={onLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#004080" />
          ) : (
            <Text style={styles.logoutText}>退出</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: '#005bac',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    lineHeight: 20,
  },
  userBlock: {
    minWidth: 92,
    alignItems: 'flex-end',
    gap: 3,
  },
  userName: {
    color: '#111827',
    fontWeight: '800',
  },
  phone: {
    color: '#6b7280',
    fontSize: 12,
  },
  logoutButton: {
    minHeight: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 91, 172, 0.32)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#004080',
    fontWeight: '800',
  },
})
