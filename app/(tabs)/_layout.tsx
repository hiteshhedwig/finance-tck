import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '../../constants';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

// Replaces the default <a href> link that React Navigation renders on web.
// On iOS PWA, <a> tags cause Safari to open instead of navigating within
// the app — a pure TouchableOpacity has no href so iOS stays in the PWA.
function PressableTabButton({
  children,
  style,
  onPress,
  onLongPress,
}: {
  children?: React.ReactNode;
  style?: any;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}

function AddTabButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.addButton}>
      <Text style={styles.addButtonIcon}>＋</Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: 58 + insets.bottom, paddingBottom: 6 + insets.bottom },
        ],
        tabBarShowLabel: false,
        tabBarButton: PressableTabButton,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⌂" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="≡" label="Txns" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarButton: () => (
            <AddTabButton onPress={() => router.push('/transaction/add')} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="◎" label="Stats" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⊟" label="Accounts" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  tabIconFocused: {
    color: Colors.primary,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  tabLabelFocused: {
    color: Colors.primary,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonIcon: {
    fontSize: 24,
    color: '#fff',
    lineHeight: 28,
  },
});
