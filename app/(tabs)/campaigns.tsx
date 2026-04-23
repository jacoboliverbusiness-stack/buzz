import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { STRINGS } from '@/strings';

// Placeholder data — replace with TanStack Query + Supabase
const MOCK_CAMPAIGNS = [
  {
    id: '1',
    brand: 'Red Bull',
    title: 'Red Bull Summer Slam',
    brief: 'Clip the most hype moments from our summer event.',
    cpm_rate: 2.00,
    budget_remaining: 4800,
    ends_at: '2026-05-01',
    status: 'active',
    category: '🎯 Sports',
  },
  {
    id: '2',
    brand: 'Nike',
    title: 'Air Max Relaunch',
    brief: 'Show off the new colorways in a creative unboxing or styling clip.',
    cpm_rate: 2.50,
    budget_remaining: 12000,
    ends_at: '2026-04-30',
    status: 'active',
    category: '👟 Fashion',
  },
  {
    id: '3',
    brand: 'Spotify',
    title: 'Discover Weekly Hype',
    brief: 'React to your Discover Weekly in an authentic, unfiltered way.',
    cpm_rate: 1.50,
    budget_remaining: 2100,
    ends_at: '2026-04-28',
    status: 'active',
    category: '🎵 Music',
  },
];

function daysLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function CampaignsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-10">

          {/* Header */}
          <Text className="text-honey-white text-3xl font-black mb-2">
            {STRINGS.campaigns.title}
          </Text>
          <Text className="text-muted text-sm mb-6">
            {MOCK_CAMPAIGNS.length} active campaigns
          </Text>

          {/* Campaign List */}
          {MOCK_CAMPAIGNS.length === 0 ? (
            <View className="items-center py-20">
              <Text className="text-honey-white text-lg font-semibold">
                {STRINGS.campaigns.noCampaigns}
              </Text>
              <Text className="text-muted text-sm mt-2 text-center">
                {STRINGS.campaigns.noCampaignsSubtitle}
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {MOCK_CAMPAIGNS.map((campaign) => (
                <Pressable
                  key={campaign.id}
                  onPress={() =>
                    router.push({
                      pathname: '/campaign/[id]',
                      params: { id: campaign.id },
                    })
                  }
                  className="active:opacity-80"
                >
                  <Card className="p-5" variant="elevated">
                    {/* Brand + Category */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-full bg-buzz-yellow items-center justify-center">
                          <Text className="text-hive-black font-black text-xs">
                            {campaign.brand[0]}
                          </Text>
                        </View>
                        <Text className="text-muted text-sm font-medium">{campaign.brand}</Text>
                      </View>
                      <Text className="text-xs text-muted">{campaign.category}</Text>
                    </View>

                    {/* Title */}
                    <Text className="text-honey-white font-bold text-lg mb-1">
                      {campaign.title}
                    </Text>
                    <Text className="text-muted text-sm leading-relaxed mb-4" numberOfLines={2}>
                      {campaign.brief}
                    </Text>

                    {/* Stats Row */}
                    <View className="flex-row items-center gap-4">
                      <View className="flex-1 bg-hive-black rounded-xl px-3 py-2">
                        <Text className="text-buzz-yellow font-black text-lg">
                          ${campaign.cpm_rate.toFixed(2)}
                        </Text>
                        <Text className="text-muted text-xs">{STRINGS.campaigns.cpm}</Text>
                      </View>
                      <View className="flex-1 bg-hive-black rounded-xl px-3 py-2">
                        <Text className="text-honey-white font-bold text-lg">
                          ${(campaign.budget_remaining / 1000).toFixed(1)}k
                        </Text>
                        <Text className="text-muted text-xs">{STRINGS.campaigns.budgetLeft}</Text>
                      </View>
                      <View className="flex-1 bg-hive-black rounded-xl px-3 py-2">
                        <Text className="text-honey-white font-bold text-lg">
                          {daysLeft(campaign.ends_at)}d
                        </Text>
                        <Text className="text-muted text-xs">{STRINGS.campaigns.timeLeft}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
