import { Colors } from '../../constants';

interface Props {
  value: string;
  onChange: (date: string) => void;
  style?: object;
}

export function DatePicker({ value, onChange }: Props) {
  return (
    <input
      type="date"
      value={value}
      max={new Date().toISOString().split('T')[0]}
      onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
      style={{
        backgroundColor: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 15,
        color: Colors.text,
        width: '100%',
        boxSizing: 'border-box' as const,
        colorScheme: 'dark' as any,
        outline: 'none',
        cursor: 'pointer',
      }}
    />
  );
}
