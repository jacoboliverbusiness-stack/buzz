import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  focused,
  icon,
  iconFocused,
  label,
}: {
  focused: boolean;
  icon: IoniconName;
  iconFocused: IoniconName;
  label: string;
}) {
  return (
    <View className="items-center gap-0.5 pt-1">
      <Ionicons
        name={focused ? iconFocused : icon}
        size={22}
        color={focused ? '#FFD60A' : '#666666'}
      />
      <Text className={`text-xs font-semibold ${focused ? 'text-buzz-yellow' : 'text-muted'}`}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#141414',
          borderTopColor: '#1E1E1E',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="home-outline" iconFocused="home" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon="layers-outline"
              iconFocused="layers"
              label="Buzz"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon="person-outline"
              iconFocused="person"
              label="Profile"
            />
          ),
        }}
      />
    </Tabs>
  );
}
