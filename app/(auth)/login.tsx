import {
  View,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError(STRINGS.errors.invalidPhone);
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      router.push({ pathname: '/(auth)/verify', params: { phone } });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-hive-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-16 pb-10 justify-between">
          {/* Header */}
          <View>
            <View className="mb-3">
              <Text className="text-buzz-yellow text-5xl font-black tracking-tight">Buzz</Text>
            </View>
            <Text className="text-honey-white text-3xl font-bold leading-tight">
              {STRINGS.auth.title}
            </Text>
            <Text className="text-muted text-base mt-3 leading-relaxed">
              {STRINGS.auth.subtitle}
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-muted text-sm font-medium mb-2">
                {STRINGS.auth.phoneLabel}
              </Text>
              <TextInput
                className="bg-surface border border-white/10 rounded-2xl px-4 py-4 text-honey-white text-base"
                placeholder={STRINGS.auth.phonePlaceholder}
                placeholderTextColor="#666666"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
              {error ? (
                <Text className="text-red-400 text-sm mt-2">{error}</Text>
              ) : null}
            </View>

            <Button
              label={STRINGS.auth.sendCode}
              onPress={handleSendCode}
              loading={loading}
              size="lg"
            />

            {/* Divider */}
            <View className="flex-row items-center gap-3 my-2">
              <View className="flex-1 h-px bg-white/10" />
              <Text className="text-muted text-sm">{STRINGS.auth.orContinueWith}</Text>
              <View className="flex-1 h-px bg-white/10" />
            </View>

            {/* Social Auth — TODO: wire up Apple/Google OAuth */}
            <Pressable className="bg-surface border border-white/10 rounded-2xl py-4 items-center active:opacity-70">
              <Text className="text-honey-white font-semibold text-base">
                {STRINGS.auth.continueApple}
              </Text>
            </Pressable>
            <Pressable className="bg-surface border border-white/10 rounded-2xl py-4 items-center active:opacity-70">
              <Text className="text-honey-white font-semibold text-base">
                {STRINGS.auth.continueGoogle}
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <Text className="text-muted text-xs text-center">{STRINGS.auth.agree}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
