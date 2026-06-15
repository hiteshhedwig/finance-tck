import { TouchableOpacity, Text } from 'react-native';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { formatDate } from '../../lib/utils/cycle';
import { Colors } from '../../constants';

interface Props {
  value: string;
  onChange: (date: string) => void;
  style?: object;
}

export function DatePicker({ value, onChange, style }: Props) {
  const [show, setShow] = useState(false);
  return (
    <>
      <TouchableOpacity style={style} onPress={() => setShow(true)}>
        <Text style={{ color: Colors.text, fontSize: 15 }}>{value ? formatDate(value) : '—'}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={new Date(value)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_e: any, selected?: Date) => {
            setShow(false);
            if (selected) onChange(format(selected, 'yyyy-MM-dd'));
          }}
        />
      )}
    </>
  );
}
