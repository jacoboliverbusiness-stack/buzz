import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import type { Hive, HiveContentType } from '@/types';

// Same mock data as home — replace both with a shared data layer / TanStack Query
const MOCK_HIVES: Record<string, Hive> = {
  '1': {
    id: '1',
    name: 'Cluely',
    tagline: 'The AI that never lies.',
    logo_url: null,
    app_store_url: 'https://apps.apple.com',
    play_store_url: null,
    is_verified: true,
    created_at: '',
    content_types: [
      { id: 'ct1', hive_id: '1', type: 'talking_head', label: 'Talking Head', base_payout: 20, cpm_rate: 1.5, min_views: 0, max_payout: 200, is_active: true },
      { id: 'ct2', hive_id: '1', type: 'skit', label: 'Skit', base_payout: 10, cpm_rate: 1.5, min_views: 0, max_payout: 150, is_active: true },
      { id: 'ct3', hive_id: '1', type: 'demo', label: 'App Demo', base_payout: 15, cpm_rate: 1.0, min_views: 0, max_payout: 100, is_active: true },
    ],
  },
  '2': {
    id: '2',
    name: 'ReGen',
    tagline: 'Daily health, optimized.',
    logo_url: null,
    app_store_url: 'https://apps.apple.com',
    play_store_url: null,
    is_verified: true,
    created_at: '',
    content_types: [
      { id: 'ct4', hive_id: '2', type: 'talking_head', label: 'Talking Head', base_payout: 15, cpm_rate: 1.5, min_views: 0, max_payout: 150, is_active: true },
      { id: 'ct5', hive_id: '2', type: 'pov', label: 'POV / Discovery', base_payout: 0, cpm_rate: 2.0, min_views: 5000, max_payout: 300, is_active: true },
    ],
  },
  '3': {
    id: '3',
    name: 'Areum',
    tagline: 'Skincare, personalized.',
    logo_url: null,
    app_store_url: 'https://apps.apple.com',
    play_store_url: null,
    is_verified: false,
    created_at: '',
    content_types: [
      { id: 'ct6', hive_id: '3', type: 'slideshow', label: 'Slideshow', base_payout: 0, cpm_rate: 1.75, min_views: 3000, max_payout: 200, is_active: true },
      { id: 'ct7', hive_id: '3', type: 'talking_head', label: 'Talking Head', base_payout: 25, cpm_rate: 1.5, min_views: 0, max_payout: 250, is_active: true },
    ],
  },
  '4': {
    id: '4',
    name: 'Roy Lee',
    tagline: 'Watch the best clips, daily.',
    logo_url: null,
    app_store_url: 'https://apps.apple.com',
    play_store_url: null,
    is_verified: true,
    created_at: '',
    content_types: [
      { id: 'ct8', hive_id: '4', type: 'clipping', label: 'Clipping', base_payout: 0, cpm_rate: 1.5, min_views: 1000, max_payout: 500, is_active: true },
    ],
  },
};

const HIVE_ABOUT: Record<string, string> = {
  '1': 'Cluely is an AI assistant that gives you real-time answers during any call or meeting — without anyone knowing. Used by thousands of students, salespeople, and founders.',
  '2': 'ReGen tracks your sleep, stress, and activity to give you a personalized daily health protocol. Over 200,000 users optimizing their recovery.',
  '3': 'Areum builds custom skincare routines using your skin type, environment, and goals. Backed by dermatologists.',
  '4': 'Roy Lee curates the best viral clips across every category — daily. 5M+ subscribers across platforms.',
};

const HIVE_RULES: Record<string, string[]> = {
  '1': [
    'NO BOTTING — Do not artificially inflate view counts.',
    'SHOW THE PRODUCT — The app must be visible in your content.',
    'NO COMPETITORS — Do not mention or show competing products.',
    'ORIGINAL CONTENT — Reposted or recycled content will be rejected.',
    'MINIMUM QUALITY — Clear audio, stable video, your face on screen.',
  ],
  '2': [
    'NO BOTTING — Do not artificially inflate view counts.',
    'AUTHENTIC REVIEW — Share your genuine experience with the app.',
    'SHOW THE APP — Screen time with the ReGen UI required.',
    'MINIMUM QUALITY — Clear audio, stable video, vertical format.',
  ],
  '3': [
    'NO BOTTING — Do not artificially inflate view counts.',
    'PRODUCT FOCUS — Feature Areum prominently in the content.',
    'MINIMUM VIEWS — Slideshow: 3,000 views required to qualify.',
    'ORIGINAL CONTENT — Do not reuse existing posts.',
  ],
  '4': [
    'NO BOTTING — Do not artificially inflate view counts.',
    'CLIP SOURCE — Must clip from Roy Lee\'s official channels only.',
    'MINIMUM VIEWS — 1,000 views required to earn payouts.',
    'ATTRIBUTION — Tag @roylee in your post description.',
  ],
};

