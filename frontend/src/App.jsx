import { AnimatePresence, motion } from "framer-motion";
import { useState, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import {
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Siren,
  Brain,
  Shield,
  LogOut,
  User,
  PlayCircle,
  Scale,
} from "lucide-react";
import { MuleHunter3DEngine } from "./components/graph/MuleHunter3DEngine";
import { Shell } from "./components/layout/Shell";
import { ThreatGraph } from "./components/graph/ThreatGraph";
import { BriefPanel } from "./components/panels/BriefPanel";
import { BanksSection } from "./components/panels/BanksSection";
import { EventFeed } from "./components/panels/EventFeed";
import { IndiaNetworkMap } from "./components/panels/IndiaNetworkMap";
import { InterceptPanel } from "./components/panels/InterceptPanel";
import { MetricCard } from "./components/panels/MetricCard";
import { ModelMetricsPanel } from "./components/panels/ModelMetricsPanel";
import { NodeDetailPanel } from "./components/panels/NodeDetailPanel";
import { SecurityDashboard } from "./components/panels/SecurityDashboard";
import { SentinelPanel } from "./components/panels/SentinelPanel";
import { StatesSection } from "./components/panels/StatesSection";
import { TimelinePanel } from "./components/panels/TimelinePanel";
import { DemoPipelinePanel } from "./components/panels/DemoPipelinePanel";
import { TaxIntelligencePanel } from "./components/panels/TaxIntelligencePanel";
import { LoginScreen } from "./components/auth/LoginScreen";
import { LandingPage } from "./components/landing/LandingPage";
import { CrystallineCube } from "./components/ui/CrystallineCube";
import { DottedSurface } from "./components/ui/DottedSurface";
import { useAuth } from "./context/AuthContext";
import { useDashboardData } from "./hooks/useDashboardData";
import { buildBankIntel, buildStateIntel } from "./lib/bankIntel";
import { formatCurrency, formatSeconds } from "./lib/format";
import { getApiBase } from "./lib/api";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardGate />} />
    </Routes>
  );
}

