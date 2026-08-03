import { useNavigate } from 'react-router-dom';
import {
  Bot,
  ChartNoAxesCombined,
  Landmark,
  LayoutDashboard,
  Radar,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data-context';

export function LandingPage() {
  const navigate = useNavigate();
  const { startSampleMode, startEmptyMode } = useData();
  const { userId } = useAuth();

  const exploreSample = () => {
    startSampleMode();
    navigate('/dashboard');
  };

  const startFresh = () => {
    startEmptyMode();
    navigate('/dashboard');
  };

  return (
    <div className="landing-shell">
      <div className="landing-hero">
        <div className="landing-nav">
          <div className="brand">
            <div className="logo-orb" />
            <div>
              <strong>CAPITAL OS</strong>
              <span>AI CFO COMMAND CENTER</span>
            </div>
          </div>
          <div className="landing-nav-actions">
            <button className="ghost-btn" onClick={() => navigate('/login')}>Sign in</button>
            <button className="primary" onClick={() => navigate('/signup')}>Create account</button>
          </div>
        </div>

        <div className="hero-content">
          <span className="hero-badge"><Sparkles size={15} /> AI-Powered Financial Operating System</span>
          <h1>Your personal <span className="grad-text">AI CFO</span>, always on.</h1>
          <p className="hero-sub">
            Model financial decisions, track cash flow, scan opportunities, and forecast your wealth —
            all in one command center. No account needed to explore.
          </p>
          <div className="hero-cta">
            <button className="primary lg" onClick={exploreSample}>
              <LayoutDashboard size={19} /> Explore with sample data
            </button>
            <button className="ghost-btn lg" onClick={startFresh}>
              Start with an empty dashboard
            </button>
            {userId && (
              <button className="ghost-btn lg" onClick={() => navigate('/dashboard')}>
                Go to my dashboard
              </button>
            )}
          </div>
          <p className="hero-note">
            Sample data is clearly labeled and stored only in your browser. Your real financial data
            requires a free account.
          </p>
        </div>

        <div className="feature-grid">
          <FeatureCard icon={LayoutDashboard} title="Dashboard" desc="Cash flow, net worth, budget pressure, and health score at a glance." />
          <FeatureCard icon={Bot} title="AI CFO Allocator" desc="Adjust assumptions and see the path to your target savings rate." />
          <FeatureCard icon={Radar} title="Opportunity Scanner" desc="Ranked opportunities by capital efficiency, risk, and effort." />
          <FeatureCard icon={Sparkles} title="Finance Copilot" desc="Model decisions using your real or sample financial data." />
          <FeatureCard icon={ReceiptText} title="Transactions" desc="Search, filter, and track cash activity with categories." />
          <FeatureCard icon={ChartNoAxesCombined} title="Investments" desc="Track portfolio holdings and expected returns." />
          <FeatureCard icon={Target} title="Goals" desc="Turn financial priorities into measurable targets." />
          <FeatureCard icon={Landmark} title="Net Worth" desc="Track your balance sheet and forecast its trajectory." />
          <FeatureCard icon={TrendingUp} title="Reports" desc="Decision-ready monthly snapshot with portable data export." />
        </div>

        <div className="trust-row">
          <div className="trust-item">
            <ShieldCheck size={20} />
            <span>Row-level security on all data</span>
          </div>
          <div className="trust-item">
            <Sparkles size={20} />
            <span>Educational decision support</span>
          </div>
          <div className="trust-item">
            <Radar size={20} />
            <span>Opportunity scoring engine</span>
          </div>
        </div>

        <footer className="landing-footer">
          <button onClick={() => navigate('/privacy')}>Privacy Policy</button>
          <button onClick={() => navigate('/terms')}>Terms of Service</button>
          <button onClick={() => navigate('/disclaimer')}>Financial Disclaimer</button>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <Icon size={22} />
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}
