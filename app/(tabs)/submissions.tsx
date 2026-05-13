import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import type { Submission } from '@/types';

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: '1',
    user_id: 'u1',
    hive_id: '1',
    content_type: 'talking_head',
    content_type_label: 'Talking Head',
    platform: 'tiktok',
    post_url: 'https://www.tiktok.com/@user/video/1',
    screenshot_url: null,
    view_count: 24800,
    last_verified_at: '2026-05-12',
    status: 'approved',
    earnings_amount: 57.20,
    submitted_at: '2026-05-10',
    hive: { id: '1', name: 'Cluely', logo_url: null },
  },
  {
    id: '2',
    user_id: 'u1',
    hive_id: '2',
    content_type: 'pov',
    content_type_label: 'POV / Discovery',
    platform: 'instagram',
    post_url: 'https://www.instagram.com/reel/abc',
    screenshot_url: null,
    view_count: 8100,
    last_verified_at: null,
    status: 'pending',
    earnings_amount: 16.20,
    submitted_at: '2026-05-11',
    hive: { id: '2', name: 'ReGen', logo_url: null },
  },
  {
    id: '3',
    user_id: 'u1',
    hive_id: '3',
    content_type: 'slideshow',
    content_type_label: 'Slideshow',
    platform: 'tiktok',
    post_url: 'https://www.tiktok.com/@user/video/2',
    screenshot_url: null,
    view_count: 5300,
    last_verified_at: '2026-05-09',
    status: 'paid',
    earnings_amount: 9.28,
    submitted_at: '2026-05-08',
    hive: { id: '3', name: 'Areum', logo_url: null },
  },
];

const STATUS_LABEL: Record<string, string> = {
  pending: STRINGS.submissions.statusPending,
  approved: STRINGS.submissions.statusApproved,
  rejected: STRINGS.submissions.statusRejected,
  paid: STRINGS.submissions.statusPaid,
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-buzz-yellow',
  approved: 'text-green-400',
  rejected: 'text-red-400',
  paid: 'text-green-400',
};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

const totalEarned = MOCK_SUBMISSIONS.reduce((s, sub) => s + sub.earnings_amount, 0);
const pendingAmount = MOCK_SUBMISSIONS
  .filter((s) => s.status === 'pending')
  .reduce((s, sub) => s + sub.earnings_amount, 0);

export default function SubmissionsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-10">

          <Text className="text-honey-white text-3xl font-black mb-6">
            {STRINGS.submissions.title}
          </Text>

          {/* Earnings summary */}
          {MOCK_SUBMISSIONS.length > 0 && (
            <Card className="p-5 mb-6 flex-row gap-4" variant="elevated">
              <View className="flex-1">
                <Text className="text-muted text-xs mb-1">Total Earned</Text>
                <Text className="text-honey-white font-black text-3xl tracking-tight">
                  ${totalEarned.toFixed(2)}
                </Text>
              </View>
              <View className="w-px bg-white/5" />
              <View className="flex-1">
                <Text className="text-muted text-xs mb-1">Pending</Text>
                <Text className="text-buzz-yellow font-black text-3xl tracking-tight">
                  ${pendingAmount.toFixed(2)}
                </Text>
              </View>
            </Card>
          )}

          {MOCK_SUBMISSIONS.length === 0 ? (
            <View className="items-center py-20">
              <Text className="text-honey-white font-semibold text-lg mb-2">
                {STRINGS.submissions.empty}
              </Text>
              <Button
                label="Browse Hives"
                variant="ghost"
                onPress={() => router.push('/(tabs)/home')}
              />
            </View>
          ) : (
            <View className="gap-3">
              {MOCK_SUBMISSIONS.map((sub) => (
                <Card key={sub.id} className="p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-4">
                      <Text className="text-honey-white font-bold text-sm">
                        {sub.hive?.name ?? '—'}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <View className="bg-hive-black rounded px-1.5 py-0.5">
                          <Text className="text-buzz-yellow font-bold text-xs tracking-widest">
                            {sub.content_type_label.toUpperCase()}
                          </Text>
                        </View>
                        <Text className="text-muted text-xs">
                          {PLATFORM_LABEL[sub.platform]}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-honey-white font-black text-lg">
                        +${sub.earnings_amount.toFixed(2)}
                      </Text>
                      <Text className={`text-xs font-semibold mt-0.5 ${STATUS_COLOR[sub.status]}`}>
                        {STATUS_LABEL[sub.status]}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-muted text-xs">
                    {sub.view_count.toLocaleString()} {STRINGS.submissions.views} · {sub.submitted_at}
                  </Text>
                </Card>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
