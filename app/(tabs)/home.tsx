import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { STRINGS } from '@/strings';
import type { Hive, HiveContentType } from '@/types';

const MOCK_HIVES: Hive[] = [
  {
    id: '1',
    name: 'Cluely',
    tagline: 'The AI that never lies.',
    logo_url: null,
    app_store_url: null,
    play_store_url: null,
    is_verified: true,
    created_at: '',
    content_types: [
      { id: 'ct1', hive_id: '1', type: 'talking_head', label: 'Talking Head', base_payout: 20, cpm_rate: 1.5, min_views: 0, max_payout: 200, is_active: true },
      { id: 'ct2', hive_id: '1', type: 'skit', label: 'Skit', base_payout: 10, cpm_rate: 1.5, min_views: 0, max_payout: 150, is_active: true },
      { id: 'ct3', hive_id: '1', type: 'demo', label: 'App Demo', base_payout: 15, cpm_rate: 1.0, min_views: 0, max_payout: 100, is_active: true },
    ],
  },
  {
    id: '2',
    name: 'ReGen',
    tagline: 'Daily health, optimized.',
    logo_url: null,
    app_store_url: null,
    play_store_url: null,
    is_verified: true,
    created_at: '',
    content_types: [
      { id: 'ct4', hive_id: '2', type: 'talking_head', label: 'Talking Head', base_payout: 15, cpm_rate: 1.5, min_views: 0, max_payout: 150, is_active: true },
      { id: 'ct5', hive_id: '2', type: 'pov', label: 'POV / Discovery', base_payout: 0, cpm_rate: 2.0, min_views: 5000, max_payout: 300, is_active: true },
    ],
  },
  {
    id: '3',
    name: 'Areum',
    tagline: 'Skincare, personalized.',
    logo_url: null,
    app_store_url: null,
    play_store_url: null,
    is_verified: false,
    created_at: '',
    content_types: [
      { id: 'ct6', hive_id: '3', type: 'slideshow', label: 'Slideshow', base_payout: 0, cpm_rate: 1.75, min_views: 3000, max_payout: 200, is_active: true },
      { id: 'ct7', hive_id: '3', type: 'talking_head', label: 'Talking Head', base_payout: 25, cpm_rate: 1.5, min_views: 0, max_payout: 250, is_active: true },
    ],
  },
  {
    id: '4',
    name: 'Roy Lee',
    tagline: 'Watch the best clips, daily.',
    logo_url: null,
    app_store_url: null,
    play_store_url: null,
    is_verified: true,
    created_at: '',
    content_types: [
      { id: 'ct8', hive_id: '4', type: 'clipping', label: 'Clipping', base_payout: 0, cpm_rate: 1.5, min_views: 1000, max_payout: 500, is_active: true },
    ],
  },
];

const INSPIRATION_ITEMS = [
  { label: 'TALKING HEAD', description: 'Face-to-camera review or reaction' },
  { label: 'SKIT', description: 'Short scripted scene featuring the app' },
  { label: 'APP DEMO', description: 'Screen recording walkthrough' },
  { label: 'SLIDESHOW', description: 'Photo sequence with voiceover' },
  { label: 'POV', description: 'Discovery-style first-person content' },
];

function topPayout(ct: HiveContentType): string {
  if (ct.base_payout > 0) {
    return `$${ct.base_payout} + $${ct.cpm_rate}/1k`;
  }
  return `$${ct.cpm_rate}/1k views`;
}

function bestRate(hive: Hive): string {
  if (hive.content_types.length === 0) return '—';
  const best = hive.content_types.reduce((a, b) =>
    (a.base_payout + a.cpm_rate) > (b.base_payout + b.cpm_rate) ? a : b
  );
  return topPayout(best);
}

function HiveCard({ hive }: { hive: Hive }) {
  return (
    <Pressable
      className="active:opacity-75"
      onPress={() => router.push({ pathname: '/hive/[id]', params: { id: hive.id } })}
      style={{ width: '48%' }}
    >
      <Card className="p-4" variant="elevated">
        {/* Logo placeholder */}
        <View className="w-10 h-10 rounded-xl bg-hive-black items-center justify-center mb-3">
          <Text className="text-buzz-yellow font-black text-base">{hive.name[0]}</Text>
        </View>

        <View className="flex-row items-center gap-1.5 mb-1">
          <Text className="text-honey-white font-bold text-base" numberOfLines={1}>
            {hive.name}
          </Text>
          {hive.is_verified && (
            <View className="w-4 h-4 rounded-full bg-buzz-yellow items-center justify-center">
              <Text className="text-hive-black font-black" style={{ fontSize: 8 }}>✓</Text>
            </View>
          )}
        </View>

        <Text className="text-muted text-xs mb-3" numberOfLines={1}>
          {hive.tagline}
        </Text>

        <Text className="text-buzz-yellow font-black text-sm">{bestRate(hive)}</Text>
        <Text className="text-muted text-xs mt-0.5">top rate</Text>
      </Card>
    </Pressable>
  );
}

export default function HomeScreen() {
  const MOCK_AVAILABLE = 229.43;
  const socialsLinked = false;

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
          <View className="bg-surface border border-white/10 rounded-full px-4 py-2">
            <Text className="text-buzz-yellow font-black text-sm">
              ${MOCK_AVAILABLE.toFixed(2)}
            </Text>
            <Text className="text-muted text-xs">{STRINGS.home.balanceLabel}</Text>
          </View>

          <Text className="text-honey-white font-black text-xl tracking-tight">Buzz</Text>

          <Pressable className="w-10 h-10 items-center justify-center rounded-full bg-surface border border-white/10">
            <Ionicons name="notifications-outline" size={20} color="#FEFCF3" />
          </Pressable>
        </View>

        <View className="px-6 pt-4 pb-10">

          {/* Connect socials banner */}
          {!socialsLinked && (
            <Pressable
              className="mb-6 bg-surface border border-buzz-yellow/20 rounded-2xl px-4 py-4 flex-row items-center justify-between active:opacity-70"
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text className="text-honey-white font-medium text-sm flex-1 mr-2">
                {STRINGS.home.addSocials}
              </Text>
              <Text className="text-buzz-yellow font-bold text-sm">
                {STRINGS.home.addSocialsAction} →
              </Text>
            </Pressable>
          )}

          {/* Hives */}
          <Text className="text-honey-white font-bold text-xl mb-4">{STRINGS.home.hives}</Text>

          {MOCK_HIVES.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-honey-white font-semibold">{STRINGS.home.noHives}</Text>
              <Text className="text-muted text-sm mt-1 text-center">
                {STRINGS.home.noHivesSubtitle}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-3 mb-10">
              {MOCK_HIVES.map((hive) => (
                <HiveCard key={hive.id} hive={hive} />
              ))}
            </View>
          )}

          {/* Inspiration */}
          <Text className="text-honey-white font-bold text-xl mb-4">
            {STRINGS.home.inspiration}
          </Text>

          <View className="gap-3">
            {INSPIRATION_ITEMS.map((item) => (
              <Card key={item.label} className="px-4 py-3 flex-row items-center justify-between">
                <View className="bg-hive-black rounded-lg px-2 py-1 mr-3">
                  <Text className="text-buzz-yellow font-black text-xs tracking-widest">
                    {item.label}
                  </Text>
                </View>
                <Text className="text-muted text-sm flex-1">{item.description}</Text>
              </Card>
            ))}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
