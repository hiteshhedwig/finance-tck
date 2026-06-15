import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nhost, gqlRequest } from '../lib/nhost/client';
import { seedUserData } from '../lib/nhost/seed';
import { Colors, Spacing, Radius, FontSize } from '../constants';
import type { Account } from '../types';

const UPSERT_PROFILE = `
  mutation UpsertProfile($profile: profiles_insert_input!) {
    insert_profiles_one(
      object: $profile
      on_conflict: {
        constraint: profiles_pkey
        update_columns: [full_name, salary_day, default_month_mode]
      }
    ) { id }
  }
`;

const GET_ACCOUNTS = `
  query GetAccounts($userId: uuid!) {
    accounts(where: { user_id: { _eq: $userId } }, order_by: { created_at: asc }) {
      id name type color
    }
  }
`;

const SET_BALANCE = `
  mutation SetBalance($id: uuid!, $balance: numeric!) {
    update_accounts_by_pk(pk_columns: { id: $id }, _set: { balance: $balance }) { id }
  }
`;

export default function OnboardingScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});

  async function handleSetup() {
    setLoading(true);
    try {
      const session = nhost.getUserSession();
      if (!session?.user?.id) throw new Error('Not authenticated');
      const uid = session.user.id;

      const profile = {
        id: uid,
        full_name: name.trim() || null,
        salary_day: 7,
        default_month_mode: 'salary_cycle',
      };

      await gqlRequest(UPSERT_PROFILE, { profile });
      await seedUserData(uid);

      // Fetch the newly seeded accounts for step 2
      const data = await gqlRequest<{ accounts: Account[] }>(GET_ACCOUNTS, { userId: uid });
      const seeded = data.accounts ?? [];

      qc.setQueryData(['profile', uid], profile);

      setUserId(uid);
      setAccounts(seeded);
      // Initialize all balances to empty
      const init: Record<string, string> = {};
      seeded.forEach((a) => { init[a.id] = ''; });
      setBalances(init);

      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Setup failed, please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDone() {
    setLoading(true);
    try {
      // Update balances for any account with a non-zero value entered
      await Promise.all(
        accounts.map(async (a) => {
          const raw = balances[a.id]?.replace(/,/g, '') ?? '';
          const val = parseFloat(raw);
          if (!isNaN(val) && val !== 0) {
            // CC balance stored as negative (liability)
            const balance = a.type === 'credit_card' ? -Math.abs(val) : val;
            await gqlRequest(SET_BALANCE, { id: a.id, balance });
          }
        })
      );

      qc.invalidateQueries({ queryKey: ['accounts', userId] });
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save balances.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 2) {
    const bankAndCash = accounts.filter((a) => a.type !== 'credit_card');
    const ccAccounts = accounts.filter((a) => a.type === 'credit_card');

    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.emoji}>💰</Text>
              <Text style={styles.title}>Current Balances</Text>
              <Text style={styles.subtitle}>
                Enter your current balance for each account. Leave blank to start at ₹0.
              </Text>
            </View>

            <View style={styles.form}>
              {bankAndCash.map((a) => (
                <View key={a.id} style={styles.balanceRow}>
                  <View style={styles.accountLabel}>
                    <View style={[styles.dot, { backgroundColor: a.color ?? Colors.primary }]} />
                    <Text style={styles.accountName}>{a.name}</Text>
                  </View>
                  <View style={styles.balanceInputWrap}>
                    <Text style={styles.rupee}>₹</Text>
                    <TextInput
                      style={styles.balanceInput}
                      value={balances[a.id] ?? ''}
                      onChangeText={(v) => setBalances((b) => ({ ...b, [a.id]: v }))}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}

              {ccAccounts.length > 0 && (
                <>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionNote}>
                    Credit card — enter outstanding amount (what you owe)
                  </Text>
                  {ccAccounts.map((a) => (
                    <View key={a.id} style={styles.balanceRow}>
                      <View style={styles.accountLabel}>
                        <View style={[styles.dot, { backgroundColor: a.color ?? Colors.danger }]} />
                        <Text style={styles.accountName}>{a.name}</Text>
                      </View>
                      <View style={styles.balanceInputWrap}>
                        <Text style={[styles.rupee, { color: Colors.danger }]}>₹</Text>
                        <TextInput
                          style={[styles.balanceInput, { color: Colors.danger }]}
                          value={balances[a.id] ?? ''}
                          onChangeText={(v) => setBalances((b) => ({ ...b, [a.id]: v }))}
                          placeholder="0"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleDone}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Done — Open my tracker</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Let's set up your finance tracker. We'll create your accounts and categories automatically.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Your name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <Text style={styles.hint}>
            We'll pre-create: HDFC Master, SBI, Federal Bank, Cash, and Credit Card accounts.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSetup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Set up my tracker →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xxl,
  },
  header: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  emoji: { fontSize: 56 },
  title: { fontSize: FontSize.xxxl, fontWeight: '700', color: Colors.text },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },

  // Step 2 — balance rows
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accountLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  accountName: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  balanceInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rupee: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  balanceInput: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 80,
    textAlign: 'right',
  },
  sectionDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.xs },

  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonText: { fontSize: FontSize.md, fontWeight: '600', color: '#fff' },
});
