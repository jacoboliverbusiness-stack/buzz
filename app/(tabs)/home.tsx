import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import { useAuthStore } from '@/store/useAuthStore';

// Placeholder data — replace with real TanStack Query hooks
const MOCK_STATS = {
  lifetime: 247.83,
  pending: 18.40,
  available: 229.43,
};

const MOCK_ACTIVITY = [
  { id: '1', campaign: 'Red Bull Summer', views: 12400, earnings: 24.80, status: 'approved' },
  { id: '2', campaign: 'Nike Air Max', views: 8200, earnings: 16.40, status: 'pending' },
  { id: '3', campaign: 'Spotify Wrapped', views: 3100, earnings: 6.20, status: 'approved' },
];

const statusColor: Record<string, string> = {
  approved: 'text-green-400',
  pending: 'text-buzz-yellow',
  rejected: 'text-red-400',
  paid: 'text-green-400',
};

export default function HomeScreen() {
  const { session } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-10">

          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-muted text-sm font-medium">
                {STRINGS.home.greeting}
              </Text>
              <Text className="text-honey-white text-2xl font-bold">
                {session?.user.phone ?? 'Clipper'}
              </Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-buzz-yellow items-center justify-center">
              <Text className="text-hive-black font-black text-base">B</Text>
            </View>
          </View>

          {/* Earnings Hero */}
          <Card className="p-6 mb-6" variant="elevated">
            <Text className="text-muted text-sm font-medium mb-1">
              {STRINGS.home.lifetimeEarnings}
            </Text>
            <Text className="text-honey-white text-5xl font-black tracking-tight mb-6">
              ${MOCK_STATS.lifetime.toFixed(2)}
            </Text>
            <View className="flex-row gap-4">
              <View className="flex-1 bg-hive-black rounded-xl p-3">
                <Text className="text-muted text-xs font-medium mb-1">
                  {STRINGS.home.pendingEarnings}
                </Text>
                <Text className="text-buzz-yellow text-lg font-bold">
                  ${MOCK_STATS.pending.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 bg-hive-black rounded-xl p-3">
                <Text className="text-muted text-xs font-medium mb-1">
                  {STRINGS.home.available}
                </Text>
                <Text className="text-green-400 text-lg font-bold">
                  ${MOCK_STATS.available.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>

          {/* CTA */}
          <Button
            label={STRINGS.home.startClipping}
            size="lg"
            onPress={() => router.push('/(tabs)/campaigns')}
            className="mb-8"
          />

          {/* Recent Activity */}
          <View>
            <Text className="text-honey-white text-lg font-bold mb-4">
              {STRINGS.home.recentActivity}
            </Text>
            {MOCK_ACTIVITY.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-muted text-base">{STRINGS.home.noActivity}</Text>
                <Text className="text-muted text-sm mt-1">{STRINGS.home.noActivityCta}</Text>
              </View>
            ) : (
              <View className="gap-3">
                {MOCK_ACTIVITY.map((item) => (
                  <Card key={item.id} className="p-4 flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-honey-white font-semibold text-sm">
                        {item.campaign}
                      </Text>
                      <Text className="text-muted text-xs mt-0.5">
                        {item.views.toLocaleString()} {STRINGS.earnings.views}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-honey-white font-bold">
                        +${item.earnings.toFixed(2)}
                      </Text>
                      <Text className={`text-xs font-medium capitalize mt-0.5 ${statusColor[item.status]}`}>
                        {item.status}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
