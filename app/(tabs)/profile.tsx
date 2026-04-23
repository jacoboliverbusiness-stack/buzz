import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

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
        <Text className="text-muted text-lg">›</Text>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { session, signOut } = useAuthStore();

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

          {/* Header */}
          <Text className="text-honey-white text-3xl font-black mb-8">
            {STRINGS.profile.title}
          </Text>

          {/* Avatar */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-buzz-yellow items-center justify-center mb-3">
              <Text className="text-hive-black font-black text-3xl">B</Text>
            </View>
            <Text className="text-honey-white font-bold text-lg">
              {session?.user.phone ?? 'Clipper'}
            </Text>
            <Text className="text-muted text-sm">{session?.user.email ?? ''}</Text>
          </View>

          {/* Social Handles */}
          <Card className="px-5 mb-6">
            <SettingsRow
              label={STRINGS.profile.tiktok}
              value="Not connected"
              onPress={() => {
                // TODO: connect TikTok handle
              }}
            />
            <SettingsRow
              label={STRINGS.profile.instagram}
              value="Not connected"
              onPress={() => {
                // TODO: connect Instagram handle
              }}
            />
          </Card>

          {/* Payout Settings */}
          <Card className="px-5 mb-6">
            <SettingsRow
              label={STRINGS.profile.payouts}
              value="Not set up"
              onPress={() => {
                // TODO: Stripe Connect onboarding
              }}
            />
            <SettingsRow
              label={STRINGS.profile.payoutHistory}
              onPress={() => {
                // TODO: navigate to payout history
              }}
            />
            <SettingsRow
              label={STRINGS.profile.kycRequired}
              value="Pending"
              onPress={() => {
                // TODO: ID verification flow
              }}
            />
          </Card>

          {/* Sign Out */}
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
