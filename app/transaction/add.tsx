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
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { DatePicker } from '../../components/ui/DatePicker';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAccounts } from '../../lib/hooks/useAccounts';
import { useCategories } from '../../lib/hooks/useCategories';
import { useCreateTransaction } from '../../lib/hooks/useTransactions';
import { Colors, FontSize, Spacing, Radius, TRANSACTION_TYPE_LABELS, PAYMENT_MODE_LABELS } from '../../constants';
import type { TransactionType, PaymentMode } from '../../types';

const TYPES: TransactionType[] = ['expense', 'income', 'transfer', 'investment', 'debt_payment', 'cc_payment'];

const TYPE_COLORS: Record<TransactionType, string> = {
  expense: Colors.expense,
  income: Colors.income,
  transfer: Colors.transfer,
  investment: Colors.investment,
  debt_payment: Colors.debt,
  cc_payment: Colors.ccPayment,
};

const PAYMENT_MODES: PaymentMode[] = ['upi', 'bank_transfer', 'cash', 'credit_card', 'neft', 'imps'];

export default function AddTransactionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts(user?.id);
  const { data: categories = [] } = useCategories(user?.id);
  const createTxn = useCreateTransaction();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [fromAccountId, setFromAccountId] = useState<string | undefined>(
    accounts.find((a) => a.name === 'SBI' || a.type === 'bank')?.id
  );
  const [toAccountId, setToAccountId] = useState<string | undefined>();
  const isTransfer = type === 'transfer';
  const isCCPayment = type === 'cc_payment';
  const needsCategory = type === 'expense' || type === 'income' || type === 'investment' || type === 'debt_payment';
  const needsPaymentMode = type !== 'transfer';

  // For CC expenses, auto-set the CC account as from_account
  const ccAccount = accounts.find((a) => a.type === 'credit_card');

  async function handleSubmit() {
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please add a short description.');
      return;
    }
    if (isTransfer && !toAccountId) {
      Alert.alert('Missing destination', 'Please select a destination account.');
      return;
    }

    // For CC expense, source account should be the CC card
    let resolvedFromAccount = fromAccountId;
    if (paymentMode === 'credit_card' && type === 'expense' && ccAccount) {
      resolvedFromAccount = ccAccount.id;
    }

    try {
      await createTxn.mutateAsync({
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
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save transaction');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Add Transaction</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={createTxn.isPending}>
            {createTxn.isPending ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.typeChip,
                  type === t && { backgroundColor: `${TYPE_COLORS[t]}22`, borderColor: TYPE_COLORS[t] },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    type === t && { color: TYPE_COLORS[t] },
                  ]}
                >
                  {TRANSACTION_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
            placeholder={titlePlaceholder(type)}
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
              <FieldLabel>
                {type === 'income' ? 'Received in' : 'From Account'}
              </FieldLabel>
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
              <AccountPicker
                accounts={accounts.filter((a) => a.type !== 'credit_card')}
                selected={fromAccountId}
                onSelect={setFromAccountId}
              />
              <FieldLabel>{isCCPayment ? 'Pay to (CC)' : 'To'}</FieldLabel>
              <AccountPicker
                accounts={isCCPayment ? accounts.filter((a) => a.type === 'credit_card') : accounts}
                selected={toAccountId}
                onSelect={setToAccountId}
              />
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
                    const relevant = relevantCategories(type);
                    return relevant.length === 0 || relevant.includes(c.name);
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

function AccountPicker({
  accounts,
  selected,
  onSelect,
}: {
  accounts: Array<{ id: string; name: string; color: string | null }>;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
      {accounts.map((a) => (
        <TouchableOpacity
          key={a.id}
          onPress={() => onSelect(a.id)}
          style={[
            styles.smallChip,
            selected === a.id && styles.smallChipActive,
            selected === a.id && { backgroundColor: `${a.color ?? Colors.primary}22`, borderColor: a.color ?? Colors.primary },
          ]}
        >
          <Text style={[styles.smallChipText, selected === a.id && { color: a.color ?? Colors.primary }]}>
            {a.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function titlePlaceholder(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    expense: 'e.g. Swiggy dinner',
    income: 'e.g. March salary',
    transfer: 'e.g. HDFC to SBI',
    investment: 'e.g. SIP - Nifty50',
    debt_payment: 'e.g. Home loan EMI',
    cc_payment: 'e.g. CC bill payment',
  };
  return map[type];
}

// Categories that should NOT appear on expense type
const EXPENSE_EXCLUDE_CATEGORIES = new Set(['Salary', 'Investments', 'Loan EMI']);

function relevantCategories(type: TransactionType): string[] {
  if (type === 'income') return ['Salary'];
  if (type === 'investment') return ['Investments'];
  if (type === 'debt_payment') return ['Loan EMI'];
  return [];
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

  typeRow: { marginBottom: Spacing.xs },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  typeChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },

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
  smallChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
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
