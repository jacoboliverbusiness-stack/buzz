import { View, TextInput, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError(STRINGS.errors.invalidCode);
      return;
    }
    setError('');
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-16 pb-10 justify-between">
          <View>
            <Text className="text-honey-white text-3xl font-bold leading-tight">
              {STRINGS.auth.verifyTitle}
            </Text>
            <Text className="text-muted text-base mt-3">
              {STRINGS.auth.verifySubtitle}{' '}
              <Text className="text-honey-white font-semibold">{phone}</Text>
            </Text>
          </View>

          <View className="gap-4">
            <TextInput
              className="bg-surface border border-white/10 rounded-2xl px-4 py-5 text-honey-white text-3xl font-bold text-center tracking-widest"
              placeholder={STRINGS.auth.verifyPlaceholder}
              placeholderTextColor="#666666"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
            />
            {error ? (
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            ) : null}
            <Button
              label={STRINGS.auth.verifyButton}
              onPress={handleVerify}
              loading={loading}
              size="lg"
            />
            <Button
              label={STRINGS.auth.resend}
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>

          <View />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
