import type { ReactNode } from 'react';
import {
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Radar,
  ReceiptText,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export const tooltipStyle = { background: '#0c1727', border: '1px solid #23344b', borderRadius: 12, color: '#fff' };

export const navItems = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'allocator', label: 'AI CFO (Allocator)', Icon: Bot },
  { id: 'scanner', label: 'Opportunity Scanner', Icon: Radar },
  { id: 'copilot', label: 'Finance Copilot', Icon: Sparkles },
  { id: 'transactions', label: 'Transactions', Icon: ReceiptText },
  { id: 'budget', label: 'Budget', Icon: CalendarDays },
  { id: 'investments', label: 'Investments', Icon: ChartNoAxesCombined },
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'reports', label: 'Reports', Icon: BriefcaseBusiness },
  { id: 'networth', label: 'Net Worth', Icon: Landmark },
] as const;

export const settingsNav = { id: 'settings', label: 'Settings', Icon: SettingsIcon } as const;

export const quickActions = [
  { title: 'Run Scenario', desc: 'Model a raise or expense', Icon: TrendingUp },
  { title: 'Should I Invest?', desc: 'Compare investment options', Icon: ChartNoAxesCombined },
  { title: 'Afford a Purchase?', desc: 'See the impact on goals', Icon: CreditCard },
  { title: 'Retirement Check', desc: 'Review your projection', Icon: ShieldCheck },
  { title: 'Debt Payoff Plan', desc: 'Find the fastest route', Icon: Target },
] as const;

export function Workspace({ eyebrow, title, desc, children }: {
  eyebrow: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
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

export function Panel({ title, subtitle, action, onAction, children, className = '' }: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
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

export function Metric({ label, value, meta, positive = false }: {
  label: string;
  value: string;
  meta: string;
  positive?: boolean;
}) {
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

export function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="legend-row">
      <span style={{ background: color }} />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
