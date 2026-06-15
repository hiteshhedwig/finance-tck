import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/hooks/useAuth';
import { useProfile, useUpsertProfile } from '../lib/hooks/useProfile';
import { nhost } from '../lib/nhost/client';
import { Colors, FontSize, Spacing, Radius } from '../constants';
import { Card } from '../components/ui/Card';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const upsertProfile = useUpsertProfile();

  const [salaryDay, setSalaryDay] = useState(String(profile?.salary_day ?? 7));
  const [cycleMode, setCycleMode] = useState<'salary_cycle' | 'calendar'>(
    profile?.default_month_mode ?? 'salary_cycle'
  );

  useEffect(() => {
    if (profile) {
      setSalaryDay(String(profile.salary_day));
      setCycleMode(profile.default_month_mode);
    }
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    const day = parseInt(salaryDay, 10);
    if (isNaN(day) || day < 1 || day > 28) {
      Alert.alert('Invalid', 'Salary day must be 1–28');
      return;
    }
    try {
      await upsertProfile.mutateAsync({
        id: user.id,
        salary_day: day,
        default_month_mode: cycleMode,
      });
      Alert.alert('Saved', 'Settings updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            const session = nhost.getUserSession();
            if (session?.refreshToken) {
              await nhost.auth.signOut({ refreshToken: session.refreshToken });
            }
            // Clear local session storage regardless
            nhost.clearSession();
          } catch {
            // Even if server-side signout fails, clear local session
            nhost.clearSession();
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Finance Preferences</Text>
        <Card style={styles.card}>
          <SettingRow label="Salary Day">
            <TextInput
              style={styles.input}
              value={salaryDay}
              onChangeText={setSalaryDay}
              keyboardType="number-pad"
              maxLength={2}
            />
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow label="Default View">
            <View style={styles.modeToggle}>
              <TouchableOpacity
                onPress={() => setCycleMode('salary_cycle')}
                style={[styles.modeBtn, cycleMode === 'salary_cycle' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, cycleMode === 'salary_cycle' && styles.modeBtnTextActive]}>
                  Cycle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCycleMode('calendar')}
                style={[styles.modeBtn, cycleMode === 'calendar' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, cycleMode === 'calendar' && styles.modeBtnTextActive]}>
                  Calendar
                </Text>
              </TouchableOpacity>
            </View>
          </SettingRow>
        </Card>

        <Text style={styles.sectionLabel}>Account</Text>
        <Card style={styles.card}>
          <SettingRow label="Email">
            <Text style={styles.valueText}>{user?.email ?? '—'}</Text>
          </SettingRow>
        </Card>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingValue}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backIcon: { fontSize: 22, color: Colors.text, width: 40 },
  topTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  saveText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  content: { padding: Spacing.md, gap: Spacing.xs, paddingBottom: Spacing.xxl },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  card: { gap: 0 },
  divider: { height: 1, backgroundColor: Colors.border },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  settingLabel: { fontSize: FontSize.md, color: Colors.text },
  settingValue: { alignItems: 'flex-end' },
  valueText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: FontSize.md,
    color: Colors.text,
    width: 60,
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  modeBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: Colors.surface },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  modeBtnTextActive: { color: '#fff', fontWeight: '600' },
  signOutBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.dangerMuted,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.danger + '44',
  },
  signOutText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.danger },
});
