import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  Gauge,
  Landmark,
  LayoutDashboard,
  Menu,
  Plus,
  Radar,
  ReceiptText,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useAuth } from './lib/auth';
import { useBudget, useGoals, useInvestments, useNotifications, useOpportunities, useSettings, useTransactions } from './lib/hooks';
import { repository } from './lib/repository';
import type { BudgetCategory, Goal, Investment, NotificationItem, Opportunity, Settings, Transaction } from './lib/types';
import { analyzePrompt, financialHealthScore, forecast as forecastSeries, monthlyTrend, monteCarlo, scoreOpportunity } from './lib/finance';

import { AuthScreen } from './components/AuthScreen';

type View =
  | 'dashboard'
  | 'allocator'
  | 'scanner'
  | 'copilot'
  | 'transactions'
  | 'budget'
  | 'investments'
  | 'goals'
  | 'reports'
  | 'networth'
  | 'settings';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const nav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['allocator', 'AI CFO (Allocator)', Bot],
  ['scanner', 'Opportunity Scanner', Radar],
  ['copilot', 'Finance Copilot', Sparkles],
  ['transactions', 'Transactions', ReceiptText],
  ['budget', 'Budget', CalendarDays],
  ['investments', 'Investments', ChartNoAxesCombined],
  ['goals', 'Goals', Target],
  ['reports', 'Reports', BriefcaseBusiness],
  ['networth', 'Net Worth', Landmark],
] as const;

const quickActions = [
  ['Run Scenario', 'Model a raise or expense', TrendingUp],
  ['Should I Invest?', 'Compare investment options', ChartNoAxesCombined],
  ['Afford a Purchase?', 'See the impact on goals', CreditCard],
  ['Retirement Check', 'Review your projection', ShieldCheck],
  ['Debt Payoff Plan', 'Find the fastest route', Target],
] as const;

const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  { id: 'seed-1', title: '13-week Treasury ladder', type: 'Cash yield', capital: 1000, risk: 1, effort: 1, score: 88, note: 'Preserves liquidity while improving idle-cash yield.', status: 'open' },
  { id: 'seed-2', title: 'Municipal bond screening', type: 'Tax-aware income', capital: 2500, risk: 2, effort: 2, score: 76, note: 'Evaluate after-tax yield versus Treasury alternatives.', status: 'open' },
  { id: 'seed-3', title: 'Micro-SaaS acquisition watch', type: 'Business equity', capital: 5000, risk: 4, effort: 4, score: 72, note: 'Target boring, profitable tools with low owner workload.', status: 'open' },
  { id: 'seed-4', title: 'Invoice recovery audit service', type: 'Performance revenue', capital: 300, risk: 2, effort: 3, score: 85, note: 'Earn a percentage of verified billing recoveries.', status: 'open' },
];

