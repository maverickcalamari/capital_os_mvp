import { supabase } from './supabase';
import type {
  BudgetCategory,
  Goal,
  Investment,
  NotificationItem,
  Opportunity,
  Settings,
  Transaction,
} from './types';

const TABLES = {
  budget: 'budget_categories',
  transactions: 'transactions',
  goals: 'goals',
  investments: 'investments',
  opportunities: 'opportunities',
  notifications: 'notifications',
  settings: 'settings',
  profiles: 'profiles',
} as const;

function mapBudget(row: any): BudgetCategory {
  return {
    id: row.id,
    name: row.name,
    budget: Number(row.budget),
    actual: Number(row.actual),
    icon: row.icon ?? '💰',
    month_key: row.month_key,
    template_name: row.template_name,
    rollover: row.rollover,
    notes: row.notes,
  };
}

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    date: row.transaction_date,
    merchant: row.merchant,
    category: row.category,
    amount: Number(row.amount),
    direction: row.direction,
    status: row.status,
    notes: row.notes,
    receipt_url: row.receipt_url,
    is_recurring: row.is_recurring,
  };
}

function mapGoal(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    current: Number(row.current),
    due: row.due ?? '',
    notes: row.notes,
    priority: row.priority,
  };
}

function mapInvestment(row: any): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.asset_type ?? 'Other',
    value: Number(row.value),
    returnPct: Number(row.return_pct),
    notes: row.notes,
    institution: row.institution,
  };
}

function mapOpportunity(row: any): Opportunity {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    note: row.note ?? '',
    capital: Number(row.capital),
    risk: row.risk,
    effort: row.effort,
    score: row.score,
    status: row.status,
  };
}

function mapNotification(row: any): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    link_view: row.link_view,
    read: row.read,
    created_at: row.created_at,
  };
}

function mapSettings(row: any): Settings {
  return {
    user_id: row.user_id,
    monthly_income: Number(row.monthly_income),
    monthly_expenses: Number(row.monthly_expenses),
    target_savings_rate: Number(row.target_savings_rate),
    net_worth: Number(row.net_worth),
    inflation_rate: Number(row.inflation_rate),
    income_growth_rate: Number(row.income_growth_rate),
    investment_return_rate: Number(row.investment_return_rate),
    reduced_motion: row.reduced_motion,
  };
}

