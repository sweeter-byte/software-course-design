import {
  PasswordForm,
  type PasswordFormState,
} from './PasswordForm'
import {
  PhoneChangeForm,
  type PhoneChangeFormState,
} from './PhoneChangeForm'
import {
  ProfileForm,
  type ProfileFormState,
} from './ProfileForm'

type AccountSectionProps = {
  phone: string
  profile: ProfileFormState
  password: PasswordFormState
  phoneChange: PhoneChangeFormState
  isPasswordPending: boolean
  isCancelPending: boolean
  isPhoneCodePending: boolean
  isPhoneChangePending: boolean
  onPasswordChange: (next: PasswordFormState) => void
  onPhoneChange: (next: PhoneChangeFormState) => void
  onSubmitPassword: () => void
  onCancelAccount: () => void
  onRequestPhoneCode: (target: 'old' | 'new') => void
  onSubmitPhoneChange: () => void
}

export function AccountSection(props: AccountSectionProps) {
  return (
    <>
      <ProfileForm values={props.profile} />
      <PasswordForm
        values={props.password}
        phone={props.phone}
        isPending={props.isPasswordPending}
        isCancelling={props.isCancelPending}
        onChange={props.onPasswordChange}
        onSubmit={props.onSubmitPassword}
        onCancelAccount={props.onCancelAccount}
      />
      <PhoneChangeForm
        values={props.phoneChange}
        isCodePending={props.isPhoneCodePending}
        isPending={props.isPhoneChangePending}
        onChange={props.onPhoneChange}
        onRequestCode={props.onRequestPhoneCode}
        onSubmit={props.onSubmitPhoneChange}
      />
    </>
  )
}
