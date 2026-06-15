import { Text, TextStyle } from 'react-native';
import { formatCurrency } from '../../lib/utils/cycle';
import { Colors, FontSize } from '../../constants';

interface AmountTextProps {
  amount: number;
  style?: TextStyle;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  color?: string;
  signed?: boolean; // show + or - prefix
  compact?: boolean;
}

export function AmountText({
  amount,
  style,
  size = 'md',
  color,
  signed,
  compact,
}: AmountTextProps) {
  const sizeMap = {
    sm: FontSize.sm,
    md: FontSize.lg,
    lg: FontSize.xl,
    xl: FontSize.xxl,
    xxl: FontSize.xxxl,
  };

  let displayColor = color ?? Colors.text;
  if (signed) {
    displayColor = amount >= 0 ? Colors.success : Colors.danger;
  }

  let text: string;
  if (compact) {
    // Use compact formatter
    const abs = Math.abs(amount);
    if (abs >= 100000) text = `₹${(abs / 100000).toFixed(1)}L`;
    else if (abs >= 1000) text = `₹${(abs / 1000).toFixed(1)}K`;
    else text = `₹${abs.toFixed(0)}`;
    if (signed && amount !== 0) text = amount > 0 ? `+${text}` : `-${text}`;
  } else {
    text = formatCurrency(Math.abs(amount));
    if (signed && amount !== 0) text = amount > 0 ? `+${text}` : `-${text}`;
  }

  return (
    <Text
      style={[
        {
          fontSize: sizeMap[size],
          color: displayColor,
          fontWeight: '600',
          letterSpacing: -0.3,
        },
        style,
      ]}
    >
      {text}
    </Text>
  );
}
