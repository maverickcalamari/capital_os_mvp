import type {
  BudgetCategory,
  Goal,
  Investment,
  NotificationItem,
  Opportunity,
  Settings,
  Transaction,
} from './types';
import { uid } from './ui';

const STORAGE_KEY = 'capital-os-guest-data';

const SAMPLE_BUDGET: BudgetCategory[] = [
  { id: 'sample-b1', name: 'Housing', budget: 1800, actual: 1800, icon: '🏠', month_key: new Date().toISOString().slice(0, 7) },
  { id: 'sample-b2', name: 'Groceries', budget: 400, actual: 380, icon: '🛒', month_key: new Date().toISOString().slice(0, 7) },
  { id: 'sample-b3', name: 'Dining', budget: 250, actual: 310, icon: '🍽️', month_key: new Date().toISOString().slice(0, 7) },
  { id: 'sample-b4', name: 'Transport', budget: 200, actual: 150, icon: '🚙', month_key: new Date().toISOString().slice(0, 7) },
  { id: 'sample-b5', name: 'Utilities', budget: 180, actual: 180, icon: '💡', month_key: new Date().toISOString().slice(0, 7) },
  { id: 'sample-b6', name: 'Entertainment', budget: 150, actual: 95, icon: '🎬', month_key: new Date().toISOString().slice(0, 7) },
];

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: 'sample-t1', date: new Date().toISOString().slice(0, 10), merchant: 'Payroll', category: 'Income', amount: 4200, direction: 'income', status: 'cleared' },
  { id: 'sample-t2', date: new Date().toISOString().slice(0, 10), merchant: 'Apartment Rent', category: 'Housing', amount: 1800, direction: 'expense', status: 'cleared' },
  { id: 'sample-t3', date: new Date().toISOString().slice(0, 10), merchant: 'Whole Foods', category: 'Groceries', amount: 125, direction: 'expense', status: 'cleared' },
  { id: 'sample-t4', date: new Date().toISOString().slice(0, 10), merchant: 'Netflix', category: 'Entertainment', amount: 15, direction: 'expense', status: 'cleared' },
];

const SAMPLE_GOALS: Goal[] = [
  { id: 'sample-g1', name: 'Emergency Fund', target: 10000, current: 4500, due: '2026-12-31', priority: 1 },
  { id: 'sample-g2', name: 'Vacation', target: 3000, current: 800, due: '2027-06-01', priority: 2 },
];

const SAMPLE_INVESTMENTS: Investment[] = [
  { id: 'sample-i1', name: 'S&P 500 Index', type: 'ETF', value: 8500, returnPct: 8.5 },
  { id: 'sample-i2', name: 'High-Yield Savings', type: 'Cash', value: 4500, returnPct: 4.2 },
];

const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  { id: 'sample-o1', title: '13-week Treasury ladder', type: 'Cash yield', capital: 1000, risk: 1, effort: 1, score: 88, note: 'Preserves liquidity while improving idle-cash yield.', status: 'open' },
  { id: 'sample-o2', title: 'Municipal bond screening', type: 'Tax-aware income', capital: 2500, risk: 2, effort: 2, score: 76, note: 'Evaluate after-tax yield versus Treasury alternatives.', status: 'open' },
  { id: 'sample-o3', title: 'Micro-SaaS acquisition watch', type: 'Business equity', capital: 5000, risk: 4, effort: 4, score: 72, note: 'Target boring, profitable tools with low owner workload.', status: 'open' },
  { id: 'sample-o4', title: 'Invoice recovery audit service', type: 'Performance revenue', capital: 300, risk: 2, effort: 3, score: 85, note: 'Earn a percentage of verified billing recoveries.', status: 'open' },
];

const SAMPLE_SETTINGS: Settings = {
  user_id: 'guest',
  monthly_income: 4200,
  monthly_expenses: 3100,
  target_savings_rate: 0.20,
  net_worth: 13000,
  inflation_rate: 0.03,
  income_growth_rate: 0.04,
  investment_return_rate: 0.07,
  reduced_motion: false,
};

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  { id: 'sample-n1', title: 'Dining is slightly over budget', body: 'Dining spending is $60 above your monthly limit.', kind: 'alert', link_view: 'budget', read: false, created_at: new Date().toISOString() },
  { id: 'sample-n2', title: 'Savings goal on track', body: 'Your emergency fund is 45% complete.', kind: 'info', link_view: 'goals', read: false, created_at: new Date().toISOString() },
];