function DashboardGate() {
  const { isAuthenticated, user, logout, authFetch, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AuthenticatedApp user={user} logout={logout} authFetch={authFetch} isAdmin={isAdmin} />;
}

function AuthenticatedApp({ user, logout, authFetch, isAdmin }) {
  const { data, loading, error, refresh } = useDashboardData();
  const [activeDashboard, setActiveDashboard] = useState("command");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerateFraud = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await authFetch(`${getApiBase()}/generate-fraud`, { method: "POST" });
      if (res.ok) {
        setTimeout(() => refresh?.(), 300);
      }
    } catch {
      // silent fail
    } finally {
      setTimeout(() => setGenerating(false), 2000);
    }
  }, [refresh, authFetch]);

  const handleSelectAccount = useCallback((accountId) => {
    setSelectedNodeId(accountId);
  }, []);

  if (loading) {
    return (
      <Shell>
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="panel max-w-xl p-10 text-center accent-glow">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="font-display text-3xl text-white"
            >
              Initializing VARUNA
            </motion.div>
            <div className="mt-3 text-white/40">
              Loading ML models, scoring dissipation risk, staging freeze pathways…
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="panel p-8">
          <div className="font-display text-2xl text-[#FF4500]">Dashboard feed unavailable</div>
          <div className="mt-2 text-white/40">{error || "Backend is not responding."}</div>
        </div>
      </Shell>
    );
  }

  const overview = data.national_overview;
  const activeCase = data.cases[0];
  const bankIntel = buildBankIntel(data.graph, data.event_feed);
  const stateIntel = buildStateIntel(bankIntel);
  const scoreByAccount = Object.fromEntries(
    (data.sentinel_scores || []).map((s) => [s.account_id, s])
  );
  const selectedNode = selectedNodeId
    ? data.graph.nodes.find((n) => n.id === selectedNodeId)
    : null;

  const roleBadgeStyle = {
    admin: "border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]",
    analyst: "border-orange/30 bg-orange/10 text-orange",
    viewer: "border-white/20 bg-white/5 text-white/60",
  };

  return (
    <Shell>
      {/* Ambient particle wave background */}
      <DottedSurface className="opacity-40" />

      {/* ─── HEADER — with WebGL crystalline cube backdrop ─── */}
      <header className="relative mb-6 overflow-hidden rounded-[32px] border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-xl xl:flex-row xl:flex xl:items-end xl:justify-between">
        {/* Crystalline WebGL backdrop filling the header */}
        <div className="pointer-events-none absolute inset-0 opacity-30 rounded-[32px] overflow-hidden">
          <CrystallineCube complexity={3.0} colorShift={0.15} lightIntensity={1.2} mouseInfluence={0.3} />
        </div>
        {/* Dark overlay so text stays readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40 rounded-[32px]" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF4500]/20 bg-[#FF4500]/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-[#FF4500]">
            <Sparkles size={14} />
            National Fraud Interception Command Center
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-white md:text-6xl">
            VARUNA
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/50 md:text-lg">
            Real-time mule-chain interception powered by VarunaGAT + VarunaLSTM + 10-flag RBI rule engine.
            Detect, predict, freeze, and brief before funds disappear.
          </p>
        </div>
        <div className="relative z-10 flex flex-col gap-3 mt-6 xl:mt-0">
          {/* User badge + logout */}
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF4500]/10">
                <User size={16} className="text-[#FF4500]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{user?.username}</div>
                <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${roleBadgeStyle[user?.role] || roleBadgeStyle.viewer}`}>
                  <Shield size={8} />
                  {user?.role}
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-white/40 transition hover:border-[#FF4500]/30 hover:bg-[#FF4500]/10 hover:text-[#FF4500]"
              title="Logout"
            >
              <LogOut size={18} />
            </motion.button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatusPill icon={AlertTriangle} label="Threat Index" value={`${overview.threat_index}/100`} tone="red" />
            <StatusPill icon={TimerReset} label="Intercept Window" value={formatSeconds(overview.average_intercept_time_seconds)} tone="orange" />
            <StatusPill icon={ShieldCheck} label="Case Mode" value={activeCase.threat_level} tone="accent" />
          </div>

          {/* Generate Fraud Sequence Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateFraud}
            disabled={generating}
            className={`w-full rounded-2xl border px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
              generating
                ? "border-[#FF4500]/50 bg-[#FF4500]/20 text-[#FF4500] cursor-wait"
                : "border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] hover:bg-[#FF4500]/20 hover:border-[#FF4500]/50"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Siren size={16} className={generating ? "animate-spin" : ""} />
              {generating ? "Generating Fraud Sequence…" : "Generate Fraud Sequence"}
            </span>
          </motion.button>
        </div>
      </header>

      {/* ─── TAB BAR ─── */}
      <section className="mb-6 rounded-[28px] border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl">
        <div className="flex flex-wrap gap-3">
          {[
            { id: "command", label: "Command Center" },
            { id: "tax", label: "Tax Intelligence", icon: Scale },
            { id: "muleHunter3d", label: "3D Network", icon: Shield },
            { id: "demo", label: "Live Simulation", icon: PlayCircle },
            { id: "ml", label: "ML Models", icon: Brain },
            { id: "security", label: "Security", icon: Shield },
            { id: "states", label: "States" },
            { id: "banks", label: "Banks" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveDashboard(item.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                activeDashboard === item.id
                  ? "border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]"
                  : "border-white/[0.07] bg-white/[0.02] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
              }`}
            >
              {item.icon && <item.icon size={12} />}
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── METRICS ROW ─── */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Active Suspicious Chains"
          value={overview.active_suspicious_chains}
          hint="Simultaneous mule ladders in progress"
          accent="red"
        />
        <MetricCard
          label="Recoverable Amount"
          value={formatCurrency(overview.recoverable_amount)}
          hint="Projected funds salvageable with current freeze path"
        />
        <MetricCard
          label="Funds Dissipated"
          value={formatCurrency(overview.funds_already_dissipated)}
          hint="Amount already lost to off-ramp rails"
          accent="orange"
        />
        <MetricCard
          label="Banks Affected"
          value={overview.banks_affected}
          hint="Cross-institution coordination required"
        />
        <MetricCard
          label="Average Intercept Time"
          value={formatSeconds(overview.average_intercept_time_seconds)}
          hint={overview.urgency}
        />
      </section>

      {activeDashboard === "command" && (
        <>
          <section className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr] items-stretch">
            <ThreatGraph graph={data.graph} selectedCase={activeCase} onNodeClick={handleSelectAccount} selectedAccount={selectedNodeId} />
            <div className="flex flex-col h-[580px] space-y-6">
              <div className="flex-1 overflow-hidden">
                <EventFeed events={data.event_feed} />
              </div>
              <AnimatePresence>
                {selectedNode && (
                  <div className="shrink-0 max-h-[60%] overflow-y-auto overflow-x-hidden scrollbar-thin rounded-[20px] pr-2">
                    <NodeDetailPanel
                      node={selectedNode}
                      score={scoreByAccount[selectedNodeId]}
                      onClose={() => setSelectedNodeId(null)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="mb-6">
            <IndiaNetworkMap stateIntel={stateIntel} />
          </section>

          <section className="mb-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr] items-stretch">
            <div className="flex flex-col space-y-6">
              <CaseSpotlight caseItem={activeCase} />
              <div className="flex-1">
                <TimelinePanel timeline={data.timeline} />
              </div>
            </div>
            <SentinelPanel scores={data.sentinel_scores} onSelectAccount={handleSelectAccount} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] items-stretch">
            <InterceptPanel intercept={data.intercept} />
            <BriefPanel brief={data.brief} caseItem={activeCase} />
          </section>
        </>
      )}

      {activeDashboard === "muleHunter3d" && (
        <section className="grid gap-6">
          <MuleHunter3DEngine
            graph={data.graph}
            onNodeClick={handleSelectAccount}
            sentinelScores={data.sentinel_scores}
          />
        </section>
      )}

      {activeDashboard === "ml" && (
        <section className="grid gap-6">
          <ModelMetricsPanel metrics={data.model_metrics} />
        </section>
      )}

      {activeDashboard === "security" && (
        <section className="grid gap-6">
          <SecurityDashboard />
        </section>
      )}

      {activeDashboard === "demo" && (
        <section className="grid gap-6">
          <DemoPipelinePanel />
        </section>
      )}

      {activeDashboard === "states" && (
        <section className="grid gap-6">
          <StatesHero />
          <IndiaNetworkMap stateIntel={stateIntel} />
          <StatesSection states={stateIntel} />
        </section>
      )}

      {activeDashboard === "banks" && (
        <section className="grid gap-6">
          <BanksHero />
          <BanksSection banks={bankIntel.banks} />
        </section>
      )}

      {activeDashboard === "tax" && (
        <section className="grid gap-6">
          <TaxIntelligencePanel onSelectAccount={handleSelectAccount} />
        </section>
      )}
    </Shell>
  );
}

function StatusPill({ icon: Icon, label, value, tone }) {
  const tones = {
    red: "border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]",
    orange: "border-orange/30 bg-orange/10 text-orange",
    accent: "border-white/15 bg-white/[0.06] text-white/70",
  };

  return (
    <div className={`rounded-3xl border px-4 py-4 ${tones[tone] || tones.accent}`}>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
        <Icon size={14} />
        {label}
      </div>
      <div className="font-display text-xl text-white">{value}</div>
    </div>
  );
}

function CaseSpotlight({ caseItem }) {
  const stats = [
    { label: "Chain Confidence", value: `${caseItem.chain_confidence}%` },
    { label: "Human Coordination", value: `${caseItem.human_coordination_score}%` },
    { label: "Dissipation Risk", value: `${caseItem.dissipation_risk}%` },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={caseItem.case_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="panel overflow-hidden p-6"
      >
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#FF4500]">
              Case Detail Mode
            </div>
            <div className="font-display text-3xl text-white">{caseItem.title}</div>
            <div className="mt-3 max-w-3xl text-white/50">
              Victim-origin funds entered a coordinated mule chain, expanded across three hops, and began dissipation toward wallet and cash-out rails before VARUNA initiated cross-bank interception.
            </div>
          </div>
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Flagged Source</div>
            <div className="mt-2 font-display text-xl text-white">{caseItem.flagged_source_account}</div>
            <div className="mt-3 text-sm text-[#FF4500]">
              Predicted next-hop spread: {caseItem.predicted_next_hops.join(", ")}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/35">{stat.label}</div>
              <div className="mt-3 font-display text-3xl text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatesHero() {
  return (
    <div className="panel p-6">
      <div className="mb-2 inline-flex rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#FF4500]">
        State Dashboard
      </div>
      <div className="font-display text-3xl text-white">State-wise Fraud Spread Intelligence</div>
      <div className="mt-3 max-w-3xl text-white/50">
        View the fraud chain bifurcated by impacted states, linked banks, suspicious accounts, frozen accounts, and anomaly signatures.
      </div>
    </div>
  );
}

function BanksHero() {
  return (
    <div className="panel p-6">
      <div className="mb-2 inline-flex rounded-full border border-orange/30 bg-orange/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange">
        Bank Dashboard
      </div>
      <div className="font-display text-3xl text-white">Bank-wise Operational Anomaly View</div>
      <div className="mt-3 max-w-3xl text-white/50">
        Open the bank dashboard to inspect each bank as its own subsection with exposure, linked states, suspicious accounts, freeze status, and anomaly narrative.
      </div>
    </div>
  );
}
