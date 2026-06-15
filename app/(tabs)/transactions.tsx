import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
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
import {
  getSalaryCycleForDate,
  getCalendarMonth,
  getPreviousCycle,
  getNextCycle,
} from '../../lib/utils/cycle';
import { DateGroup } from '../../components/transaction/DateGroup';
import { EmptyState } from '../../components/ui/EmptyState';
import { Colors, FontSize, Spacing, Radius, TRANSACTION_TYPE_LABELS } from '../../constants';
import type { Transaction, TransactionType, MonthMode } from '../../types';

const TYPE_FILTERS: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Investment', value: 'investment' },
  { label: 'Loan', value: 'debt_payment' },
  { label: 'CC Pay', value: 'cc_payment' },
];

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const salaryDay = profile?.salary_day ?? 7;
  const [cycleDate, setCycleDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [search, setSearch] = useState('');

  const cycle = getSalaryCycleForDate(cycleDate, salaryDay);
  const startDate = format(cycle.start, 'yyyy-MM-dd');
  const endDate = format(cycle.end, 'yyyy-MM-dd');

  const { data: transactions = [], isLoading, refetch } = useTransactions({
    userId: user?.id ?? '',
    startDate,
    endDate,
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: search.trim() || undefined,
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  // Group by date
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const existing = map.get(t.date) ?? [];
      map.set(t.date, [...existing, t]);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  function navCycle(dir: 'prev' | 'next') {
    const newDate =
      dir === 'prev'
        ? getPreviousCycle(cycle, salaryDay).start
        : getNextCycle(cycle, salaryDay).start;
    setCycleDate(newDate);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
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

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type filter chips */}
      <FlatList
        data={TYPE_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i.value}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setTypeFilter(item.value as TransactionType | 'all')}
            style={[
              styles.filterChip,
              typeFilter === item.value && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                typeFilter === item.value && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="◻"
          title="No transactions"
          subtitle="Nothing matches your filters for this cycle."
        />
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

  searchRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  filterRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: Colors.primary },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: Spacing.xxl },
});
