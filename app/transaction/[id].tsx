import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '../../lib/nhost/client';
import { useDeleteTransaction } from '../../lib/hooks/useTransactions';
import { useAuth } from '../../lib/hooks/useAuth';
import { Colors, FontSize, Spacing, Radius, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS, PAYMENT_MODE_LABELS } from '../../constants';
import { formatDate, formatCurrency } from '../../lib/utils/cycle';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import type { Transaction } from '../../types';

const GET_TRANSACTION = `
  query GetTransaction($id: uuid!) {
    transactions_by_pk(id: $id) {
      id user_id type amount title notes date
      category_id payment_mode from_account_id to_account_id
      statement_month is_recurring recurring_id created_at updated_at
      category { id name icon color }
      from_account { id name color type }
      to_account { id name color type }
    }
  }
`;

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const deleteTxn = useDeleteTransaction();

  const { data: txn, isLoading } = useQuery<Transaction>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const data = await gqlRequest<{ transactions_by_pk: Transaction }>(
        GET_TRANSACTION,
        { id }
      );
      return data.transactions_by_pk;
    },
  });

  async function handleDelete() {
    Alert.alert('Delete transaction', 'Are you sure? This will reverse the balance change.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTxn.mutateAsync({ transactionId: id, userId: user!.id });
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!txn) return null;

  const typeColor = TRANSACTION_TYPE_COLORS[txn.type] ?? Colors.text;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Transaction</Text>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.push(`/transaction/edit?id=${id}`)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Badge label={TRANSACTION_TYPE_LABELS[txn.type]} color={typeColor} />
          <Text style={[styles.heroAmount, { color: typeColor }]}>
            {txn.type === 'income' ? '+' : '-'}
            {formatCurrency(txn.amount)}
          </Text>
          <Text style={styles.heroTitle}>{txn.title}</Text>
          <Text style={styles.heroDate}>{formatDate(txn.date)}</Text>
        </View>

        <Card style={styles.details}>
          {txn.from_account && <DetailRow label="From" value={txn.from_account.name} />}
          {txn.to_account && <DetailRow label="To" value={txn.to_account.name} />}
          {txn.payment_mode && (
            <DetailRow label="Payment" value={PAYMENT_MODE_LABELS[txn.payment_mode] ?? txn.payment_mode} />
          )}
          {txn.category && <DetailRow label="Category" value={txn.category.name} />}
          {txn.statement_month && (
            <DetailRow label="CC Statement" value={formatDate(txn.statement_month)} />
          )}
          {txn.notes && <DetailRow label="Notes" value={txn.notes} />}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  backIcon: { fontSize: 22, color: Colors.text },
  topTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  deleteText: { fontSize: FontSize.sm, color: Colors.danger },
  topActions: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  editText: { fontSize: FontSize.sm, color: Colors.primary },
  content: { padding: Spacing.md, gap: Spacing.md },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  heroAmount: { fontSize: FontSize.xxxl, fontWeight: '700', letterSpacing: -1 },
  heroTitle: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.text },
  heroDate: { fontSize: FontSize.md, color: Colors.textSecondary },
  details: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rowValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
});
