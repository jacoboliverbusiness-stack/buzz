import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const base = variant === 'elevated' ? 'bg-surface-2' : 'bg-surface';
  return (
    <View
      className={`${base} rounded-2xl border border-white/5 ${className ?? ''}`}
      {...props}
    />
  );
}
