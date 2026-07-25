export type BudgetCategory = {
  id: string;
  name: string;
  budget: number;
  actual: number;
  icon: string;
  month_key?: string;
  template_name?: string | null;
  rollover?: boolean;
  notes?: string | null;
};

export type Transaction = {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  direction: 'income' | 'expense';
  status: 'cleared' | 'pending';
  notes?: string | null;
  receipt_url?: string | null;
  is_recurring?: boolean;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  due: string;
  notes?: string | null;
  priority?: number;
};

export type Investment = {
  id: string;
  name: string;
  type: string;
  value: number;
  returnPct: number;
  notes?: string | null;
  institution?: string | null;
};

export type Opportunity = {
  id: string;
  title: string;
  type: string;
  note: string;
  capital: number;
  risk: number;
  effort: number;
  score: number;
  status: 'open' | 'reviewing' | 'closed';
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  kind: 'info' | 'alert' | 'success' | 'warning';
  link_view: string | null;
  read: boolean;
  created_at: string;
};

export type Settings = {
  user_id: string;
  monthly_income: number;
  monthly_expenses: number;
  target_savings_rate: number;
  net_worth: number;
  inflation_rate: number;
  income_growth_rate: number;
  investment_return_rate: number;
  reduced_motion: boolean;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  plan: string;
  plan_renews_on: string | null;
};
