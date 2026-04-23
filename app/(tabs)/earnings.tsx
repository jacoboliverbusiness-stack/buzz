import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';

// Placeholder — replace with Supabase realtime + TanStack Query
const MOCK_SUBMISSIONS = [
  {
    id: '1',
    campaign: 'Red Bull Summer Slam',
    platform: 'tiktok',
    view_count: 12400,
    earnings_amount: 24.80,
    status: 'approved',
    submitted_at: '2026-04-20',
  },
  {
    id: '2',
    campaign: 'Nike Air Max Relaunch',
    platform: 'instagram',
    view_count: 8200,
    earnings_amount: 20.50,
    status: 'pending',
    submitted_at: '2026-04-21',
  },
  {
    id: '3',
    campaign: 'Spotify Discover Weekly',
    platform: 'tiktok',
    view_count: 3100,
    earnings_amount: 4.65,
    status: 'approved',
    submitted_at: '2026-04-18',
  },
];

const statusColor: Record<string, string> = {
  approved: 'text-green-400',
  pending: 'text-buzz-yellow',
  rejected: 'text-red-400',
  paid: 'text-green-400',
};

const platformEmoji: Record<string, string> = {
  tiktok: '🎵',
  instagram: '📸',
};

const totalEarned = MOCK_SUBMISSIONS.reduce((sum, s) => sum + s.earnings_amount, 0);
const pending = MOCK_SUBMISSIONS
  .filter((s) => s.status === 'pending')
  .reduce((sum, s) => sum + s.earnings_amount, 0);
const available = MOCK_SUBMISSIONS
  .filter((s) => s.status === 'approved')
  .reduce((sum, s) => sum + s.earnings_amount, 0);

export default function EarningsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-10">

          {/* Header */}
          <Text className="text-honey-white text-3xl font-black mb-6">
            {STRINGS.earnings.title}
          </Text>

          {/* Earnings Summary */}
          <Card className="p-6 mb-4" variant="elevated">
            <Text className="text-muted text-sm mb-1">{STRINGS.earnings.totalEarned}</Text>
            <Text className="text-honey-white text-5xl font-black tracking-tight mb-6">
              ${totalEarned.toFixed(2)}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-hive-black rounded-xl p-3">
                <Text className="text-muted text-xs mb-1">{STRINGS.earnings.pending}</Text>
                <Text className="text-buzz-yellow font-bold text-lg">${pending.toFixed(2)}</Text>
              </View>
              <View className="flex-1 bg-hive-black rounded-xl p-3">
                <Text className="text-muted text-xs mb-1">{STRINGS.earnings.available}</Text>
                <Text className="text-green-400 font-bold text-lg">${available.toFixed(2)}</Text>
              </View>
            </View>
          </Card>

          {/* Withdraw CTA */}
          <Button
            label={`${STRINGS.earnings.withdraw} $${available.toFixed(2)}`}
            size="lg"
            disabled={available < 5}
            onPress={() => {
              // TODO: wire up Stripe Connect payout flow
            }}
            className="mb-8"
          />

          {/* Submission History */}
          <Text className="text-honey-white text-lg font-bold mb-4">
            {STRINGS.earnings.history}
          </Text>

          {MOCK_SUBMISSIONS.length === 0 ? (
            <View className="items-center py-10">
              <Text className="text-muted">{STRINGS.earnings.noSubmissions}</Text>
            </View>
          ) : (
            <View className="gap-3">
              {MOCK_SUBMISSIONS.map((sub) => (
                <Card key={sub.id} className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-4">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text>{platformEmoji[sub.platform]}</Text>
                        <Text className="text-honey-white font-semibold text-sm" numberOfLines={1}>
                          {sub.campaign}
                        </Text>
                      </View>
                      <Text className="text-muted text-xs">
                        {sub.view_count.toLocaleString()} {STRINGS.earnings.views} · {sub.submitted_at}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-honey-white font-bold">
                        +${sub.earnings_amount.toFixed(2)}
                      </Text>
                      <Text className={`text-xs font-medium capitalize mt-0.5 ${statusColor[sub.status]}`}>
                        {sub.status}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
