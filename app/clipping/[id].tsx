import { View, Text, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';

type ClippingStep = 'generating' | 'select' | 'done';

// Placeholder clips — will come from Vizard API via Edge Function
const MOCK_CLIPS = [
  { id: 'c1', thumbnail: '🎬', duration: '0:18', label: 'Clip 1 — Crowd Reaction' },
  { id: 'c2', thumbnail: '🎬', duration: '0:24', label: 'Clip 2 — Main Drop' },
  { id: 'c3', thumbnail: '🎬', duration: '0:15', label: 'Clip 3 — Athlete POV' },
  { id: 'c4', thumbnail: '🎬', duration: '0:29', label: 'Clip 4 — Highlights Reel' },
  { id: 'c5', thumbnail: '🎬', duration: '0:12', label: 'Clip 5 — BTS Moment' },
];

export default function ClippingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [step, setStep] = useState<ClippingStep>('generating');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Simulate AI generation — replace with real Vizard API call via Edge Function
  useState(() => {
    const timer = setTimeout(() => setStep('select'), 3000);
    return () => clearTimeout(timer);
  });

  const toggleClip = async (clipId: string) => {
    await Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(clipId) ? next.delete(clipId) : next.add(clipId);
      return next;
    });
  };

  if (step === 'generating') {
    return (
      <SafeAreaView className="flex-1 bg-hive-black items-center justify-center px-6">
        <ActivityIndicator size="large" color="#FFD60A" />
        <Text className="text-honey-white text-2xl font-bold mt-8 text-center">
          {STRINGS.clipping.generating}
        </Text>
        <Text className="text-muted text-base mt-3 text-center">
          {STRINGS.clipping.generatingSubtitle}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <Pressable
        className="px-6 pt-4 pb-2 flex-row items-center gap-2"
        onPress={() => router.back()}
      >
        <Text className="text-buzz-yellow text-2xl">←</Text>
        <Text className="text-buzz-yellow font-semibold">Back</Text>
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-2 pb-10">
          <Text className="text-honey-white text-2xl font-black mb-1">
            {STRINGS.clipping.selectClips}
          </Text>
          <Text className="text-muted text-sm mb-6">{STRINGS.clipping.selectHint}</Text>

          <View className="gap-3 mb-8">
            {MOCK_CLIPS.map((clip) => {
              const isSelected = selected.has(clip.id);
              return (
                <Pressable key={clip.id} onPress={() => toggleClip(clip.id)}>
                  <Card
                    className={`p-4 flex-row items-center gap-4 ${isSelected ? 'border-buzz-yellow/60' : ''}`}
                    variant="elevated"
                  >
                    {/* Thumbnail placeholder */}
                    <View className="w-16 h-16 rounded-xl bg-hive-black items-center justify-center">
                      <Text className="text-3xl">{clip.thumbnail}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-honey-white font-semibold">{clip.label}</Text>
                      <Text className="text-muted text-xs mt-1">{clip.duration}</Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isSelected ? 'bg-buzz-yellow border-buzz-yellow' : 'border-white/20'
                      }`}
                    >
                      {isSelected && <Text className="text-hive-black font-black text-xs">✓</Text>}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <Button
            label={
              selected.size === 0
                ? 'Select clips to continue'
                : `Post ${selected.size} clip${selected.size > 1 ? 's' : ''}`
            }
            size="lg"
            disabled={selected.size === 0}
            onPress={() => {
              // TODO: trigger download/share to TikTok, then go to submit
              router.push({ pathname: '/submit/[id]', params: { id } });
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
