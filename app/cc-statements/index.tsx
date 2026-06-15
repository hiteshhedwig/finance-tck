import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAccounts } from '../../lib/hooks/useAccounts';
import { useCCStatements, useMarkStatementPaid, useGenerateCCStatement } from '../../lib/hooks/useCCStatements';
import { useTransactions } from '../../lib/hooks/useTransactions';
import { Colors, FontSize, Spacing, Radius } from '../../constants';
import { formatCurrency, formatDate, getCCStatementCycle } from '../../lib/utils/cycle';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { CCStatement } from '../../types';
import { format } from 'date-fns';

export default function CCStatementsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts(user?.id);
  const ccAccount = accounts.find((a) => a.type === 'credit_card');

  const { data: statements = [], isLoading, refetch } = useCCStatements(user?.id, ccAccount?.id);
  const markPaid = useMarkStatementPaid();
  const generateStatement = useGenerateCCStatement();

  // Current unbilled: CC transactions since last statement date
  const today = new Date();
  const lastStatementDate = statements[0]?.statement_date;

  const { data: unbilledTxns = [] } = useTransactions({
    userId: user?.id ?? '',
    startDate: lastStatementDate ?? format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  });

  const unbilledAmount = ccAccount
    ? unbilledTxns
        .filter((t) => t.type === 'expense' && t.from_account_id === ccAccount.id && t.statement_month !== lastStatementDate)
        .reduce((s, t) => s + t.amount, 0)
    : 0;

  async function handleGenerateStatement() {
    if (!ccAccount || !user) return;
    const { statementMonth, statementDate, dueDate } = getCCStatementCycle(
      new Date(),
      ccAccount.statement_day ?? 1,
      ccAccount.due_day ?? 21
    );
    try {
      await generateStatement.mutateAsync({
        userId: user.id,
        accountId: ccAccount.id,
        statementDate: format(statementDate, 'yyyy-MM-dd'),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
      });
      refetch();
      Alert.alert('Done', 'Statement generated.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleMarkPaid(statement: CCStatement) {
    Alert.alert('Mark as Paid', `Mark ₹${formatCurrency(statement.total_amount - statement.paid_amount)} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          try {
            await markPaid.mutateAsync({ statementId: statement.id, userId: user!.id });
          } catch (e: any) {
            Alert.alert('Error', e.message);
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
        <Text style={styles.topTitle}>Credit Card</Text>
        <TouchableOpacity onPress={handleGenerateStatement}>
          <Text style={styles.genText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Unbilled summary */}
      <Card style={styles.unbilledCard} elevated>
        <Text style={styles.unbilledLabel}>Current Unbilled</Text>
        <Text style={[styles.unbilledAmount, { color: unbilledAmount > 0 ? Colors.expense : Colors.textSecondary }]}>
          {formatCurrency(unbilledAmount)}
        </Text>
        <Text style={styles.unbilledHint}>
          Transactions after last statement close
        </Text>
      </Card>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : statements.length === 0 ? (
        <EmptyState
          title="No statements yet"
          subtitle="Tap Refresh to generate your first statement."
        />
      ) : (
        <FlatList
          data={statements}
          keyExtractor={(s) => s.id}
          renderItem={({ item: s }) => (
            <StatementCard statement={s} onMarkPaid={() => handleMarkPaid(s)} />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

function StatementCard({
  statement: s,
  onMarkPaid,
}: {
  statement: CCStatement;
  onMarkPaid: () => void;
}) {
  const outstanding = s.total_amount - s.paid_amount;
  const isPaid = s.is_paid || outstanding <= 0;

  return (
    <Card style={styles.statCard}>
      <View style={styles.statHeader}>
        <View>
          <Text style={styles.statDate}>Statement: {formatDate(s.statement_date)}</Text>
          <Text style={styles.dueDate}>Due: {formatDate(s.due_date)}</Text>
        </View>
        <Badge
          label={isPaid ? 'Paid' : 'Unpaid'}
          color={isPaid ? Colors.success : Colors.danger}
        />
      </View>

      <View style={styles.statAmounts}>
        <View>
          <Text style={styles.amtLabel}>Total</Text>
          <Text style={styles.amtValue}>{formatCurrency(s.total_amount)}</Text>
        </View>
        {s.paid_amount > 0 && (
          <View>
            <Text style={styles.amtLabel}>Paid</Text>
            <Text style={[styles.amtValue, { color: Colors.success }]}>{formatCurrency(s.paid_amount)}</Text>
          </View>
        )}
        {outstanding > 0 && (
          <View>
            <Text style={styles.amtLabel}>Outstanding</Text>
            <Text style={[styles.amtValue, { color: Colors.danger }]}>{formatCurrency(outstanding)}</Text>
          </View>
        )}
      </View>

      {!isPaid && (
        <TouchableOpacity style={styles.payBtn} onPress={onMarkPaid}>
          <Text style={styles.payBtnText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}
    </Card>
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
  genText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  unbilledCard: { margin: Spacing.md },
  unbilledLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  unbilledAmount: { fontSize: FontSize.xxxl, fontWeight: '700', letterSpacing: -1 },
  unbilledHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },

  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  statCard: { gap: Spacing.sm },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statDate: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  dueDate: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  statAmounts: {
    flexDirection: 'row',
    gap: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  amtLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  amtValue: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginTop: 2 },

  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: '#fff' },
});
