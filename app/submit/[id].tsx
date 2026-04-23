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
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';

export default function SubmitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isValidUrl = (u: string) =>
    u.startsWith('https://www.tiktok.com/') || u.startsWith('https://www.instagram.com/');

  const handleSubmit = async () => {
    if (!isValidUrl(url)) {
      setError(STRINGS.errors.invalidUrl);
      return;
    }
    setError('');
    setLoading(true);
    // TODO: call Supabase Edge Function to create submission record
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-hive-black items-center justify-center px-6">
        <Text className="text-6xl mb-6">🎉</Text>
        <Text className="text-honey-white text-3xl font-black text-center mb-3">
          {STRINGS.submit.submitted}
        </Text>
        <Text className="text-muted text-base text-center leading-relaxed mb-10">
          {STRINGS.submit.submittedSubtitle}
        </Text>
        <Button
          label="Back to Earnings"
          size="lg"
          onPress={() => router.replace('/(tabs)/earnings')}
        />
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

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-4 pb-10">
            <Text className="text-honey-white text-2xl font-black mb-2">
              {STRINGS.submit.title}
            </Text>
            <Text className="text-muted text-sm leading-relaxed mb-8">
              {STRINGS.submit.subtitle}
            </Text>

            <Text className="text-muted text-sm font-medium mb-2">{STRINGS.submit.urlLabel}</Text>
            <TextInput
              className="bg-surface border border-white/10 rounded-2xl px-4 py-4 text-honey-white text-sm mb-2"
              placeholder={STRINGS.submit.urlPlaceholder}
              placeholderTextColor="#666666"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {error ? (
              <Text className="text-red-400 text-sm mb-4">{error}</Text>
            ) : null}

            <View className="mt-6">
              <Button
                label={STRINGS.submit.submitButton}
                size="lg"
                loading={loading}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
