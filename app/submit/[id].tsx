import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import type { ContentTypeName } from '@/types';

interface ContentTypeOption {
  type: ContentTypeName;
  label: string;
  base_payout: number;
  cpm_rate: number;
}

// Content types are passed via params in a real app; mocked here by hive ID
const HIVE_CONTENT_TYPES: Record<string, ContentTypeOption[]> = {
  '1': [
    { type: 'talking_head', label: 'Talking Head', base_payout: 20, cpm_rate: 1.5 },
    { type: 'skit', label: 'Skit', base_payout: 10, cpm_rate: 1.5 },
    { type: 'demo', label: 'App Demo', base_payout: 15, cpm_rate: 1.0 },
  ],
  '2': [
    { type: 'talking_head', label: 'Talking Head', base_payout: 15, cpm_rate: 1.5 },
    { type: 'pov', label: 'POV / Discovery', base_payout: 0, cpm_rate: 2.0 },
  ],
  '3': [
    { type: 'slideshow', label: 'Slideshow', base_payout: 0, cpm_rate: 1.75 },
    { type: 'talking_head', label: 'Talking Head', base_payout: 25, cpm_rate: 1.5 },
  ],
  '4': [
    { type: 'clipping', label: 'Clipping', base_payout: 0, cpm_rate: 1.5 },
  ],
};

const HIVE_NAMES: Record<string, string> = {
  '1': 'Cluely',
  '2': 'ReGen',
  '3': 'Areum',
  '4': 'Roy Lee',
};

const VALID_DOMAINS = [
  'tiktok.com',
  'vm.tiktok.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
];

function isValidPostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return VALID_DOMAINS.some((d) => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

function payoutLabel(ct: ContentTypeOption): string {
  if (ct.base_payout > 0) {
    return `$${ct.base_payout} base + $${ct.cpm_rate}/1k views`;
  }
  return `$${ct.cpm_rate}/1k views`;
}

export default function SubmitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hiveName = HIVE_NAMES[id ?? ''] ?? 'this Hive';
  const contentTypes = HIVE_CONTENT_TYPES[id ?? ''] ?? [];

  const [selectedType, setSelectedType] = useState<ContentTypeOption | null>(
    contentTypes.length === 1 ? contentTypes[0] : null
  );
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedType) {
      setError('Pick a content type to continue.');
      return;
    }
    if (!isValidPostUrl(url)) {
      setError(STRINGS.errors.invalidUrl);
      return;
    }
    setError('');
    setLoading(true);
    // TODO: call Supabase to create submission record
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-hive-black items-center justify-center px-6">
        <View className="w-16 h-16 rounded-2xl bg-buzz-yellow items-center justify-center mb-6">
          <Ionicons name="checkmark" size={32} color="#0A0A0A" />
        </View>
        <Text className="text-honey-white text-3xl font-black text-center mb-3">
          {STRINGS.submit.submitted}
        </Text>
        <Text className="text-muted text-base text-center leading-relaxed mb-10">
          {STRINGS.submit.submittedSubtitle}
        </Text>
        <Button
          label={STRINGS.submit.backToSubmissions}
          size="lg"
          onPress={() => router.replace('/(tabs)/submissions')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <Pressable
        className="px-6 pt-4 pb-2 flex-row items-center gap-2 active:opacity-70"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="#FFD60A" />
        <Text className="text-buzz-yellow font-semibold">{hiveName}</Text>
      </Pressable>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-2 pb-10">

            <Text className="text-honey-white text-2xl font-black mb-1">
              {STRINGS.submit.title} {hiveName}
            </Text>
            <Text className="text-muted text-sm mb-8 leading-relaxed">
              {STRINGS.submit.screenshotHint}
            </Text>

            {/* Content type picker */}
            {contentTypes.length > 1 && (
              <View className="mb-6">
                <Text className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">
                  {STRINGS.submit.pickType}
                </Text>
                <View className="gap-2">
                  {contentTypes.map((ct) => {
                    const isSelected = selectedType?.type === ct.type;
                    return (
                      <Pressable
                        key={ct.type}
                        onPress={() => setSelectedType(ct)}
                        className="active:opacity-75"
                      >
                        <Card
                          className={`px-4 py-4 flex-row items-center justify-between ${
                            isSelected ? 'border-buzz-yellow/50' : ''
                          }`}
                          variant={isSelected ? 'elevated' : 'default'}
                        >
                          <View>
                            <View className="bg-hive-black rounded px-2 py-0.5 self-start mb-1">
                              <Text className="text-buzz-yellow font-black text-xs tracking-widest">
                                {ct.label.toUpperCase()}
                              </Text>
                            </View>
                            <Text className="text-muted text-xs">{payoutLabel(ct)}</Text>
                          </View>
                          <View
                            className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                              isSelected
                                ? 'bg-buzz-yellow border-buzz-yellow'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && (
                              <Text className="text-hive-black font-black" style={{ fontSize: 10 }}>
                                ✓
                              </Text>
                            )}
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Selected type summary (single type) */}
            {contentTypes.length === 1 && selectedType && (
              <Card className="px-4 py-3 mb-6 flex-row items-center gap-3">
                <View className="bg-hive-black rounded px-2 py-0.5">
                  <Text className="text-buzz-yellow font-black text-xs tracking-widest">
                    {selectedType.label.toUpperCase()}
                  </Text>
                </View>
                <Text className="text-muted text-sm">{payoutLabel(selectedType)}</Text>
              </Card>
            )}

            {/* URL input */}
            <View className="mb-2">
              <Text className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">
                {STRINGS.submit.urlLabel}
              </Text>
              <TextInput
                className="bg-surface border border-white/10 rounded-2xl px-4 py-4 text-honey-white text-sm"
                placeholder={STRINGS.submit.urlPlaceholder}
                placeholderTextColor="#666666"
                value={url}
                onChangeText={(v) => { setUrl(v); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {error ? (
              <Text className="text-red-400 text-sm mb-4">{error}</Text>
            ) : null}

            <View className="mt-6">
              <Button
                label={STRINGS.submit.submitButton}
                size="lg"
                loading={loading}
                disabled={!selectedType || !url.trim()}
                onPress={handleSubmit}
              />
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
