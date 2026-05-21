import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { CourseItem } from '../../domain'

const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  active: '开课中',
  completed: '已结课',
  suspended: '暂停',
  cancelled: '已取消',
}

type CourseContextHeaderProps = {
  course: CourseItem | null
  /**
   * Optional badge shown next to the course code. Currently used for the
   * student "已加入" marker.
   */
  badge?: string | null
}

export function CourseContextHeader({ course, badge }: CourseContextHeaderProps) {
  const [expanded, setExpanded] = useState(false)

  if (!course) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>课程上下文加载中…</Text>
      </View>
    )
  }

  const subtitle = [course.courseCode, course.semester].filter(Boolean).join(' · ')
  const statusLabel = STATUS_LABELS[course.status] ?? course.status

  return (
    <View style={styles.container}>
      <View style={styles.headRow}>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>当前课程</Text>
          <Text style={styles.title}>{course.courseName}</Text>
          <Text style={styles.subtitle}>{subtitle || '—'}</Text>
        </View>
        <View style={styles.statusBlock}>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      {expanded ? (
        <View style={styles.detailGrid}>
          <DetailRow label="授课教师" value={course.teacherName ?? course.teacherId} />
          <DetailRow label="上课时间" value={course.scheduleText || '—'} />
          <DetailRow label="上课地点" value={course.location || '—'} />
          <DetailRow label="开课日期" value={course.startDate ?? '—'} />
          <DetailRow label="结课日期" value={course.endDate ?? '—'} />
          <DetailRow label="人数上限" value={String(course.capacity ?? '—')} />
          <DetailRow label="课程简介" value={course.description || '—'} multiline />
        </View>
      ) : null}

      <Pressable onPress={() => setExpanded((current) => !current)} style={styles.toggle}>
        <Text style={styles.toggleText}>{expanded ? '收起课程信息' : '展开课程信息'}</Text>
      </Pressable>
    </View>
  )
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={[styles.detailRow, multiline ? styles.detailRowMultiline : null]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, multiline ? styles.detailValueMultiline : null]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  placeholder: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 18,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#6b7280',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headCopy: {
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
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
  },
  statusBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    color: '#116c35',
    backgroundColor: '#dcf2e3',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  statusText: {
    color: '#004080',
    fontWeight: '700',
    fontSize: 12,
  },
  detailGrid: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eef1f6',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  detailRowMultiline: {
    flexDirection: 'column',
    gap: 2,
  },
  detailLabel: {
    minWidth: 70,
    color: '#6b7280',
    fontSize: 12,
  },
  detailValue: {
    flex: 1,
    color: '#111827',
  },
  detailValueMultiline: {
    color: '#111827',
    lineHeight: 20,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  toggleText: {
    color: '#005bac',
    fontWeight: '700',
  },
})
