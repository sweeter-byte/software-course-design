import type { ReactElement } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  ResetPassword: undefined
}

type AuthStackProps = {
  renderLogin: () => ReactElement
  renderRegister: () => ReactElement
  renderResetPassword: () => ReactElement
}

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthStack({
  renderLogin,
  renderRegister,
  renderResetPassword,
}: AuthStackProps) {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">{() => renderLogin()}</Stack.Screen>
      <Stack.Screen name="Register">{() => renderRegister()}</Stack.Screen>
      <Stack.Screen name="ResetPassword">{() => renderResetPassword()}</Stack.Screen>
    </Stack.Navigator>
  )
}
