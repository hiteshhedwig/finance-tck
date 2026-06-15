import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '../../lib/hooks/useAuth';
import { useProfile } from '../../lib/hooks/useProfile';
import { useAccounts } from '../../lib/hooks/useAccounts';
import { useTransactions } from '../../lib/hooks/useTransactions';
import { useCCStatements } from '../../lib/hooks/useCCStatements';
import {
  getSalaryCycleForDate,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
} from '../../lib/utils/cycle';
import { Card } from '../../components/ui/Card';
import { AmountText } from '../../components/ui/AmountText';
import { Badge } from '../../components/ui/Badge';
import { TransactionItem } from '../../components/transaction/TransactionItem';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors, FontSize, Spacing, Radius, TRANSACTION_TYPE_COLORS } from '../../constants';
import type { Account, Transaction } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const { data: accounts = [], refetch: refetchAccounts } = useAccounts(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [incomeVisible, setIncomeVisible] = useState(false);

  const salaryDay = profile?.salary_day ?? 7;
  const cycle = getSalaryCycleForDate(new Date(), salaryDay);
  const cycleStart = format(cycle.start, 'yyyy-MM-dd');
  const cycleEnd = format(cycle.end, 'yyyy-MM-dd');

  const { data: transactions = [], refetch: refetchTxns } = useTransactions({
    userId: user?.id ?? '',
    startDate: cycleStart,
    endDate: cycleEnd,
  });

  // CC account
  const ccAccount = accounts.find((a) => a.type === 'credit_card');
  const { data: ccStatements = [] } = useCCStatements(user?.id, ccAccount?.id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchAccounts(), refetchTxns()]);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetchTxns();
      refetchAccounts();
    }, [])
  );

  // Summary calc
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const investments = transactions
    .filter((t) => t.type === 'investment')
    .reduce((s, t) => s + t.amount, 0);
  const debt = transactions
    .filter((t) => t.type === 'debt_payment')
    .reduce((s, t) => s + t.amount, 0);

  const remaining = income - expenses - investments - debt;
  const recentTxns = transactions.slice(0, 5);

  // CC unbilled vs billed
  const unbilledCC = ccAccount ? Math.abs(ccAccount.balance) : 0;
  const latestStatement = ccStatements.find((s) => !s.is_paid);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
            </Text>
            <Text style={styles.cycleLabel}>{cycle.label}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Cycle Summary Card */}
        <Card style={styles.summaryCard} elevated>
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCell}
              onPress={() => setIncomeVisible((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={styles.incomeLabelRow}>
                <Text style={[styles.summaryCellLabel, { color: Colors.income }]}>Income</Text>
                <Text style={styles.eyeIcon}>{incomeVisible ? '👁' : '🙈'}</Text>
              </View>
              <Text style={[styles.summaryCellAmount, { color: Colors.income }]}>
                {incomeVisible ? formatCurrencyCompact(income) : '••••••'}
              </Text>
            </TouchableOpacity>
            <View style={styles.summaryDivider} />
            <SummaryCell label="Spent" amount={expenses} color={Colors.expense} />
            <View style={styles.summaryDivider} />
            <SummaryCell label="Invested" amount={investments} color={Colors.investment} />
          </View>

          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>Remaining this cycle</Text>
            <AmountText
              amount={remaining}
              size="xl"
              color={remaining >= 0 ? Colors.success : Colors.danger}
            />
          </View>

          {debt > 0 && (
            <View style={styles.debtRow}>
              <Text style={styles.debtLabel}>Loan / EMI paid</Text>
              <Text style={styles.debtAmount}>-{formatCurrency(debt)}</Text>
            </View>
          )}
        </Card>

        {/* Account Balances */}
        <SectionHeader title="Accounts" onPress={() => router.push('/(tabs)/accounts')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountsRow}
        >
          {accounts
            .filter((a) => a.type !== 'credit_card')
            .map((a) => (
              <AccountPill
                key={a.id}
                account={a}
                onPress={() => router.push(`/account/${a.id}`)}
              />
            ))}
        </ScrollView>

        {/* CC Status */}
        {ccAccount && (
          <>
            <SectionHeader
              title="Credit Card"
              onPress={() => router.push('/cc-statements')}
            />
            <Card style={styles.ccCard}>
              <View style={styles.ccRow}>
                <View>
                  <Text style={styles.ccLabel}>Unbilled</Text>
                  <AmountText amount={unbilledCC} size="lg" color={Colors.expense} />
                </View>
                {latestStatement && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.ccLabel}>Due {formatDate(latestStatement.due_date)}</Text>
                    <AmountText
                      amount={latestStatement.total_amount - latestStatement.paid_amount}
                      size="lg"
                      color={Colors.danger}
                    />
                  </View>
                )}
              </View>
            </Card>
          </>
        )}

        {/* Recent Transactions */}
        <SectionHeader
          title="Recent"
          onPress={() => router.push('/(tabs)/transactions')}
        />
        {recentTxns.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="◻"
              title="No transactions yet"
              subtitle="Tap + to add your first transaction"
            />
          </View>
        ) : (
          <Card noPadding style={{ marginHorizontal: Spacing.md }}>
            {recentTxns.map((t, i) => (
              <View key={t.id}>
                {i > 0 && <View style={styles.divider} />}
                <TransactionItem transaction={t} />
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCell({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <View style={styles.summaryCell}>
      <Text style={[styles.summaryCellLabel, { color }]}>{label}</Text>
      <Text style={[styles.summaryCellAmount, { color }]}>
        {formatCurrencyCompact(amount)}
      </Text>
    </View>
  );
}

function AccountPill({
  account,
  onPress,
}: {
  account: Account;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.accountPill, { borderColor: account.color ?? Colors.border }]}>
        <View style={[styles.accountDot, { backgroundColor: account.color ?? Colors.primary }]} />
        <View>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text
            style={[
              styles.accountBalance,
              { color: account.balance >= 0 ? Colors.success : Colors.danger },
            ]}
          >
            {formatCurrencyCompact(account.balance)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.sectionLink}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  cycleLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  settingsBtn: { padding: Spacing.xs },
  settingsIcon: { fontSize: 20, color: Colors.textSecondary },

  summaryCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  incomeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eyeIcon: { fontSize: 11 },
  summaryCellLabel: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryCellAmount: { fontSize: FontSize.xl, fontWeight: '700', letterSpacing: -0.5 },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  remainingRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  debtLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  debtAmount: { fontSize: FontSize.xs, color: Colors.debt, fontWeight: '600' },

  accountsRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  accountDot: { width: 8, height: 8, borderRadius: 4 },
  accountName: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  accountBalance: { fontSize: FontSize.md, fontWeight: '700', letterSpacing: -0.3 },

  ccCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  ccRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ccLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLink: { fontSize: FontSize.sm, color: Colors.primary },

  emptyWrap: { paddingHorizontal: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
});