type GuestData = {
  budget: BudgetCategory[];
  transactions: Transaction[];
  goals: Goal[];
  investments: Investment[];
  opportunities: Opportunity[];
  notifications: NotificationItem[];
  settings: Settings | null;
  mode: 'sample' | 'empty';
};

function emptyData(): GuestData {
  return {
    budget: [],
    transactions: [],
    goals: [],
    investments: [],
    opportunities: [],
    notifications: [],
    settings: null,
    mode: 'empty',
  };
}

function sampleData(): GuestData {
  return {
    budget: SAMPLE_BUDGET,
    transactions: SAMPLE_TRANSACTIONS,
    goals: SAMPLE_GOALS,
    investments: SAMPLE_INVESTMENTS,
    opportunities: SAMPLE_OPPORTUNITIES,
    notifications: SAMPLE_NOTIFICATIONS,
    settings: SAMPLE_SETTINGS,
    mode: 'sample',
  };
}

function load(): GuestData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GuestData;
  } catch {
    // ignore corrupt data
  }
  return emptyData();
}

function save(data: GuestData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage might be full or unavailable
  }
}

export const guestRepository = {
  isGuest: true,

  initSampleMode(): void {
    save(sampleData());
  },

  initEmptyMode(): void {
    save(emptyData());
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  getMode(): 'sample' | 'empty' | null {
    const data = load();
    return data.mode;
  },

  // ---- Budget ----
  async loadBudget(_monthKey: string): Promise<BudgetCategory[]> {
    return load().budget;
  },

  async upsertBudget(item: Partial<BudgetCategory> & { id?: string }): Promise<BudgetCategory> {
    const data = load();
    const id = item.id ?? uid();
    const existing = data.budget.findIndex((b) => b.id === item.id);
    const row: BudgetCategory = {
      id,
      name: item.name ?? 'New Category',
      budget: item.budget ?? 0,
      actual: item.actual ?? 0,
      icon: item.icon ?? '💰',
      month_key: item.month_key ?? new Date().toISOString().slice(0, 7),
      template_name: item.template_name ?? null,
      rollover: item.rollover ?? false,
      notes: item.notes ?? null,
    };
    if (existing >= 0) {
      data.budget[existing] = { ...data.budget[existing], ...row };
    } else {
      data.budget.push(row);
    }
    save(data);
    return row;
  },

  async deleteBudget(id: string): Promise<void> {
    const data = load();
    data.budget = data.budget.filter((b) => b.id !== id);
    save(data);
  },

  async duplicateBudgetMonth(fromMonth: string, toMonth: string): Promise<void> {
    const data = load();
    const rows = data.budget.filter((b) => b.month_key === fromMonth);
    const copies = rows.map((r) => ({
      ...r,
      id: uid(),
      month_key: toMonth,
      actual: 0,
    }));
    data.budget.push(...copies);
    save(data);
  },

  // ---- Transactions ----
  async loadTransactions(): Promise<Transaction[]> {
    return load().transactions;
  },

  async upsertTransaction(item: Partial<Transaction> & { id?: string }): Promise<Transaction> {
    const data = load();
    const id = item.id ?? uid();
    const existing = data.transactions.findIndex((t) => t.id === item.id);
    const row: Transaction = {
      id,
      date: item.date ?? new Date().toISOString().slice(0, 10),
      merchant: item.merchant ?? 'New transaction',
      category: item.category ?? 'Uncategorized',
      amount: item.amount ?? 0,
      direction: item.direction ?? 'expense',
      status: item.status ?? 'pending',
      notes: item.notes ?? null,
      receipt_url: item.receipt_url ?? null,
      is_recurring: item.is_recurring ?? false,
    };
    if (existing >= 0) {
      data.transactions[existing] = { ...data.transactions[existing], ...row };
    } else {
      data.transactions.push(row);
    }
    save(data);
    return row;
  },

  async deleteTransaction(id: string): Promise<void> {
    const data = load();
    data.transactions = data.transactions.filter((t) => t.id !== id);
    save(data);
  },

  // ---- Goals ----
  async loadGoals(): Promise<Goal[]> {
    return load().goals;
  },

  async upsertGoal(item: Partial<Goal> & { id?: string }): Promise<Goal> {
    const data = load();
    const id = item.id ?? uid();
    const existing = data.goals.findIndex((g) => g.id === item.id);
    const row: Goal = {
      id,
      name: item.name ?? 'New Goal',
      target: item.target ?? 1000,
      current: item.current ?? 0,
      due: item.due ?? '2027-01-01',
      notes: item.notes ?? null,
      priority: item.priority ?? 0,
    };
    if (existing >= 0) {
      data.goals[existing] = { ...data.goals[existing], ...row };
    } else {
      data.goals.push(row);
    }
    save(data);
    return row;
  },

  async deleteGoal(id: string): Promise<void> {
    const data = load();
    data.goals = data.goals.filter((g) => g.id !== id);
    save(data);
  },

  // ---- Investments ----
  async loadInvestments(): Promise<Investment[]> {
    return load().investments;
  },

  async upsertInvestment(item: Partial<Investment> & { id?: string }): Promise<Investment> {
    const data = load();
    const id = item.id ?? uid();
    const existing = data.investments.findIndex((i) => i.id === item.id);
    const row: Investment = {
      id,
      name: item.name ?? 'New Holding',
      type: item.type ?? 'Other',
      value: item.value ?? 0,
      returnPct: item.returnPct ?? 0,
      notes: item.notes ?? null,
      institution: item.institution ?? null,
    };
    if (existing >= 0) {
      data.investments[existing] = { ...data.investments[existing], ...row };
    } else {
      data.investments.push(row);
    }
    save(data);
    return row;
  },

  async deleteInvestment(id: string): Promise<void> {
    const data = load();
    data.investments = data.investments.filter((i) => i.id !== id);
    save(data);
  },

  // ---- Opportunities ----
  async loadOpportunities(): Promise<Opportunity[]> {
    return load().opportunities;
  },

  async upsertOpportunity(item: Partial<Opportunity> & { id?: string }): Promise<Opportunity> {
    const data = load();
    const id = item.id ?? uid();
    const existing = data.opportunities.findIndex((o) => o.id === item.id);
    const row: Opportunity = {
      id,
      title: item.title ?? 'New Opportunity',
      type: item.type ?? 'Custom',
      note: item.note ?? '',
      capital: item.capital ?? 1000,
      risk: item.risk ?? 3,
      effort: item.effort ?? 3,
      score: item.score ?? 50,
      status: item.status ?? 'open',
    };
    if (existing >= 0) {
      data.opportunities[existing] = { ...data.opportunities[existing], ...row };
    } else {
      data.opportunities.push(row);
    }
    save(data);
    return row;
  },

  async deleteOpportunity(id: string): Promise<void> {
    const data = load();
    data.opportunities = data.opportunities.filter((o) => o.id !== id);
    save(data);
  },

  // ---- Notifications ----
  async loadNotifications(): Promise<NotificationItem[]> {
    return load().notifications;
  },

  async markNotificationRead(id: string, read: boolean): Promise<void> {
    const data = load();
    const n = data.notifications.find((n) => n.id === id);
    if (n) {
      n.read = read;
      save(data);
    }
  },

  async insertNotification(n: Partial<NotificationItem>): Promise<void> {
    const data = load();
    data.notifications.push({
      id: uid(),
      title: n.title ?? '',
      body: n.body ?? null,
      kind: n.kind ?? 'info',
      link_view: n.link_view ?? null,
      read: n.read ?? false,
      created_at: new Date().toISOString(),
    });
    save(data);
  },

  // ---- Settings ----
  async loadSettings(): Promise<Settings | null> {
    return load().settings;
  },

  async upsertSettings(s: Partial<Settings>): Promise<Settings> {
    const data = load();
    const current = data.settings ?? SAMPLE_SETTINGS;
    data.settings = { ...current, ...s, user_id: 'guest' } as Settings;
    save(data);
    return data.settings;
  },

  // ---- Profile ----
  async loadProfile(): Promise<{ display_name: string; plan: string; plan_renews_on: string | null; email: string | null } | null> {
    return { display_name: 'Guest', plan: 'Free', plan_renews_on: null, email: null };
  },

  async updateProfile(_p: { display_name?: string; avatar_url?: string | null }): Promise<void> {
    // no-op in guest mode
  },

  // ---- Export ----
  async exportAll(): Promise<Record<string, unknown>> {
    const data = load();
    return {
      budget: data.budget,
      transactions: data.transactions,
      goals: data.goals,
      investments: data.investments,
      opportunities: data.opportunities,
      settings: data.settings,
      exportedAt: new Date().toISOString(),
      note: 'Exported from guest mode — data was stored locally in your browser only.',
    };
  },

  // ---- Storage (no-op for guest) ----
  async uploadReceipt(_file: File, _userId: string): Promise<string> {
    throw new Error('Receipt upload requires an account.');
  },
};
