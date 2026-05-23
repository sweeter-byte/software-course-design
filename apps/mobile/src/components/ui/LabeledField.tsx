import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

type LabeledFieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  secureTextEntry?: boolean
  multiline?: boolean
  placeholder?: string
}

export function LabeledField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  multiline,
  placeholder,
}: LabeledFieldProps) {
  const [visible, setVisible] = useState(false)
  const obscure = Boolean(secureTextEntry) && !visible

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[
            styles.input,
            multiline ? styles.inputMultiline : null,
            secureTextEntry ? styles.inputWithToggle : null,
          ]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={obscure}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          autoCapitalize={secureTextEntry ? 'none' : undefined}
          autoCorrect={secureTextEntry ? false : undefined}
        />
        {secureTextEntry ? (
          <Pressable
            style={styles.toggle}
            onPress={() => setVisible((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? '隐藏密码' : '显示密码'}
          >
            <Text style={styles.toggleText}>{visible ? '隐藏' : '显示'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  fieldLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  inputWithToggle: {
    paddingRight: 64,
  },
  inputMultiline: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  toggle: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  toggleText: {
    color: '#005bac',
    fontWeight: '700',
    fontSize: 12,
  },
})
