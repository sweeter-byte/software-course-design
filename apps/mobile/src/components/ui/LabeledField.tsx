import { StyleSheet, Text, TextInput, View } from 'react-native'

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
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
      />
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
  inputMultiline: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
})