export default function App() {
  const { ready, userId, profile, settings } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const monthKey = new Date().toISOString().slice(0, 7);
  const budgetState = useBudget(monthKey);
  const txState = useTransactions();
  const goalsState = useGoals();
  const invState = useInvestments();
  const oppState = useOpportunities();
  const notifState = useNotifications();

  const income = settings?.monthly_income ?? 5600;
  const expenses = settings?.monthly_expenses ?? 4975;
  const goal = settings?.target_savings_rate ?? 0.22;
  const netWorth = settings?.net_worth ?? 23750;

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const x = Math.max(-1, Math.min(1, (e.gamma || 0) / 35));
      const y = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
      document.documentElement.style.setProperty('--tilt-x', `${x * 4}px`);
      document.documentElement.style.setProperty('--tilt-y', `${y * 3}px`);
    };
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, []);

  const savings = income - expenses;
  const savingsRate = income ? savings / income : 0;
  const targetSavings = income * goal;
  const gap = Math.max(0, targetSavings - savings);

  const forecast = useMemo(
    () =>
      forecastSeries({
        income,
        expenses,
        netWorth,
        years: 7,
        incomeGrowth: settings?.income_growth_rate ?? 0.045,
        inflation: settings?.inflation_rate ?? 0.03,
        investmentReturn: settings?.investment_return_rate ?? 0.035,
      }),
    [income, expenses, netWorth, settings]
  );

  const donut = [
    { name: 'Expenses', value: expenses, color: '#f84f75' },
    { name: 'Savings', value: Math.max(0, savings), color: '#3ea8ff' },
  ];

  const navigate = (v: View) => {
    setView(v);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [question, setQuestion] = useState('How do I reach a 22% savings rate?');
  const [answer, setAnswer] = useState('');
  const [confidence, setConfidence] = useState(82);

  const runCopilot = (prompt = question) => {
    setQuestion(prompt);
    const result = analyzePrompt(prompt, {
      income,
      expenses,
      savings,
      savingsRate,
      targetRate: goal,
      targetSavings,
      gap,
      netWorth,
      budget: budgetState.data,
      goals: goalsState.data,
      investments: invState.data,
      transactions: txState.data,
    });
    setAnswer(result.text);
    setConfidence(result.confidence);
    navigate('copilot');
  };

  const exportData = async () => {
    const data = await repository.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'capital-os-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!ready) {
    return <div className="app-shell" style={{ placeItems: 'center' }}><p style={{ color: '#8d9cb0' }}>Loading…</p></div>;
  }
  if (!userId) {
    return <AuthScreen />;
  }

  const content =
    view === 'dashboard' ? (
      <Dashboard
        {...{
          income,
          expenses,
          goal,
          netWorth,
          savings,
          savingsRate,
          targetSavings,
          gap,
          forecast,
          donut,
          budget: budgetState.data,
          budgetLoading: budgetState.loading,
          txLoading: txState.loading,
          tasks: [],
          setTasks: () => {},
          navigate,
          runCopilot,
          opportunities: oppState.data.length ? oppState.data : DEFAULT_OPPORTUNITIES,
          notifications: notifState.data,
          healthScore: financialHealthScore({
            income, expenses, savings, savingsRate, targetRate: goal, targetSavings, gap, netWorth,
            budget: budgetState.data, goals: goalsState.data, investments: invState.data, transactions: txState.data,
          }),
        }}
      />
    ) : view === 'budget' ? (
      <Budget state={budgetState} monthKey={monthKey} />
    ) : view === 'transactions' ? (
      <Transactions state={txState} />
    ) : view === 'investments' ? (
      <Investments state={invState} />
    ) : view === 'goals' ? (
      <Goals state={goalsState} />
    ) : view === 'reports' ? (
      <Reports {...{ income, expenses, savings, savingsRate, forecast, exportData }} />
    ) : view === 'networth' ? (
      <NetWorth value={netWorth} settings={settings} forecast={forecast} investments={invState.data} />
    ) : view === 'scanner' ? (
      <Scanner state={oppState} onReview={(title) => runCopilot(`Evaluate this opportunity: ${title}`)} />
    ) : view === 'copilot' ? (
      <Copilot {...{ question, setQuestion, answer, confidence, run: runCopilot }} />
    ) : view === 'settings' ? (
      <SettingsView settings={settings} profile={profile} />
    ) : (
      <Allocator {...{ income, expenses, goal, gap, savings, targetSavings, settings }} />
    );

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? 'open' : ''}>
        <div className="brand">
          <div className="logo-orb" />
          <div>
            <strong>CAPITAL OS</strong>
            <span>AI CFO COMMAND CENTER</span>
          </div>
          <button className="close-mobile" onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id as View)}>
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
          <button className={view === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}>
            <SettingsIcon size={19} />
            <span>Settings</span>
          </button>
        </nav>
        <div className="copilot-card">
          <div>
            <strong>AI Copilot</strong>
            <span>BETA</span>
          </div>
          <p>Ask any financial question or run a scenario.</p>
          <button onClick={() => navigate('copilot')}>
            <Bot size={17} /> Ask Copilot
          </button>
        </div>
        <div className="premium-card">
          <div>
            <span>👑</span>
            <div>
              <strong>{profile?.plan ?? 'Premium'} Plan</strong>
              <small>Renews {profile?.plan_renews_on ?? 'Aug 24, 2026'}</small>
            </div>
          </div>
          <div className="premium-progress">
            <span />
          </div>
          <small>78%</small>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)}>
            <Menu />
          </button>
          <div>
            <h1>Good morning, {profile?.display_name || 'Tre'} 👋</h1>
            <p>Here's your financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="top-actions">
            <button onClick={() => setSearchOpen(!searchOpen)}>
              <Search />
            </button>
            <button className="notify" onClick={() => setNotificationsOpen(!notificationsOpen)}>
              <Bell />
              <span>{notifState.data.filter((n) => !n.read).length || 0}</span>
            </button>
            <div className="profile">
              <div className="avatar">
                <UserRound />
              </div>
              <div>
                <strong>{profile?.display_name || 'Tre'}</strong>
                <small>{profile?.plan ?? 'Premium'}</small>
              </div>
            </div>
          </div>
          {searchOpen && (
            <div className="floating-menu search-menu">
              <input
                autoFocus
                placeholder="Search modules…"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  const hit = nav.find((n) => n[1].toLowerCase().includes(q));
                  if (q && hit) navigate(hit[0] as View);
                }}
              />
              <small>Type Budget, Goals, Reports…</small>
            </div>
          )}
          {notificationsOpen && (
            <div className="floating-menu notification-menu">
              <strong>{notifState.data.length || 0} financial alerts</strong>
              {notifState.data.length === 0 && <small>No alerts right now.</small>}
              {notifState.data.slice(0, 8).map((n) => (
                <button key={n.id} onClick={() => n.link_view && navigate(n.link_view as View)}>
                  {n.title}
                </button>
              ))}
            </div>
          )}
        </header>
        {content}
      </main>
    </div>
  );
}