function EarningsCard({ ct }: { ct: HiveContentType }) {
  const hasBa = ct.base_payout > 0;

  return (
    <Card className="flex-1 p-4 min-w-[44%]" variant="elevated">
      <View className="bg-hive-black rounded-lg px-2 py-1 self-start mb-3">
        <Text className="text-buzz-yellow font-black text-xs tracking-widest">
          {ct.label.toUpperCase()}
        </Text>
      </View>

      {hasBa ? (
        <>
          <Text className="text-honey-white font-black text-2xl">${ct.base_payout}</Text>
          <Text className="text-muted text-xs">{STRINGS.hive.baseLabel}</Text>
          <View className="flex-row items-baseline gap-1 mt-2">
            <Text className="text-buzz-yellow font-bold text-lg">+${ct.cpm_rate}</Text>
            <Text className="text-muted text-xs">{STRINGS.hive.perThousand}</Text>
          </View>
        </>
      ) : (
        <>
          <Text className="text-buzz-yellow font-black text-2xl">${ct.cpm_rate}</Text>
          <Text className="text-muted text-xs">{STRINGS.hive.perThousand}</Text>
          {ct.min_views > 0 && (
            <Text className="text-muted text-xs mt-2">
              {ct.min_views.toLocaleString()} {STRINGS.hive.viewMin}
            </Text>
          )}
        </>
      )}

      {ct.max_payout > 0 && (
        <Text className="text-muted text-xs mt-2">
          Max ${ct.max_payout}
        </Text>
      )}
    </Card>
  );
}

export default function HiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hive = MOCK_HIVES[id ?? ''];

  if (!hive) {
    return (
      <SafeAreaView className="flex-1 bg-hive-black items-center justify-center px-6">
        <Text className="text-honey-white font-bold text-lg">Hive not found.</Text>
        <Button label="Go back" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const rules = HIVE_RULES[hive.id] ?? [];
  const about = HIVE_ABOUT[hive.id] ?? '';

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      {/* Sticky Download bar */}
      <View className="px-6 pt-4 pb-3 flex-row items-center justify-between border-b border-white/5">
        <Pressable
          className="flex-row items-center gap-2 active:opacity-70"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFD60A" />
          <Text className="text-buzz-yellow font-semibold">Hives</Text>
        </Pressable>
        <Button
          label={STRINGS.hive.download}
          size="sm"
          variant="secondary"
          onPress={() => {}}
        />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-32">

          {/* Brand header */}
          <View className="flex-row items-center gap-4 mb-6">
            <View className="w-14 h-14 rounded-2xl bg-surface-2 border border-white/10 items-center justify-center">
              <Text className="text-buzz-yellow font-black text-2xl">{hive.name[0]}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-honey-white font-black text-2xl">{hive.name}</Text>
                {hive.is_verified && (
                  <View className="bg-buzz-yellow rounded-full px-2 py-0.5">
                    <Text className="text-hive-black font-black text-xs">{STRINGS.hive.verified}</Text>
                  </View>
                )}
              </View>
              <Text className="text-muted text-sm mt-0.5">{hive.tagline}</Text>
            </View>
          </View>

          {/* About */}
          {about.length > 0 && (
            <View className="mb-8">
              <Text className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">
                {STRINGS.hive.about}
              </Text>
              <Text className="text-muted text-sm leading-relaxed">{about}</Text>
            </View>
          )}

          {/* Earnings cards — the hero element */}
          <Text className="text-honey-white font-bold text-lg mb-3">{STRINGS.hive.earnings}</Text>
          <View className="flex-row flex-wrap gap-3 mb-8">
            {hive.content_types.map((ct) => (
              <EarningsCard key={ct.id} ct={ct} />
            ))}
          </View>

          {/* Rules */}
          {rules.length > 0 && (
            <View className="mb-8">
              <Text className="text-honey-white font-bold text-lg mb-3">
                {STRINGS.hive.rules}
              </Text>
              <View className="gap-3">
                {rules.map((rule) => {
                  const [header, ...rest] = rule.split(' — ');
                  return (
                    <View key={rule} className="border-b border-white/5 pb-3">
                      <Text className="text-honey-white font-bold text-xs tracking-widest mb-1">
                        {header}
                      </Text>
                      <Text className="text-muted text-sm leading-relaxed">
                        {rest.join(' — ')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Sticky Submit CTA */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 bg-hive-black border-t border-white/5">
        <Button
          label={STRINGS.hive.submit}
          size="lg"
          onPress={() =>
            router.push({ pathname: '/submit/[id]', params: { id: hive.id } })
          }
        />
      </View>
    </SafeAreaView>
  );
}
