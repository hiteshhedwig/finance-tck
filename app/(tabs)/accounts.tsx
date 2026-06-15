import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAccounts } from '../../lib/hooks/useAccounts';
import { useProfile } from '../../lib/hooks/useProfile';
import { useTransactions } from '../../lib/hooks/useTransactions';
import { Colors, FontSize, Spacing, Radius, ACCOUNT_TYPE_LABELS } from '../../constants';
import { formatCurrency, getSalaryCycleForDate } from '../../lib/utils/cycle';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import type { Account } from '../../types';

export default function AccountsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: accounts = [], isLoading, refetch } = useAccounts(user?.id);
  const { data: profile } = useProfile(user?.id);

  const cycle = getSalaryCycleForDate(new Date(), profile?.salary_day ?? 7);
  const cycleStart = format(cycle.start, 'yyyy-MM-dd');
  const cycleEnd = format(cycle.end, 'yyyy-MM-dd');

  const { data: cycleTxns = [], refetch: refetchTxns } = useTransactions({
    userId: user?.id ?? '',
    startDate: cycleStart,
    endDate: cycleEnd,
  });

  useFocusEffect(useCallback(() => { refetch(); refetchTxns(); }, []));

  // Per-account outflow this cycle (expenses + investments + debt)
  const accountSpent = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of cycleTxns) {
      if (['expense', 'investment', 'debt_payment'].includes(t.type) && t.from_account_id) {
        map.set(t.from_account_id, (map.get(t.from_account_id) ?? 0) + t.amount);
      }
    }
    return map;
  }, [cycleTxns]);

  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const cashAccounts = accounts.filter((a) => a.type === 'cash');
  const ccAccounts = accounts.filter((a) => a.type === 'credit_card');

  const totalAssets = accounts
    .filter((a) => a.type !== 'credit_card')
    .reduce((s, a) => s + a.balance, 0);
  const totalLiability = ccAccounts.reduce((s, a) => s + Math.abs(Math.min(a.balance, 0)), 0);
  const netWorth = totalAssets - totalLiability;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
      </View>

      {/* Net summary */}
      <Card style={styles.netCard} elevated>
        <View style={styles.netRow}>
          <View style={styles.netCell}>
            <Text style={styles.netLabel}>Total Assets</Text>
            <Text style={[styles.netAmount, { color: Colors.success }]}>
              {formatCurrency(totalAssets)}
            </Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netCell}>
            <Text style={styles.netLabel}>CC Liability</Text>
            <Text style={[styles.netAmount, { color: Colors.danger }]}>
              -{formatCurrency(totalLiability)}
            </Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netCell}>
            <Text style={styles.netLabel}>Net</Text>
            <Text style={[styles.netAmount, { color: netWorth >= 0 ? Colors.success : Colors.danger }]}>
              {formatCurrency(netWorth)}
            </Text>
          </View>
        </View>
      </Card>

      <FlatList
        data={[
          { key: 'banks', label: 'Bank Accounts', items: bankAccounts },
          { key: 'cash', label: 'Cash', items: cashAccounts },
          { key: 'cc', label: 'Credit Cards', items: ccAccounts },
        ].filter((g) => g.items.length > 0)}
        keyExtractor={(g) => g.key}
        renderItem={({ item: group }) => (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{group.label}</Text>
            {group.items.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                spentThisCycle={accountSpent.get(a.id) ?? 0}
                onPress={() => router.push(`/account/${a.id}`)}
              />
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No accounts"
            subtitle="Your accounts will appear here after onboarding."
          />
        }
      />
    </SafeAreaView>
  );
}

function AccountCard({
  account: a,
  spentThisCycle,
  onPress,
}: {
  account: Account;
  spentThisCycle: number;
  onPress: () => void;
}) {
  const isCC = a.type === 'credit_card';
  const displayBalance = isCC ? Math.abs(a.balance) : a.balance;
  const balanceColor = isCC
    ? Colors.danger
    : a.balance >= 0
    ? Colors.success
    : Colors.danger;
  const balanceLabel = isCC ? 'Outstanding' : 'Balance';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.accountCard}>
        <View style={styles.accountRow}>
          <View style={[styles.accountIndicator, { backgroundColor: a.color ?? Colors.primary }]} />
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{a.name}</Text>
            <Text style={styles.accountType}>{ACCOUNT_TYPE_LABELS[a.type]}</Text>
            {!isCC && spentThisCycle > 0 && (
              <Text style={styles.spentLabel}>
                -{formatCurrency(spentThisCycle)} this cycle
              </Text>
            )}
          </View>
          <View style={styles.accountBalance}>
            <Text style={[styles.balanceAmount, { color: balanceColor }]}>
              {isCC ? '-' : ''}{formatCurrency(displayBalance)}
            </Text>
            <Text style={styles.balanceLabel}>{balanceLabel}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text },

  netCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  netRow: { flexDirection: 'row' },
  netCell: { flex: 1, alignItems: 'center', gap: 4 },
  netLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.3 },
  netAmount: { fontSize: FontSize.lg, fontWeight: '700', letterSpacing: -0.5 },
  netDivider: { width: 1, backgroundColor: Colors.border },

  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  section: { gap: Spacing.xs, marginBottom: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  accountCard: { marginBottom: 0 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  accountIndicator: { width: 4, height: 44, borderRadius: 2 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  accountType: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  spentLabel: { fontSize: FontSize.xs, color: Colors.expense, marginTop: 2 },
  accountBalance: { alignItems: 'flex-end' },
  balanceAmount: { fontSize: FontSize.lg, fontWeight: '700', letterSpacing: -0.3 },
  balanceLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
