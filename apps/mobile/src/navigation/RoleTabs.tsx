import type { ReactElement } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import type { UserRole } from '../domain'
import { getInitialTabForRole, getRoleTabs, type RoleTabRouteName } from './navigation-model'

export type RoleTabParamList = {
  Dashboard: undefined
  Courses: undefined
  Assignments: undefined
  TeacherTasks: undefined
  OfficerUsers: undefined
  OfficerFeedbacks: undefined
  Account: undefined
}

type RoleTabsProps = {
  role: UserRole
  renderScreens: Record<RoleTabRouteName, () => ReactElement>
}

const Tab = createBottomTabNavigator<RoleTabParamList>()

export function RoleTabs({ role, renderScreens }: RoleTabsProps) {
  return (
    <Tab.Navigator
      initialRouteName={getInitialTabForRole(role)}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#005bac',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarStyle: {
          borderTopColor: '#d9e2ef',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      {getRoleTabs(role).map((item) => (
        <Tab.Screen
          key={item.routeName}
          name={item.routeName}
          options={{ tabBarLabel: item.label, title: item.label }}
        >
          {() => renderScreens[item.routeName]()}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  )
}
