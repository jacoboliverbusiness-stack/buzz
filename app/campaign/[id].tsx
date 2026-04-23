import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';

// Placeholder — will be fetched by ID from Supabase
const MOCK_CAMPAIGN = {
  id: '1',
  brand: 'Red Bull',
  title: 'Red Bull Summer Slam',
  brief:
    'We want authentic, high-energy clips from our Summer Slam event. Show the crowd, the athletes, the energy. Short clips (15–30s) that feel native to TikTok perform best. Be creative — the top 10 earning clips each week get a $50 bonus.',
  cpm_rate: 2.00,
  budget_remaining: 4800,
  max_payout_per_clip: 150,
  ends_at: '2026-05-01',
  category: '🎯 Sports',
  dos: ['Keep it under 30 seconds', 'Show real energy and crowd', 'Add trending audio'],
  donts: ["Don't mention competitors", "No explicit content", "Don't use copyrighted music"],
};

function daysLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      {/* Back Button */}
      <Pressable
        className="px-6 pt-4 pb-2 flex-row items-center gap-2"
        onPress={() => router.back()}
      >
        <Text className="text-buzz-yellow text-2xl">←</Text>
        <Text className="text-buzz-yellow font-semibold">{STRINGS.campaigns.title}</Text>
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-2 pb-10">

          {/* Brand + Category */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-10 h-10 rounded-full bg-buzz-yellow items-center justify-center">
              <Text className="text-hive-black font-black">{MOCK_CAMPAIGN.brand[0]}</Text>
            </View>
            <View>
              <Text className="text-honey-white font-semibold">{MOCK_CAMPAIGN.brand}</Text>
              <Text className="text-muted text-xs">{MOCK_CAMPAIGN.category}</Text>
            </View>
          </View>

          {/* Title */}
          <Text className="text-honey-white text-3xl font-black leading-tight mb-6">
            {MOCK_CAMPAIGN.title}
          </Text>

          {/* Stats */}
          <View className="flex-row gap-3 mb-6">
            <Card className="flex-1 p-4 items-center">
              <Text className="text-buzz-yellow font-black text-2xl">
                ${MOCK_CAMPAIGN.cpm_rate.toFixed(2)}
              </Text>
              <Text className="text-muted text-xs mt-1">{STRINGS.campaigns.cpm}</Text>
            </Card>
            <Card className="flex-1 p-4 items-center">
              <Text className="text-honey-white font-black text-2xl">
                ${(MOCK_CAMPAIGN.budget_remaining / 1000).toFixed(1)}k
              </Text>
              <Text className="text-muted text-xs mt-1">{STRINGS.campaigns.budgetLeft}</Text>
            </Card>
            <Card className="flex-1 p-4 items-center">
              <Text className="text-honey-white font-black text-2xl">
                {daysLeft(MOCK_CAMPAIGN.ends_at)}d
              </Text>
              <Text className="text-muted text-xs mt-1">{STRINGS.campaigns.timeLeft}</Text>
            </Card>
          </View>

          {/* Max Payout */}
          <Card className="p-4 mb-6 flex-row items-center justify-between">
            <Text className="text-muted text-sm">Max payout per clip</Text>
            <Text className="text-honey-white font-bold text-lg">
              ${MOCK_CAMPAIGN.max_payout_per_clip}
            </Text>
          </Card>

          {/* Brief */}
          <View className="mb-6">
            <Text className="text-honey-white font-bold text-lg mb-3">The Brief</Text>
            <Text className="text-muted text-sm leading-relaxed">{MOCK_CAMPAIGN.brief}</Text>
          </View>

          {/* Do's & Don'ts */}
          <View className="flex-row gap-3 mb-8">
            <Card className="flex-1 p-4">
              <Text className="text-green-400 font-bold mb-3">✓ Do</Text>
              {MOCK_CAMPAIGN.dos.map((item, i) => (
                <Text key={i} className="text-muted text-xs leading-relaxed mb-1">
                  · {item}
                </Text>
              ))}
            </Card>
            <Card className="flex-1 p-4">
              <Text className="text-red-400 font-bold mb-3">✗ Don't</Text>
              {MOCK_CAMPAIGN.donts.map((item, i) => (
                <Text key={i} className="text-muted text-xs leading-relaxed mb-1">
                  · {item}
                </Text>
              ))}
            </Card>
          </View>

          {/* CTA */}
          <Button
            label={STRINGS.campaigns.clip}
            size="lg"
            onPress={() => {
              // TODO: navigate to clipping flow with campaign id
              router.push({
                pathname: '/clipping/[id]',
                params: { id: MOCK_CAMPAIGN.id },
              });
            }}
          />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
