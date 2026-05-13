import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { Tier } from '@/types';

const TIER_THRESHOLDS: Record<Tier, number> = {
  worker: 100,
  drone: 500,
  queen: Infinity,
};

const TIER_NEXT: Partial<Record<Tier, Tier>> = {
  worker: 'drone',
  drone: 'queen',
};

function tierProgress(tier: Tier, totalEarned: number): { current: number; target: number } | null {
  const next = TIER_NEXT[tier];
  if (!next) return null;
  const start = tier === 'worker' ? 0 : TIER_THRESHOLDS.worker;
  const end = TIER_THRESHOLDS[tier];
  return { current: totalEarned - start, target: end - start };
}

function HexBadge({ tier }: { tier: Tier }) {
  const label = STRINGS.profile.tiers[tier];
  const color =
    tier === 'queen' ? '#FFD60A' : tier === 'drone' ? '#FEFCF3' : '#666666';
  return (
    <View
      className="items-center justify-center px-4 py-2 border-2 rounded-xl"
      style={{ borderColor: color }}
    >
      <Text className="font-black text-xs tracking-widest" style={{ color }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center justify-between py-4 border-b border-white/5 active:opacity-60"
      onPress={onPress}
    >
      <Text className="text-honey-white font-medium">{label}</Text>
      <View className="flex-row items-center gap-2">
        {value ? <Text className="text-muted text-sm">{value}</Text> : null}
        <Text className="text-muted text-base">›</Text>
      </View>
    </Pressable>
  );
}

// Placeholder profile — replace with real Supabase query
const MOCK_PROFILE = {
  tier: 'worker' as Tier,
  total_earned: 82.48,
  total_views: 38200,
  campaigns_completed: 3,
  tiktok_handle: null as string | null,
  instagram_handle: null as string | null,
  youtube_handle: null as string | null,
  stripe_connect_id: null as string | null,
};

export default function ProfileScreen() {
  const { session, signOut } = useAuthStore();

  const progress = tierProgress(MOCK_PROFILE.tier, MOCK_PROFILE.total_earned);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-10">

          <Text className="text-honey-white text-3xl font-black mb-8">
            {STRINGS.profile.title}
          </Text>

          {/* Avatar + tier */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-2xl bg-surface-2 border border-white/10 items-center justify-center mb-3">
              <Text className="text-buzz-yellow font-black text-3xl">B</Text>
            </View>
            <Text className="text-honey-white font-bold text-lg mb-1">
              {session?.user.phone ?? session?.user.email ?? 'Bee'}
            </Text>
            <HexBadge tier={MOCK_PROFILE.tier} />
          </View>

          {/* Tier progress */}
          {progress && (
            <Card className="p-4 mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-muted text-sm">
                  ${(progress.target - progress.current).toFixed(2)} {STRINGS.profile.tierProgress}
                </Text>
                <Text className="text-buzz-yellow font-bold text-sm capitalize">
                  {TIER_NEXT[MOCK_PROFILE.tier]}
                </Text>
              </View>
              <View className="h-1.5 bg-hive-black rounded-full overflow-hidden">
                <View
                  className="h-full bg-buzz-yellow rounded-full"
                  style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
                />
              </View>
              <Text className="text-muted text-xs mt-2">
                ${progress.current.toFixed(2)} / ${progress.target.toFixed(2)}
              </Text>
            </Card>
          )}

          {/* Stats */}
          <View className="flex-row gap-3 mb-6">
            <Card className="flex-1 p-4 items-center">
              <Text className="text-buzz-yellow font-black text-2xl">
                ${MOCK_PROFILE.total_earned.toFixed(0)}
              </Text>
              <Text className="text-muted text-xs mt-1">{STRINGS.profile.totalEarned}</Text>
            </Card>
            <Card className="flex-1 p-4 items-center">
              <Text className="text-honey-white font-black text-2xl">
                {(MOCK_PROFILE.total_views / 1000).toFixed(1)}k
              </Text>
              <Text className="text-muted text-xs mt-1">{STRINGS.profile.totalViews}</Text>
            </Card>
            <Card className="flex-1 p-4 items-center">
              <Text className="text-honey-white font-black text-2xl">
                {MOCK_PROFILE.campaigns_completed}
              </Text>
              <Text className="text-muted text-xs mt-1">{STRINGS.profile.campaigns}</Text>
            </Card>
          </View>

          {/* Linked accounts */}
          <Text className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">
            {STRINGS.profile.linkedAccounts}
          </Text>
          <Card className="px-5 mb-6">
            <SettingsRow
              label={STRINGS.profile.tiktok}
              value={MOCK_PROFILE.tiktok_handle ?? 'Not connected'}
              onPress={() => {}}
            />
            <SettingsRow
              label={STRINGS.profile.instagram}
              value={MOCK_PROFILE.instagram_handle ?? 'Not connected'}
              onPress={() => {}}
            />
            <SettingsRow
              label={STRINGS.profile.youtube}
              value={MOCK_PROFILE.youtube_handle ?? 'Not connected'}
              onPress={() => {}}
            />
          </Card>

          {/* Payout settings */}
          <Text className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">
            {STRINGS.profile.payouts}
          </Text>
          <Card className="px-5 mb-8">
            <SettingsRow
              label={
                MOCK_PROFILE.stripe_connect_id
                  ? STRINGS.profile.stripeConnected
                  : STRINGS.profile.setupStripe
              }
              value={MOCK_PROFILE.stripe_connect_id ? 'Connected' : 'Not set up'}
              onPress={() => {}}
            />
            <SettingsRow
              label={STRINGS.profile.payoutHistory}
              onPress={() => {}}
            />
          </Card>

          <Button
            label={STRINGS.profile.signOut}
            variant="secondary"
            size="lg"
            onPress={handleSignOut}
          />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