async function ensure<T>(p: any, ctx: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${ctx}: ${error.message}`);
  if (data === null) throw new Error(`${ctx}: no data`);
  return data as T;
}

export const repository = {
  // ---- Budget ----
  async loadBudget(monthKey: string): Promise<BudgetCategory[]> {
    const data = await ensure(
      supabase.from(TABLES.budget).select('*').eq('month_key', monthKey).order('created_at'),
      'loadBudget'
    );
    return (data as any[]).map(mapBudget);
  },

  async upsertBudget(item: Omit<BudgetCategory, 'id'> & { id?: string }): Promise<BudgetCategory> {
    const payload: any = {
      name: item.name,
      icon: item.icon,
      budget: item.budget,
      actual: item.actual,
      month_key: item.month_key ?? new Date().toISOString().slice(0, 7),
      template_name: item.template_name ?? null,
      rollover: item.rollover ?? false,
      notes: item.notes ?? null,
    };
    if (item.id) payload.id = item.id;
    const data = await ensure(
      supabase.from(TABLES.budget).upsert(payload, { onConflict: 'id' }).select().maybeSingle(),
      'upsertBudget'
    );
    return mapBudget(data);
  },

  async deleteBudget(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.budget).delete().eq('id', id);
    if (error) throw new Error(`deleteBudget: ${error.message}`);
  },

  async duplicateBudgetMonth(fromMonth: string, toMonth: string): Promise<void> {
    const data = await ensure(
      supabase.from(TABLES.budget).select('*').eq('month_key', fromMonth),
      'duplicateBudgetMonth'
    );
    const rows = data as any[];
    if (!rows.length) return;
    const payload = rows.map((r) => ({
      name: r.name,
      icon: r.icon,
      budget: r.budget,
      actual: 0,
      month_key: toMonth,
      template_name: r.template_name,
      rollover: r.rollover,
      notes: r.notes,
    }));
    const { error } = await supabase.from(TABLES.budget).insert(payload);
    if (error) throw new Error(`duplicateBudgetMonth: ${error.message}`);
  },

  // ---- Transactions ----
  async loadTransactions(): Promise<Transaction[]> {
    const data = await ensure(
      supabase
        .from(TABLES.transactions)
        .select('*')
        .order('transaction_date', { ascending: false }),
      'loadTransactions'
    );
    return (data as any[]).map(mapTransaction);
  },

  async upsertTransaction(item: Omit<Transaction, 'id'> & { id?: string }): Promise<Transaction> {
    const payload: any = {
      transaction_date: item.date,
      merchant: item.merchant,
      category: item.category,
      amount: item.amount,
      direction: item.direction,
      status: item.status,
      notes: item.notes ?? null,
      receipt_url: item.receipt_url ?? null,
      is_recurring: item.is_recurring ?? false,
    };
    if (item.id) payload.id = item.id;
    const data = await ensure(
      supabase.from(TABLES.transactions).upsert(payload, { onConflict: 'id' }).select().maybeSingle(),
      'upsertTransaction'
    );
    return mapTransaction(data);
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.transactions).delete().eq('id', id);
    if (error) throw new Error(`deleteTransaction: ${error.message}`);
  },

  async uploadReceipt(file: File, userId: string): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(`uploadReceipt: ${error.message}`);
    const { data: pub } = supabase.storage.from('receipts').getPublicUrl(path);
    return pub.publicUrl;
  },

  // ---- Goals ----
  async loadGoals(): Promise<Goal[]> {
    const data = await ensure(
      supabase.from(TABLES.goals).select('*').order('priority', { ascending: false }),
      'loadGoals'
    );
    return (data as any[]).map(mapGoal);
  },

  async upsertGoal(item: Omit<Goal, 'id'> & { id?: string }): Promise<Goal> {
    const payload: any = {
      name: item.name,
      target: item.target,
      current: item.current,
      due: item.due || null,
      notes: item.notes ?? null,
      priority: item.priority ?? 0,
    };
    if (item.id) payload.id = item.id;
    const data = await ensure(
      supabase.from(TABLES.goals).upsert(payload, { onConflict: 'id' }).select().maybeSingle(),
      'upsertGoal'
    );
    return mapGoal(data);
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.goals).delete().eq('id', id);
    if (error) throw new Error(`deleteGoal: ${error.message}`);
  },

  // ---- Investments ----
  async loadInvestments(): Promise<Investment[]> {
    const data = await ensure(
      supabase.from(TABLES.investments).select('*').order('created_at'),
      'loadInvestments'
    );
    return (data as any[]).map(mapInvestment);
  },

  async upsertInvestment(item: Omit<Investment, 'id'> & { id?: string }): Promise<Investment> {
    const payload: any = {
      name: item.name,
      asset_type: item.type,
      value: item.value,
      return_pct: item.returnPct,
      notes: item.notes ?? null,
      institution: item.institution ?? null,
    };
    if (item.id) payload.id = item.id;
    const data = await ensure(
      supabase
        .from(TABLES.investments)
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle(),
      'upsertInvestment'
    );
    return mapInvestment(data);
  },

  async deleteInvestment(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.investments).delete().eq('id', id);
    if (error) throw new Error(`deleteInvestment: ${error.message}`);
  },

  // ---- Opportunities ----
  async loadOpportunities(): Promise<Opportunity[]> {
    const data = await ensure(
      supabase.from(TABLES.opportunities).select('*').order('score', { ascending: false }),
      'loadOpportunities'
    );
    return (data as any[]).map(mapOpportunity);
  },

  async upsertOpportunity(item: Omit<Opportunity, 'id'> & { id?: string }): Promise<Opportunity> {
    const payload: any = {
      title: item.title,
      type: item.type,
      note: item.note,
      capital: item.capital,
      risk: item.risk,
      effort: item.effort,
      score: item.score,
      status: item.status,
    };
    if (item.id) payload.id = item.id;
    const data = await ensure(
      supabase
        .from(TABLES.opportunities)
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle(),
      'upsertOpportunity'
    );
    return mapOpportunity(data);
  },

  async deleteOpportunity(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.opportunities).delete().eq('id', id);
    if (error) throw new Error(`deleteOpportunity: ${error.message}`);
  },

  // ---- Notifications ----
  async loadNotifications(): Promise<NotificationItem[]> {
    const data = await ensure(
      supabase.from(TABLES.notifications).select('*').order('created_at', { ascending: false }),
      'loadNotifications'
    );
    return (data as any[]).map(mapNotification);
  },

  async markNotificationRead(id: string, read: boolean): Promise<void> {
    const { error } = await supabase.from(TABLES.notifications).update({ read }).eq('id', id);
    if (error) throw new Error(`markNotificationRead: ${error.message}`);
  },

  async insertNotification(n: Omit<NotificationItem, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase.from(TABLES.notifications).insert({
      title: n.title,
      body: n.body,
      kind: n.kind,
      link_view: n.link_view,
      read: n.read,
    });
    if (error) throw new Error(`insertNotification: ${error.message}`);
  },

  // ---- Settings ----
  async loadSettings(): Promise<Settings | null> {
    const { data, error } = await supabase.from(TABLES.settings).select('*').maybeSingle();
    if (error) throw new Error(`loadSettings: ${error.message}`);
    return data ? mapSettings(data) : null;
  },

  async upsertSettings(s: Partial<Settings> & { user_id?: string }): Promise<Settings> {
    const payload: any = { ...s };
    const data = await ensure(
      supabase.from(TABLES.settings).upsert(payload, { onConflict: 'user_id' }).select().maybeSingle(),
      'upsertSettings'
    );
    return mapSettings(data);
  },

  // ---- Profile ----
  async loadProfile(): Promise<any | null> {
    const { data, error } = await supabase.from(TABLES.profiles).select('*').maybeSingle();
    if (error) throw new Error(`loadProfile: ${error.message}`);
    return data;
  },

  async updateProfile(p: { display_name?: string; avatar_url?: string | null }): Promise<void> {
    const { error } = await supabase.from(TABLES.profiles).update(p).eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
    if (error) throw new Error(`updateProfile: ${error.message}`);
  },

  // ---- Export ----
  async exportAll(): Promise<Record<string, unknown>> {
    const [budget, transactions, goals, investments, opportunities, settings] =
      await Promise.all([
        supabase.from(TABLES.budget).select('*'),
        supabase.from(TABLES.transactions).select('*'),
        supabase.from(TABLES.goals).select('*'),
        supabase.from(TABLES.investments).select('*'),
        supabase.from(TABLES.opportunities).select('*'),
        supabase.from(TABLES.settings).select('*').maybeSingle(),
      ]);
    return {
      budget: budget.data,
      transactions: transactions.data,
      goals: goals.data,
      investments: investments.data,
      opportunities: opportunities.data,
      settings: settings.data,
      exportedAt: new Date().toISOString(),
    };
  },
};
