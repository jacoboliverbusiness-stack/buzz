import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View className="items-center gap-1 pt-1">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        className={`text-xs font-semibold ${focused ? 'text-buzz-yellow' : 'text-muted'}`}
      >
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
            <TabIcon focused={focused} emoji="⚡" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🎯" label="Earn" />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="💰" label="Earnings" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="👤" label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}
