import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '../../lib/hooks/useAuth';
import { useProfile } from '../../lib/hooks/useProfile';
import { useTransactions } from '../../lib/hooks/useTransactions';
import { useCategories } from '../../lib/hooks/useCategories';
import {
  getSalaryCycleForDate,
  getPreviousCycle,
  getNextCycle,
  formatCurrency,
  formatCurrencyCompact,
} from '../../lib/utils/cycle';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors, FontSize, Spacing, Radius } from '../../constants';
import type { Transaction, MonthMode } from '../../types';

export default function StatsScreen() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const salaryDay = profile?.salary_day ?? 7;

  const [cycleDate, setCycleDate] = useState(new Date());
  const cycle = getSalaryCycleForDate(cycleDate, salaryDay);
  const prevCycle = getPreviousCycle(cycle, salaryDay);

  const startDate = format(cycle.start, 'yyyy-MM-dd');
  const endDate = format(cycle.end, 'yyyy-MM-dd');
  const prevStart = format(prevCycle.start, 'yyyy-MM-dd');
  const prevEnd = format(prevCycle.end, 'yyyy-MM-dd');

  const { data: txns = [], isLoading, refetch } = useTransactions({
    userId: user?.id ?? '',
    startDate,
    endDate,
  });

  const { data: prevTxns = [] } = useTransactions({
    userId: user?.id ?? '',
    startDate: prevStart,
    endDate: prevEnd,
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  // Category breakdown — only expenses
  const categorySpend = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number }>();
    for (const t of txns) {
      if (t.type !== 'expense') continue;
      const catId = t.category_id ?? 'uncategorized';
      const existing = map.get(catId) ?? {
        name: t.category?.name ?? 'Uncategorized',
        color: t.category?.color ?? Colors.textMuted,
        amount: 0,
      };
      map.set(catId, { ...existing, amount: existing.amount + t.amount });
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [txns]);

  const totalExpenses = categorySpend.reduce((s, c) => s + c.amount, 0);
  const totalIncome = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalInvestments = txns.filter((t) => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
  const totalDebt = txns.filter((t) => t.type === 'debt_payment').reduce((s, t) => s + t.amount, 0);
  const familySupport = txns
    .filter((t) => t.type === 'expense' && t.category?.name === 'Family Support')
    .reduce((s, t) => s + t.amount, 0);

  const prevExpenses = prevTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const spendChange = prevExpenses > 0
    ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100)
    : 0;

  function navCycle(dir: 'prev' | 'next') {
    const newDate =
      dir === 'prev'
        ? getPreviousCycle(cycle, salaryDay).start
        : getNextCycle(cycle, salaryDay).start;
    setCycleDate(newDate);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Stats</Text>
        </View>

        {/* Cycle nav */}
        <View style={styles.cycleNav}>
          <TouchableOpacity onPress={() => navCycle('prev')} style={styles.navBtn}>
            <Text style={styles.navIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.cycleLabel}>{cycle.label}</Text>
          <TouchableOpacity onPress={() => navCycle('next')} style={styles.navBtn}>
            <Text style={styles.navIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <StatPill label="Income" amount={totalIncome} color={Colors.income} />
          <StatPill label="Expenses" amount={totalExpenses} color={Colors.expense} />
          <StatPill label="Invested" amount={totalInvestments} color={Colors.investment} />
          <StatPill label="Loan" amount={totalDebt} color={Colors.debt} />
        </View>

        {/* vs prev cycle */}
        {prevExpenses > 0 && (
          <Card style={styles.vsCard}>
            <Text style={styles.vsTitle}>vs Previous Cycle</Text>
            <View style={styles.vsRow}>
              <View>
                <Text style={styles.vsLabel}>This cycle</Text>
                <Text style={[styles.vsAmount, { color: Colors.expense }]}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
              <View>
                <Text style={styles.vsLabel}>Previous</Text>
                <Text style={[styles.vsAmount, { color: Colors.textSecondary }]}>
                  {formatCurrency(prevExpenses)}
                </Text>
              </View>
              <View>
                <Text style={styles.vsLabel}>Change</Text>
                <Text style={[styles.vsAmount, { color: spendChange > 0 ? Colors.danger : Colors.success }]}>
                  {spendChange > 0 ? '+' : ''}{spendChange}%
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Category breakdown */}
        <Text style={styles.sectionLabel}>Spending Breakdown</Text>
        <Card style={styles.categoryCard} noPadding>
          {categorySpend.length === 0 ? (
            <EmptyState title="No expenses" subtitle="Add expense transactions to see breakdown." />
          ) : (
            categorySpend.map((c, i) => (
              <View key={c.name}>
                {i > 0 && <View style={styles.divider} />}
                <CategoryRow
                  name={c.name}
                  amount={c.amount}
                  total={totalExpenses}
                  color={c.color}
                />
              </View>
            ))
          )}
        </Card>

        {/* Family support callout */}
        {familySupport > 0 && (
          <>
            <Text style={styles.sectionLabel}>Family Support</Text>
            <Card style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Sent to family</Text>
              <Text style={[styles.highlightAmount, { color: Colors.success }]}>
                {formatCurrency(familySupport)}
              </Text>
            </Card>
          </>
        )}

        {/* EMI callout */}
        {totalDebt > 0 && (
          <>
            <Text style={styles.sectionLabel}>Loan / EMI</Text>
            <Card style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Paid this cycle</Text>
              <Text style={[styles.highlightAmount, { color: Colors.debt }]}>
                {formatCurrency(totalDebt)}
              </Text>
            </Card>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '44' }]}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statAmount, { color }]}>{formatCurrencyCompact(amount)}</Text>
    </View>
  );
}

function CategoryRow({
  name,
  amount,
  total,
  color,
}: {
  name: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.catRow}>
      <View style={styles.catMeta}>
        <View style={[styles.catDot, { backgroundColor: color }]} />
        <Text style={styles.catName}>{name}</Text>
      </View>
      <View style={styles.catBar}>
        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.catAmounts}>
        <Text style={styles.catAmount}>{formatCurrencyCompact(amount)}</Text>
        <Text style={styles.catPct}>{pct.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text },

  cycleNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  navBtn: { padding: Spacing.sm },
  navIcon: { fontSize: 22, color: Colors.textSecondary },
  cycleLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  statPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    flex: 1,
    minWidth: '45%',
    gap: 2,
  },
  statLabel: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  statAmount: { fontSize: FontSize.lg, fontWeight: '700', letterSpacing: -0.5 },

  vsCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  vsTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  vsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vsLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  vsAmount: { fontSize: FontSize.lg, fontWeight: '700', marginTop: 4 },

  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  categoryCard: { marginHorizontal: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  catMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, width: 110 },
  catDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  catName: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  catBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmounts: { alignItems: 'flex-end', width: 70 },
  catAmount: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  catPct: { fontSize: FontSize.xs, color: Colors.textMuted },

  highlightCard: {
    marginHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highlightLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  highlightAmount: { fontSize: FontSize.xl, fontWeight: '700', letterSpacing: -0.5 },
});