function Dashboard(p: any) {
  const {
    income, expenses, goal, netWorth, savings, savingsRate, targetSavings, gap, forecast, donut,
    budget, budgetLoading, txLoading, navigate, runCopilot, opportunities, healthScore,
  } = p;
  return (
    <>
      <section className="summary-strip">
        <div className="summary-copy">
          <span>
            <Sparkles size={17} /> AI CFO SUMMARY
          </span>
          <h2>You're on track to save {money(savings)} this month.</h2>
          <p>
            Increase monthly savings by <b>{money(gap)}</b> to hit your {Math.round(goal * 100)}% target.
          </p>
        </div>
        <Metric label="Savings Rate" value={pct(savingsRate)} meta={`${Math.round(goal * 100)}% goal`} positive />
        <Metric label="Monthly Savings" value={money(savings)} meta={`${money(targetSavings)} goal`} positive />
        <Metric label="Net Worth" value={money(netWorth)} meta="↑ 5.2%" positive />
        <div className="goal-ring">
          <div className="ring">
            <span>{healthScore}</span>
          </div>
          <div>
            <small>Financial Health</small>
            <strong>{healthScore}/100</strong>
          </div>
        </div>
      </section>
      <section className="dashboard-grid top-grid">
        <Panel title="Cash Flow – This Month">
          <div className="cash-flow-wrap">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={54} outerRadius={76} paddingAngle={2}>
                    {donut.map((d: any, i: number) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{money(savings)}</strong>
                <span>Net Cash Flow</span>
              </div>
            </div>
            <div className="legend-stack">
              <Legend color="#46d36f" label="Income" value={money(income)} />
              <Legend color="#f84f75" label="Expenses" value={money(expenses)} />
              <Legend color="#3ea8ff" label="Savings" value={money(savings)} />
            </div>
          </div>
          <div className="mini-footer">
            <span>
              Target Savings Rate <b>{Math.round(goal * 100)}%</b>
            </span>
            <span>
              Gap to Target <b className="danger">{money(gap)}</b>
            </span>
          </div>
        </Panel>
        <Panel title="Cash Flow Trend" action="6 Months" onAction={() => navigate('reports')}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend(p.transactions || [])}>
              <CartesianGrid stroke="#1c2d43" vertical={false} />
              <XAxis dataKey="month" stroke="#72839a" />
              <YAxis stroke="#72839a" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(Number(v))} />
              <Line type="monotone" dataKey="income" stroke="#4fda77" strokeWidth={3} />
              <Line type="monotone" dataKey="expenses" stroke="#fa577b" strokeWidth={3} />
              <Line type="monotone" dataKey="savings" stroke="#43a8ff" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Net Worth" action="6 Months" onAction={() => navigate('networth')}>
          <div className="panel-hero">
            <strong>{money(netWorth)}</strong>
            <span>↑ $1,175 (5.2%)</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={forecast}>
              <CartesianGrid stroke="#1c2d43" vertical={false} />
              <XAxis dataKey="year" stroke="#72839a" />
              <YAxis stroke="#72839a" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="balance" stroke="#9d62ff" fill="#9d62ff33" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </section>
      <section className="dashboard-grid mid-grid">
        <Panel title="Budget Pressure Points" subtitle="Top categories over budget">
          {budgetLoading ? (
            <p style={{ color: '#8d9cb0', fontSize: 12 }}>Loading…</p>
          ) : (
            <div className="pressure-list">
              {budget
                .slice()
                .sort((a: BudgetCategory, b: BudgetCategory) => b.actual / b.budget - a.actual / a.budget)
                .slice(0, 5)
                .map((c: BudgetCategory) => (
                  <div className="pressure" key={c.id}>
                    <div className="pressure-icon">{c.icon}</div>
                    <div className="pressure-body">
                      <div>
                        <span>{c.name}</span>
                        <small>
                          {money(c.actual)} / {money(c.budget)}
                        </small>
                      </div>
                      <div className="track">
                        <span style={{ width: `${Math.min(100, (c.actual / c.budget) * 70)}%` }} />
                      </div>
                    </div>
                    <b>{Math.round((c.actual / c.budget) * 100)}%</b>
                  </div>
                ))}
            </div>
          )}
          <button className="text-link" onClick={() => navigate('budget')}>
            View full budget <ChevronRight size={15} />
          </button>
        </Panel>
        <Panel title="Six Year Wealth Forecast">
          <div className="forecast-wrap">
            <div className="forecast-stats">
              <small>2032 Projection</small>
              <strong className="purple">{money(forecast[forecast.length - 1]?.balance || 0)}</strong>
              <small>Total Contributions</small>
              <strong className="green">$45,000</strong>
              <small>Investment Growth</small>
              <strong className="purple">$34,735</strong>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={forecast}>
                <CartesianGrid stroke="#1c2d43" vertical={false} />
                <XAxis dataKey="year" stroke="#72839a" />
                <YAxis stroke="#72839a" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="balance" stroke="#a96fff" strokeWidth={3} />
                <Line type="monotone" dataKey="investments" stroke="#43d574" strokeDasharray="6 6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Opportunity Scanner – Top Picks" action="See all" onAction={() => navigate('scanner')}>
          <div className="opportunity-mini">
            {opportunities.slice(0, 4).map((o: Opportunity, i: number) => (
              <button
                className="opportunity-row"
                key={o.id}
                onClick={() => runCopilot(`Evaluate this opportunity: ${o.title}`)}
              >
                <span className={`opp-icon tone-${i}`}>
                  {[<ChartNoAxesCombined />, <Building2 />, <Bot />, <WalletCards />][i]}
                </span>
                <div>
                  <strong>{o.title}</strong>
                  <small>{o.type}</small>
                </div>
                <b>
                  {o.score}
                  <small>Score</small>
                </b>
                <em>
                  {money(o.capital)}
                  <small>Capital Req.</small>
                </em>
              </button>
            ))}
          </div>
        </Panel>
      </section>
      <section className="bottom-grid">
        <Panel title="Finance Copilot – Quick Actions">
          <div className="quick-actions">
            {quickActions.map(([title, desc, Icon]) => (
              <button key={title} onClick={() => runCopilot(title)}>
                <div>
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
                <Icon />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="This Week's Action Plan">
          <div className="tasks">
            {[
              'Review Dining & Delivery spending',
              `Move ${money(savings)} to savings (auto-transfer)`,
              'Evaluate 2 opportunities',
              'Increase emergency fund',
            ].map((t, i) => (
              <button className={`task`} key={t} onClick={() => navigate(i === 0 ? 'budget' : i === 1 ? 'goals' : 'scanner')}>
                <span />
                <p>{t}</p>
              </button>
            ))}
          </div>
          <button className="text-link" onClick={() => navigate('goals')}>
            View all actions <ChevronRight size={15} />
          </button>
        </Panel>
      </section>
    </>
  );
}

function Budget({ state, monthKey }: { state: any; monthKey: string }) {
  const { data: budget, loading, error, reload } = state;
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BudgetCategory[] | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [budget]);

  const rows = draft ?? budget;
  const totalB = rows.reduce((s: number, c: BudgetCategory) => s + c.budget, 0);
  const totalA = rows.reduce((s: number, c: BudgetCategory) => s + c.actual, 0);

  const update = (id: string, k: 'budget' | 'actual', v: number) =>
    setDraft(rows.map((c: BudgetCategory) => (c.id === id ? { ...c, [k]: v } : c)));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await Promise.all(draft.map((c) => repository.upsertBudget({ ...c, month_key: monthKey })));
      setDraft(null);
      await reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const add = () =>
    setDraft([
      ...rows,
      { id: uid(), name: 'New Category', budget: 0, actual: 0, icon: '💰', month_key: monthKey },
    ]);

  const remove = async (id: string) => {
    if (draft) {
      setDraft(draft.filter((c) => c.id !== id));
    } else {
      await repository.deleteBudget(id);
      reload();
    }
  };

  const duplicateNextMonth = async () => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const nextKey = next.toISOString().slice(0, 7);
    try {
      await repository.duplicateBudgetMonth(monthKey, nextKey);
      alert(`Budget duplicated to ${nextKey}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Workspace eyebrow="SPENDING CONTROL" title="Budget" desc="Edit monthly limits and actual spending. Changes save to your account automatically.">
      <div className="module-kpis">
        <Metric label="Budgeted" value={money(totalB)} meta="Monthly plan" />
        <Metric label="Actual" value={money(totalA)} meta={totalA > totalB ? 'Over plan' : 'Under plan'} />
        <Metric label="Variance" value={money(totalB - totalA)} meta="Remaining" positive={totalB >= totalA} />
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading budget…</p>
      ) : (
        <>
          <div className="data-card budget-table">
            <div className="table-head">
              <span>Category</span>
              <span>Budget</span>
              <span>Actual</span>
              <span>Status</span>
              <span />
            </div>
            {rows.map((c: BudgetCategory) => (
              <div className="table-row" key={c.id}>
                <strong>{c.icon} {c.name}</strong>
                <input type="number" value={c.budget} onChange={(e) => update(c.id, 'budget', Number(e.target.value))} />
                <input type="number" value={c.actual} onChange={(e) => update(c.id, 'actual', Number(e.target.value))} />
                <span className={c.actual > c.budget ? 'status bad' : 'status good'}>
                  {c.actual > c.budget ? 'Over' : 'On track'}
                </span>
                <button onClick={() => remove(c.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button className="add-row" onClick={add}>
              <Plus size={16} /> Add category
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {draft && (
              <button className="primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
            <button onClick={duplicateNextMonth}>Duplicate to next month</button>
          </div>
        </>
      )}
    </Workspace>
  );
}

function Transactions({ state }: { state: any }) {
  const { data: items, loading, error, reload } = state;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const filtered = items.filter((t: Transaction) => {
    if (filter === 'income' && t.direction !== 'income') return false;
    if (filter === 'expense' && t.direction !== 'expense') return false;
    if (filter === 'pending' && t.status !== 'pending') return false;
    if (search && !`${t.merchant} ${t.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const update = async (id: string, patch: Partial<Transaction>) => {
    const item = items.find((t: Transaction) => t.id === id);
    if (!item) return;
    const updated = { ...item, ...patch };
    try {
      await repository.upsertTransaction(updated);
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const add = async () => {
    try {
      await repository.upsertTransaction({
        id: undefined as any,
        date: new Date().toISOString().slice(0, 10),
        merchant: 'New transaction',
        category: 'Uncategorized',
        amount: 0,
        direction: 'expense',
        status: 'pending',
      });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: string) => {
    try {
      await repository.deleteTransaction(id);
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Workspace eyebrow="CASH LEDGER" title="Transactions" desc="Review, search, filter, and add activity. Connect bank sync later without replacing this interface.">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input placeholder="Search merchant or category…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} style={{ flex: 1, minWidth: 200, background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 10 }} />
        <select value={filter} onChange={(e) => { setFilter(e.target.value as any); setPage(0); }} style={{ background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 10 }}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading transactions…</p>
      ) : (
        <>
          <div className="data-card">
            <div className="table-head tx">
              <span>Date</span>
              <span>Merchant</span>
              <span>Category</span>
              <span>Amount</span>
              <span>Status</span>
              <span />
            </div>
            {pageItems.map((t: Transaction) => (
              <div className="table-row tx" key={t.id}>
                <input type="date" value={t.date} onChange={(e) => update(t.id, { date: e.target.value })} />
                <input value={t.merchant} onChange={(e) => update(t.id, { merchant: e.target.value })} />
                <input value={t.category} onChange={(e) => update(t.id, { category: e.target.value })} />
                <input type="number" value={t.amount} onChange={(e) => update(t.id, { amount: Number(e.target.value) })} />
                <span className="status good">{t.status}</span>
                <button onClick={() => remove(t.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {pageItems.length === 0 && <p style={{ color: '#8d9cb0', padding: 16 }}>No transactions match.</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button className="add-row" onClick={add}>
              <Plus size={16} /> Add transaction
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={page === 0} onClick={() => setPage(page - 1)} style={{ background: '#10243b', border: '1px solid #29415d', color: '#5ec7ff', borderRadius: 8, padding: '8px 12px' }}>Prev</button>
              <small style={{ color: '#8d9cb0' }}>Page {page + 1} of {pages}</small>
              <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} style={{ background: '#10243b', border: '1px solid #29415d', color: '#5ec7ff', borderRadius: 8, padding: '8px 12px' }}>Next</button>
            </div>
          </div>
        </>
      )}
    </Workspace>
  );
}

function Investments({ state }: { state: any }) {
  const { data: items, loading, error, reload } = state;
  const total = items.reduce((s: number, x: Investment) => s + x.value, 0);
  const weightedReturn = items.length
    ? items.reduce((s: number, x: Investment) => s + x.value * x.returnPct, 0) / Math.max(1, total)
    : 0;

  const update = async (id: string, patch: Partial<Investment>) => {
    const item = items.find((x: Investment) => x.id === id);
    if (!item) return;
    try {
      await repository.upsertInvestment({ ...item, ...patch });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const add = async () => {
    try {
      await repository.upsertInvestment({ id: undefined as any, name: 'New Holding', type: 'Other', value: 0, returnPct: 0 });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const remove = async (id: string) => {
    await repository.deleteInvestment(id);
    reload();
  };

  return (
    <Workspace eyebrow="PORTFOLIO" title="Investments" desc="Track asset values and expected returns. Brokerage aggregation is ready for a future connection.">
      <div className="module-kpis">
        <Metric label="Portfolio Value" value={money(total)} meta={`${items.length} holdings`} positive />
        <Metric label="Weighted Return" value={`${weightedReturn.toFixed(1)}%`} meta="Planning estimate" />
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading…</p>
      ) : (
        <>
          <div className="cards-list">
            {items.map((i: Investment) => (
              <article className="data-card holding" key={i.id}>
                <div>
                  <small>{i.type}</small>
                  <input value={i.name} onChange={(e) => update(i.id, { name: e.target.value })} />
                </div>
                <input type="number" value={i.value} onChange={(e) => update(i.id, { value: Number(e.target.value) })} />
                <input type="number" value={i.returnPct} onChange={(e) => update(i.id, { returnPct: Number(e.target.value) })} />
                <button onClick={() => remove(i.id)}>
                  <Trash2 />
                </button>
              </article>
            ))}
          </div>
          <button className="primary" onClick={add}>
            <Plus /> Add holding
          </button>
        </>
      )}
    </Workspace>
  );
}

function Goals({ state }: { state: any }) {
  const { data: items, loading, error, reload } = state;
  const update = async (id: string, patch: Partial<Goal>) => {
    const item = items.find((g: Goal) => g.id === id);
    if (!item) return;
    try {
      await repository.upsertGoal({ ...item, ...patch });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };
  const add = async () => {
    try {
      await repository.upsertGoal({ id: undefined as any, name: 'New Goal', target: 1000, current: 0, due: '2027-01-01' });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };
  const remove = async (id: string) => {
    await repository.deleteGoal(id);
    reload();
  };
  return (
    <Workspace eyebrow="OUTCOMES" title="Goals" desc="Turn financial priorities into measurable targets and progress checkpoints.">
      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Loading…</p>
      ) : (
        <>
          <div className="cards-list">
            {items.map((g: Goal) => (
              <article className="data-card goal-card" key={g.id}>
                <div>
                  <input value={g.name} onChange={(e) => update(g.id, { name: e.target.value })} />
                  <small>Due {g.due}</small>
                </div>
                <strong>{money(g.current)} / {money(g.target)}</strong>
                <div className="allocation-progress">
                  <span style={{ width: `${Math.min(100, (g.current / g.target) * 100)}%` }} />
                </div>
                <div className="goal-inputs">
                  <input type="number" value={g.current} onChange={(e) => update(g.id, { current: Number(e.target.value) })} />
                  <input type="number" value={g.target} onChange={(e) => update(g.id, { target: Number(e.target.value) })} />
                  <input type="date" value={g.due} onChange={(e) => update(g.id, { due: e.target.value })} />
                  <button onClick={() => remove(g.id)}>
                    <Trash2 />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button className="primary" onClick={add}>
            <Plus /> Add goal
          </button>
        </>
      )}
    </Workspace>
  );
}

function Reports({ income, expenses, savings, savingsRate, forecast, exportData }: any) {
  return (
    <Workspace eyebrow="EXECUTIVE REPORTING" title="Reports" desc="A decision-ready monthly snapshot with portable data export.">
      <button className="primary workspace-action" onClick={exportData}>
        <Download size={17} /> Export data
      </button>
      <div className="module-kpis">
        <Metric label="Income" value={money(income)} meta="Monthly" positive />
        <Metric label="Expenses" value={money(expenses)} meta="Monthly" />
        <Metric label="Savings" value={money(savings)} meta={pct(savingsRate)} positive />
      </div>
      <div className="data-card report-brief">
        <h3>Capital OS Monthly Brief</h3>
        <p>
          Your current plan produces {money(savings)} in monthly savings. The six-year model projects net worth of{' '}
          {money(forecast[forecast.length - 1]?.balance || 0)} by {forecast[forecast.length - 1]?.year || 2032} under the
          current raise, inflation, and return assumptions.
        </p>
        <h4>Priority</h4>
        <p>Close the savings-rate gap before increasing lifestyle spending. Budget edits, goals, investments, and transactions are persisted to your account.</p>
      </div>
    </Workspace>
  );
}

function NetWorth({ value, settings, forecast, investments }: any) {
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setLocal(value), [value]);
  const save = async () => {
    setSaving(true);
    try {
      await repository.upsertSettings({ user_id: settings?.user_id, net_worth: local });
      setSaving(false);
    } catch (e: any) {
      alert(e.message);
      setSaving(false);
    }
  };
  return (
    <Workspace eyebrow="BALANCE SHEET" title="Net Worth" desc="Track the current figure and forecast its path under your financial plan.">
      <div className="module-kpis">
        <label className="metric editable-metric">
          <small>Current Net Worth</small>
          <input type="number" value={local} onChange={(e) => setLocal(Number(e.target.value))} />
        </label>
        <Metric label="Investments" value={money(investments.reduce((s: number, x: Investment) => s + x.value, 0))} meta="Tracked assets" positive />
        <Metric label="2032 Projection" value={money(forecast[forecast.length - 1]?.balance || 0)} meta="Base case" positive />
      </div>
      <button className="primary" onClick={save} disabled={saving} style={{ marginBottom: 16 }}>
        {saving ? 'Saving…' : 'Save net worth'}
      </button>
      <div className="data-card chart-card">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={forecast}>
            <CartesianGrid stroke="#1c2d43" vertical={false} />
            <XAxis dataKey="year" stroke="#72839a" />
            <YAxis stroke="#72839a" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="balance" stroke="#9d62ff" fill="#9d62ff33" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Workspace>
  );
}

function Scanner({ state, onReview }: { state: any; onReview: (s: string) => void }) {
  const { data: items, loading, error, reload } = state;
  const [stamp, setStamp] = useState('Ready');
  const opportunities = items.length ? items : DEFAULT_OPPORTUNITIES;

  const refresh = () => {
    reload();
    setStamp(`Updated ${new Date().toLocaleTimeString()}`);
  };

  const add = async () => {
    try {
      const s = scoreOpportunity({ capital: 1000, risk: 3, effort: 3, note: '' });
      await repository.upsertOpportunity({
        id: undefined as any,
        title: 'New Opportunity',
        type: 'Custom',
        note: 'Describe this opportunity.',
        capital: 1000,
        risk: 3,
        effort: 3,
        score: s.score,
        status: 'open',
      });
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Workspace eyebrow="WEALTH ENGINE" title="Opportunity Scanner" desc="Ranked by capital efficiency, risk, effort, and strategic fit.">
      <button className="primary workspace-action" onClick={refresh}>
        <Radar size={17} /> Refresh Scan
      </button>
      <button className="primary" onClick={add} style={{ marginBottom: 14 }}>
        <Plus /> Add opportunity
      </button>
      <small className="refresh-stamp">{stamp}</small>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {loading ? (
        <p style={{ color: '#8d9cb0' }}>Scanning…</p>
      ) : (
        <div className="scanner-grid">
          {[...opportunities]
            .sort((a, b) => b.score - a.score)
            .map((o: Opportunity) => (
              <article key={o.id}>
                <div className="score-badge">{o.score}</div>
                <div>
                  <span>{o.type}</span>
                  <h3>{o.title}</h3>
                  <p>{o.note}</p>
                  <div className="tags">
                    <small>Capital {money(o.capital)}</small>
                    <small>Risk {o.risk}/5</small>
                    <small>Effort {o.effort}/5</small>
                  </div>
                </div>
                <button onClick={() => onReview(o.title)}>
                  Review <ChevronRight size={16} />
                </button>
              </article>
            ))}
        </div>
      )}
    </Workspace>
  );
}

function Copilot({ question, setQuestion, answer, confidence, run }: any) {
  return (
    <Workspace eyebrow="DECISION INTELLIGENCE" title="Finance Copilot" desc="Model financial decisions using your current cash flow and targets.">
      <div className="copilot-workspace">
        <div className="chat-card">
          <div className="ai-avatar">
            <Sparkles />
          </div>
          <h3>What decision are we making?</h3>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
          <div className="prompt-chips">
            <button onClick={() => setQuestion('Where should my next $1,000 go?')}>Allocate $1,000</button>
            <button onClick={() => setQuestion('Can I afford a $2,000 purchase?')}>Affordability</button>
            <button onClick={() => setQuestion('What happens if income rises 8%?')}>Income scenario</button>
            <button onClick={() => setQuestion('How do I pay off my debt fastest?')}>Debt payoff</button>
          </div>
          <button className="primary" onClick={() => run()}>
            Analyze Decision
          </button>
        </div>
        <div className="decision-card">
          <span className="eyebrow">DECISION BRIEF</span>
          <h3>Recommended Action</h3>
          <p>{answer || 'Ask a question to generate a recommendation using your current financial model.'}</p>
          <div className="confidence">
            <span>Model confidence</span>
            <div>
              <i />
              <b>{confidence}%</b>
            </div>
          </div>
          <small>Educational decision support only — not personalized financial advice.</small>
        </div>
      </div>
    </Workspace>
  );
}

function Allocator({ income, expenses, goal, gap, savings, targetSavings, settings }: any) {
  const [localIncome, setLocalIncome] = useState(income);
  const [localExpenses, setLocalExpenses] = useState(expenses);
  const [localGoal, setLocalGoal] = useState(goal);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalIncome(income);
    setLocalExpenses(expenses);
    setLocalGoal(goal);
  }, [income, expenses, goal]);

  const localSavings = localIncome - localExpenses;
  const localTarget = localIncome * localGoal;
  const localGap = Math.max(0, localTarget - localSavings);

  const apply = async () => {
    setSaving(true);
    try {
      await repository.upsertSettings({
        user_id: settings?.user_id,
        monthly_income: localIncome,
        monthly_expenses: Math.max(0, localIncome - localTarget),
        target_savings_rate: localGoal,
      });
      setSaving(false);
    } catch (e: any) {
      alert(e.message);
      setSaving(false);
    }
  };

  return (
    <Workspace eyebrow="CAPITAL ALLOCATION" title="AI CFO Allocator" desc="Adjust assumptions and immediately see the path to your target savings rate.">
      <div className="allocator-grid">
        <div className="panel form-panel">
          <label>
            Monthly take-home income
            <input type="number" value={localIncome} onChange={(e) => setLocalIncome(Number(e.target.value))} />
          </label>
          <label>
            Monthly expenses
            <input type="number" value={localExpenses} onChange={(e) => setLocalExpenses(Number(e.target.value))} />
          </label>
          <label>
            Target savings rate
            <div className="range-line">
              <input type="range" min="10" max="40" value={localGoal * 100} onChange={(e) => setLocalGoal(Number(e.target.value) / 100)} />
              <b>{Math.round(localGoal * 100)}%</b>
            </div>
          </label>
        </div>
        <div className="panel allocation-result">
          <span className="eyebrow">CURRENT PLAN</span>
          <strong>{money(localSavings)}</strong>
          <small>Monthly savings</small>
          <div className="allocation-progress">
            <span style={{ width: `${Math.min(100, localSavings / Math.max(1, localTarget) * 100)}%` }} />
          </div>
          <p>
            You need <b>{money(localGap)}</b> more per month to reach {money(localTarget)}.
          </p>
          <button onClick={apply} disabled={saving}>
            {saving ? 'Saving…' : 'Apply Recommended Plan'}
          </button>
        </div>
      </div>
    </Workspace>
  );
}

function SettingsView({ settings, profile }: { settings: Settings | null; profile: any }) {
  const [form, setForm] = useState<Settings | null>(settings);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => setForm(settings), [settings]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    try {
      await repository.upsertSettings(form);
      if (name !== profile?.display_name) await repository.updateProfile({ display_name: name });
      setSaved(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <p style={{ color: '#8d9cb0' }}>Loading settings…</p>;

  const field = (key: keyof Settings, label: string, step = 0.01) => (
    <label style={{ display: 'grid', gap: 8, color: '#aebbd0', marginBottom: 14 }}>
      {label}
      <input
        type="number"
        step={step}
        value={form[key] as number}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        style={{ background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 12 }}
      />
    </label>
  );

  return (
    <Workspace eyebrow="PREFERENCES" title="Settings" desc="Manage your profile and financial assumptions.">
      <button className="primary workspace-action" onClick={signOut} style={{ background: 'linear-gradient(135deg,#b3413f,#e8553f)' }}>
        Sign out
      </button>
      <div className="module-kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="data-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.25px', marginBottom: 14 }}>Profile</h3>
          <label style={{ display: 'grid', gap: 8, color: '#aebbd0', marginBottom: 14 }}>
            Display name
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ background: '#071321', border: '1px solid #22364d', color: 'white', borderRadius: 8, padding: 12 }} />
          </label>
          <small style={{ color: '#8493a9' }}>{profile?.email ?? ''}</small>
        </div>
        <div className="data-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.25px', marginBottom: 14 }}>Financial Assumptions</h3>
          {field('monthly_income', 'Monthly income', 100)}
          {field('monthly_expenses', 'Monthly expenses', 100)}
          {field('target_savings_rate', 'Target savings rate (0–1)')}
          {field('net_worth', 'Net worth', 100)}
          {field('income_growth_rate', 'Income growth rate')}
          {field('inflation_rate', 'Inflation rate')}
          {field('investment_return_rate', 'Investment return rate')}
        </div>
      </div>
      <button className="primary" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? 'Saving…' : 'Save settings'}
      </button>
      {saved && <small style={{ color: '#49df75', display: 'block', marginTop: 8 }}>Saved.</small>}
    </Workspace>
  );
}

function Workspace({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc: string; children: ReactNode }) {
  return (
    <section className="workspace">
      <div className="workspace-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Panel({ title, subtitle, action, onAction, children, className = '' }: any) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <button onClick={onAction}>{action}</button>}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, meta, positive = false }: { label: string; value: string; meta: string; positive?: boolean }) {
  return (
    <div className="metric">
      <small>{label}</small>
      <div>
        <strong className={positive ? 'green' : ''}>{value}</strong>
        <span>{meta}</span>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="legend-row">
      <span style={{ background: color }} />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

const tooltipStyle = { background: '#0c1727', border: '1px solid #23344b', borderRadius: 12, color: '#fff' };
