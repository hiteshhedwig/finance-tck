import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '../../lib/nhost/client';
import { useAuth } from '../../lib/hooks/useAuth';
import { useProfile } from '../../lib/hooks/useProfile';
import { useTransactions } from '../../lib/hooks/useTransactions';
import { Colors, FontSize, Spacing } from '../../constants';
import { formatCurrency, getSalaryCycleForDate } from '../../lib/utils/cycle';
import { DateGroup } from '../../components/transaction/DateGroup';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Account, Transaction } from '../../types';

const GET_ACCOUNT = `
  query GetAccount($id: uuid!) {
    accounts_by_pk(id: $id) {
      id user_id name type balance color icon is_active notes
      credit_limit statement_day due_day created_at
    }
  }
`;

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const cycle = getSalaryCycleForDate(new Date(), profile?.salary_day ?? 7);
  const cycleStart = format(cycle.start, 'yyyy-MM-dd');
  const cycleEnd = format(cycle.end, 'yyyy-MM-dd');

  const { data: account } = useQuery<Account>({
    queryKey: ['account', id],
    queryFn: async () => {
      const data = await gqlRequest<{ accounts_by_pk: Account }>(GET_ACCOUNT, { id });
      return data.accounts_by_pk;
    },
  });

  const { data: transactions = [], isLoading } = useTransactions({
    userId: user?.id ?? '',
    accountId: id,
  });

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const existing = map.get(t.date) ?? [];
      map.set(t.date, [...existing, t]);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  // Cycle stats computed from already-fetched transactions
  const cycleSpent = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.date >= cycleStart &&
          t.date <= cycleEnd &&
          ['expense', 'investment', 'debt_payment'].includes(t.type) &&
          t.from_account_id === id
      )
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, cycleStart, cycleEnd, id]);

  const cycleReceived = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.date >= cycleStart &&
          t.date <= cycleEnd &&
          ((t.type === 'income' && t.from_account_id === id) ||
            (t.type === 'transfer' && t.to_account_id === id))
      )
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, cycleStart, cycleEnd, id]);

  const isCC = account?.type === 'credit_card';
  const displayBalance = isCC ? Math.abs(account?.balance ?? 0) : (account?.balance ?? 0);
  const balanceColor = isCC
    ? Colors.danger
    : (account?.balance ?? 0) >= 0
    ? Colors.success
    : Colors.danger;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{account?.name ?? 'Account'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {account && (
        <>
          <View style={[styles.balanceHero, { borderLeftColor: account.color ?? Colors.primary }]}>
            <Text style={styles.balanceLabel}>{isCC ? 'Outstanding' : 'Balance'}</Text>
            <Text style={[styles.balanceAmount, { color: balanceColor }]}>
              {isCC ? '-' : ''}{formatCurrency(displayBalance)}
            </Text>
            {isCC && account.due_day && (
              <Text style={styles.dueLine}>
                Statement: {account.statement_day}th · Due: {account.due_day}th
              </Text>
            )}
          </View>

          {!isCC && (
            <View style={styles.cycleRow}>
              <View style={styles.cycleCell}>
                <Text style={styles.cycleCellLabel}>Out this cycle</Text>
                <Text style={[styles.cycleCellAmount, { color: Colors.expense }]}>
                  -{formatCurrency(cycleSpent)}
                </Text>
              </View>
              <View style={styles.cycleDivider} />
              <View style={styles.cycleCell}>
                <Text style={styles.cycleCellLabel}>In this cycle</Text>
                <Text style={[styles.cycleCellAmount, { color: Colors.income }]}>
                  +{formatCurrency(cycleReceived)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : groups.length === 0 ? (
        <EmptyState title="No transactions" subtitle="Transactions from this account will appear here." />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={([date]) => date}
          renderItem={({ item: [date, txns] }) => (
            <DateGroup date={date} transactions={txns} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
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
  balanceHero: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderLeftWidth: 4,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    borderRadius: 4,
  },
  balanceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  balanceAmount: { fontSize: FontSize.xxxl, fontWeight: '700', letterSpacing: -1 },
  dueLine: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 6 },

  cycleRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cycleCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, gap: 2 },
  cycleDivider: { width: 1, backgroundColor: Colors.border },
  cycleCellLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.3 },
  cycleCellAmount: { fontSize: FontSize.lg, fontWeight: '700', letterSpacing: -0.5 },

  listContent: { paddingBottom: Spacing.xxl },
});
