import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '../../components/ui/DatePicker';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAccounts } from '../../lib/hooks/useAccounts';
import { useCategories } from '../../lib/hooks/useCategories';
import { useUpdateTransaction } from '../../lib/hooks/useTransactions';
import { gqlRequest } from '../../lib/nhost/client';
import {
  Colors, FontSize, Spacing, Radius,
  TRANSACTION_TYPE_LABELS, PAYMENT_MODE_LABELS,
} from '../../constants';
import type { Transaction, PaymentMode } from '../../types';

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

const PAYMENT_MODES: PaymentMode[] = ['upi', 'bank_transfer', 'cash', 'credit_card', 'neft', 'imps'];
const EXPENSE_EXCLUDE_CATEGORIES = new Set(['Salary', 'Investments', 'Loan EMI']);

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const updateTxn = useUpdateTransaction();

  const { data: txn, isLoading } = useQuery<Transaction>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const data = await gqlRequest<{ transactions_by_pk: Transaction }>(GET_TRANSACTION, { id });
      return data.transactions_by_pk;
    },
  });

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [fromAccountId, setFromAccountId] = useState<string | undefined>();
  const [toAccountId, setToAccountId] = useState<string | undefined>();

  // Pre-fill form once txn loads
  useEffect(() => {
    if (!txn) return;
    setAmount(String(txn.amount));
    setTitle(txn.title);
    setNotes(txn.notes ?? '');
    setDate(txn.date);
    setCategoryId(txn.category_id ?? undefined);
    setPaymentMode((txn.payment_mode as PaymentMode) ?? 'upi');
    setFromAccountId(txn.from_account_id ?? undefined);
    setToAccountId(txn.to_account_id ?? undefined);
  }, [txn?.id]);

  if (isLoading || !txn) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const type = txn.type;
  const isTransfer = type === 'transfer';
  const isCCPayment = type === 'cc_payment';
  const needsCategory = type === 'expense' || type === 'income' || type === 'investment' || type === 'debt_payment';
  const needsPaymentMode = type !== 'transfer';
  const ccAccount = accounts.find((a) => a.type === 'credit_card');

  async function handleSave() {
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please add a short description.');
      return;
    }

    let resolvedFromAccount = fromAccountId;
    if (paymentMode === 'credit_card' && type === 'expense' && ccAccount) {
      resolvedFromAccount = ccAccount.id;
    }

    try {
      await updateTxn.mutateAsync({
        oldTxn: txn,
        newInput: {
          userId: user!.id,
          type,
          amount: parsedAmount,
          title: title.trim(),
          notes: notes.trim() || undefined,
          date,
          categoryId,
          paymentMode: needsPaymentMode ? paymentMode : undefined,
          fromAccountId: resolvedFromAccount,
          toAccountId: isTransfer || isCCPayment ? toAccountId : undefined,
          ccStatementDay: ccAccount?.statement_day ?? 1,
          ccDueDay: ccAccount?.due_day ?? 21,
        },
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update transaction');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Edit Transaction</Text>
          <TouchableOpacity onPress={handleSave} disabled={updateTxn.isPending}>
            {updateTxn.isPending ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Type badge (read-only) */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{TRANSACTION_TYPE_LABELS[type]}</Text>
          </View>

          {/* Amount */}
          <View style={styles.amountBlock}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          {/* Title */}
          <FieldLabel>Description</FieldLabel>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={Colors.textMuted}
          />

          {/* Date */}
          <FieldLabel>Date</FieldLabel>
          <DatePicker value={date} onChange={setDate} style={styles.input} />

          {/* Payment mode */}
          {needsPaymentMode && (
            <>
              <FieldLabel>Payment Mode</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPaymentMode(m)}
                    style={[styles.smallChip, paymentMode === m && styles.smallChipActive]}
                  >
                    <Text style={[styles.smallChipText, paymentMode === m && styles.smallChipTextActive]}>
                      {PAYMENT_MODE_LABELS[m]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* From Account */}
          {!isTransfer && !isCCPayment && (
            <>
              <FieldLabel>{type === 'income' ? 'Received in' : 'From Account'}</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {accounts
                  .filter((a) =>
                    paymentMode === 'credit_card' && type === 'expense'
                      ? a.type === 'credit_card'
                      : a.type !== 'credit_card'
                  )
                  .map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => setFromAccountId(a.id)}
                      style={[
                        styles.smallChip,
                        fromAccountId === a.id && styles.smallChipActive,
                        { borderColor: a.color ?? Colors.border },
                        fromAccountId === a.id && { backgroundColor: `${a.color ?? Colors.primary}22` },
                      ]}
                    >
                      <Text style={[styles.smallChipText, fromAccountId === a.id && { color: a.color ?? Colors.primary }]}>
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </>
          )}

          {/* Transfer / CC Payment accounts */}
          {(isTransfer || isCCPayment) && (
            <>
              <FieldLabel>From</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {accounts.filter((a) => a.type !== 'credit_card').map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setFromAccountId(a.id)}
                    style={[styles.smallChip, fromAccountId === a.id && styles.smallChipActive]}
                  >
                    <Text style={[styles.smallChipText, fromAccountId === a.id && styles.smallChipTextActive]}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <FieldLabel>{isCCPayment ? 'Pay to (CC)' : 'To'}</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {(isCCPayment ? accounts.filter((a) => a.type === 'credit_card') : accounts).map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setToAccountId(a.id)}
                    style={[styles.smallChip, toAccountId === a.id && styles.smallChipActive]}
                  >
                    <Text style={[styles.smallChipText, toAccountId === a.id && styles.smallChipTextActive]}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Category */}
          {needsCategory && (
            <>
              <FieldLabel>Category</FieldLabel>
              <View style={styles.categoryGrid}>
                {categories
                  .filter((c) => {
                    if (type === 'expense') return !EXPENSE_EXCLUDE_CATEGORIES.has(c.name);
                    if (type === 'income') return c.name === 'Salary';
                    if (type === 'investment') return c.name === 'Investments';
                    if (type === 'debt_payment') return c.name === 'Loan EMI';
                    return true;
                  })
                  .map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCategoryId(c.id === categoryId ? undefined : c.id)}
                      style={[
                        styles.catChip,
                        categoryId === c.id && {
                          backgroundColor: `${c.color ?? Colors.primary}22`,
                          borderColor: c.color ?? Colors.primary,
                        },
                      ]}
                    >
                      <Text style={[styles.catChipText, categoryId === c.id && { color: c.color ?? Colors.primary }]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </>
          )}

          {/* Notes */}
          <FieldLabel>Notes (optional)</FieldLabel>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note..."
            placeholderTextColor={Colors.textMuted}
            multiline
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
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
  cancelText: { fontSize: FontSize.md, color: Colors.textSecondary },
  topTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  saveText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '700' },
  content: { padding: Spacing.md, gap: Spacing.xs, paddingBottom: 80 },
  typeBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginBottom: Spacing.xs,
  },
  typeBadgeText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  amountBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.xs,
  },
  currencySymbol: { fontSize: 36, color: Colors.textSecondary, fontWeight: '700' },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.text,
    justifyContent: 'center',
  },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  chipRow: { marginBottom: Spacing.xs },
  smallChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  smallChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  smallChipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  smallChipTextActive: { color: Colors.primary, fontWeight: '600' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  catChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catChipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
