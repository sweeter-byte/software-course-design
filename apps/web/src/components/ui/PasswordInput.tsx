import { useState, type InputHTMLAttributes } from 'react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Password text input with a built-in show/hide toggle. Wraps the input so the
 * caller can keep using the same <label> structure used elsewhere in the auth
 * and account forms.
 */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        aria-pressed={visible}
        aria-label={visible ? '隐藏密码' : '显示密码'}
        tabIndex={-1}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? '隐藏' : '显示'}
      </button>
    </span>
  )
}
