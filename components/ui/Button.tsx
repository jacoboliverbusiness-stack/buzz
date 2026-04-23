import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: {
    container: 'bg-buzz-yellow active:opacity-80',
    text: 'text-hive-black font-bold',
  },
  secondary: {
    container: 'bg-surface-2 active:opacity-80 border border-white/10',
    text: 'text-honey-white font-semibold',
  },
  ghost: {
    container: 'active:opacity-60',
    text: 'text-buzz-yellow font-semibold',
  },
};

const sizeStyles = {
  sm: { container: 'px-4 py-2 rounded-xl', text: 'text-sm' },
  md: { container: 'px-6 py-4 rounded-2xl', text: 'text-base' },
  lg: { container: 'px-6 py-5 rounded-2xl', text: 'text-lg' },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  size = 'md',
  onPress,
  disabled,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  const handlePress = async (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable
      className={`items-center justify-center ${v.container} ${s.container} ${disabled || loading ? 'opacity-50' : ''}`}
      onPress={handlePress}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#0A0A0A' : '#FFD60A'} />
      ) : (
        <Text className={`${v.text} ${s.text}`}>{label}</Text>
      )}
    </Pressable>
  );
}
