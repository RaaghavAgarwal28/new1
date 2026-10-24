import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Building,
  User,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  Send,
  Eye,
  RefreshCw,
  Landmark,
  BadgePercent,
  Receipt,
  FileCheck
} from "lucide-react";
import { getApiBase } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

export function TaxIntelligencePanel({ onSelectAccount }) {
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [noticeType, setNoticeType] = useState("sec_133_6");

  // Fetch Tax Overview and Registry Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = getApiBase();
      const [ovRes, regRes] = await Promise.all([
        fetch(`${apiBase}/tax/overview`),
        fetch(`${apiBase}/tax/registry?filter_type=${filterType}&search=${encodeURIComponent(searchTerm)}&limit=150`)
      ]);

      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }
      if (regRes.ok) {
        const regData = await regRes.json();
        setAccounts(regData.accounts || []);
      }
    } catch (err) {
      console.error("Failed to load tax intelligence data:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle statutory notice issuance
  const handleIssueNotice = async (accountId, selectedNoticeType) => {
    setActionLoading(true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/tax/issue-notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          notice_type: selectedNoticeType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionFeedback({
          type: "success",
          message: `Notice issued successfully: ${data.notice.title} (DIN: ${data.notice.din})`,
        });
        // Refresh dossier and account list
        fetchData();
        if (selectedAccount && selectedAccount.account_id === accountId) {
          const updatedDossier = await fetch(`${apiBase}/tax/dossier/${accountId}`).then(r => r.json());
          setSelectedAccount(updatedDossier);
        }
      }
    } catch (err) {
      setActionFeedback({ type: "error", message: "Failed to dispatch statutory notice." });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  // Handle Section 281B provisional attachment
  const handleAttachAccount = async (accountId) => {
    setActionLoading(true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/tax/attach/${accountId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionFeedback({
          type: "success",
          message: `Account attached under Section 281B: ${data.message}`,
        });
        fetchData();
        if (selectedAccount && selectedAccount.account_id === accountId) {
          const updatedDossier = await fetch(`${apiBase}/tax/dossier/${accountId}`).then(r => r.json());
          setSelectedAccount(updatedDossier);
        }
      }
    } catch (err) {
      setActionFeedback({ type: "error", message: "Failed to apply provisional tax attachment." });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  const getPanBadge = (status) => {
    switch (status) {
      case "LINKED_VERIFIED":
        return <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400 font-mono"><CheckCircle2 size={11} /> Verified</span>;
      case "UNLINKED_INOPERATIVE":
        return <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400 font-mono"><AlertTriangle size={11} /> Inoperative (Sec 139AAA)</span>;
      case "SYNTHETIC_BENAMI":
        return <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400 font-mono"><ShieldAlert size={11} /> Benami / Synthetic</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-0.5 text-[11px] text-white/50 font-mono"><XCircle size={11} /> No PAN (Form 60)</span>;
    }
  };

  const getItrBadge = (status) => {
    switch (status) {
      case "NON_FILER":
        return <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">Non-Filer (Sec 206AB)</span>;
      case "GROSS_UNDER_REPORTER":
        return <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-400">Gross Under-Reporter</span>;
      case "DEFECTIVE_FILER":
        return <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-400">Defective (Sec 139(9))</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">Compliant Filer</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HERO & STATUTORY CONTEXT BANNER ─── */}
      <div className="panel relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FF4500]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#FF4500]">
              <Scale size={14} /> CBDT & FIU-IND Non-Filer Intelligence
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              VARUNA TaxWatch: Tax Evasion & High-Throughput Tracker
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/60">
              Correlating real-time multi-bank UPI inflows against Income Tax Returns (ITR), identifying 
              <strong className="text-white/90"> Section 206AB non-filers</strong>, unmasking 
              <strong className="text-white/90"> SFT Rule 114E smurfing</strong> (transactions split under ₹50,000 to bypass PAN tracking), 
              and enabling instant <strong className="text-white/90">Section 281B provisional attachment liens</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Sync AIS / TIS Data
            </button>
          </div>
        </div>

        {/* Action feedback toast */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 rounded-xl border p-4 text-sm font-medium ${
                actionFeedback.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              {actionFeedback.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── NATIONAL TAX METRICS CARDS ─── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
            <span>Critical Non-Filers</span>
            <AlertTriangle size={16} className="text-[#FF4500]" />
          </div>
          <div className="mt-3 font-display text-3xl font-bold text-white">
            {overview?.critical_non_filers_count ?? "—"}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Zero ITR filed for 2+ AYs with massive UPI credits
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
            <span>Unreported Inflow</span>
            <Receipt size={16} className="text-orange" />
          </div>
          <div className="mt-3 font-display text-3xl font-bold text-orange">
            {overview ? formatCurrency(overview.total_unreported_turnover) : "—"}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Unexplained money under Section 68 / 69A
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
            <span>Sec 115BBE Liability</span>
            <BadgePercent size={16} className="text-emerald-400" />
          </div>
          <div className="mt-3 font-display text-3xl font-bold text-emerald-400">
            {overview ? formatCurrency(overview.potential_tax_recovery_sec_115bbe) : "—"}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Statutory levy @ 78% (60% tax + 25% surcharge + cess)
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
            <span>SFT Structuring</span>
            <Landmark size={16} className="text-yellow-400" />
          </div>
          <div className="mt-3 font-display text-3xl font-bold text-white">
            {overview?.sft_structuring_clusters ?? "—"}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Smurfing bursts split under ₹50,000 threshold
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
            <span>Sec 281B Liens</span>
            <Lock size={16} className="text-[#FF4500]" />
          </div>
          <div className="mt-3 font-display text-3xl font-bold text-white">
            {overview?.statutory_attachments_active ?? "—"}
          </div>
          <div className="mt-2 text-xs text-white/50">
            Active provisional attachments safeguarding revenue
          </div>
        </div>
      </div>

      {/* ─── FILTER & SEARCH BAR ─── */}
      <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Monitored Accounts" },
              { id: "non_filer", label: "Critical Non-Filers", count: overview?.critical_non_filers_count },
              { id: "under_reporter", label: "Gross Under-Reporters", count: overview?.gross_under_reporters_count },
              { id: "structuring", label: "SFT Structuring / Smurfing", count: overview?.sft_structuring_clusters },
              { id: "benami_pan", label: "Benami / Inoperative PAN", count: overview?.benami_or_inoperative_pans },
              { id: "attached", label: "Sec 281B Attached", count: overview?.statutory_attachments_active },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition ${
                  filterType === tab.id
                    ? "border-[#FF4500]/50 bg-[#FF4500]/15 text-[#FF4500] font-semibold"
                    : "border-white/[0.07] bg-white/[0.02] text-white/60 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-white/80">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Account ID, PAN, Entity, Bank…"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-[#FF4500]/40 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ─── TAX REGISTRY TABLE & AUDIT TRAIL ─── */}
      <div className="panel overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-xl font-bold text-white">
              Target Accounts Registry & Tax Evasion Risk (TER) Ledger
            </div>
            <div className="mt-1 text-xs text-white/40">
              Showing {accounts.length} high-throughput entities evaluated under CBDT Section 206AB and SFT Rule 114E
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-[0.2em] text-white/40">
                <th className="pb-3 pl-3">Entity & Account</th>
                <th className="pb-3">PAN & KYC Integrity</th>
                <th className="pb-3">Bank & Annual Inflow</th>
                <th className="pb-3">ITR Filing Status</th>
                <th className="pb-3">SFT Structuring</th>
                <th className="pb-3">TER Risk Score</th>
                <th className="pb-3 pr-3 text-right">Statutory Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/30">
                    No accounts match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const isCritical = acc.ter_score >= 70;
                  const isModerate = acc.ter_score >= 40 && acc.ter_score < 70;

                  return (
                    <tr
                      key={acc.account_id}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 pl-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            acc.is_attached ? "bg-[#FF4500]/20 text-[#FF4500]" : "bg-white/[0.05] text-white/70"
                          }`}>
                            {acc.entity_type.includes("Enterprise") || acc.entity_type.includes("Firm") ? (
                              <Building size={16} />
                            ) : (
                              <User size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white group-hover:text-[#FF4500] transition-colors">
                              {acc.entity_name}
                            </div>
                            <div className="text-[11px] font-mono text-white/40">
                              {acc.account_id} · <span className="text-white/60">{acc.entity_type}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div className="font-mono text-white/90">{acc.pan}</div>
                        <div className="mt-1">{getPanBadge(acc.pan_status)}</div>
                      </td>

                      <td className="py-3.5">
                        <div className="font-semibold text-white">
                          {formatCurrency(acc.annualized_turnover)}
                        </div>
                        <div className="text-[11px] text-white/40">
                          {acc.bank}
                          {acc.disparity_ratio > 1 && (
                            <span className="ml-1.5 rounded-md bg-orange/20 px-1.5 py-0.5 text-[10px] font-bold text-orange">
                              {acc.disparity_ratio}x Disparity
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div>{getItrBadge(acc.itr_status)}</div>
                        <div className="mt-1 text-[11px] text-white/40">
                          {acc.itr_status === "NON_FILER" ? (
                            <span className="text-red-400/80">Never Filed (Last 3 AYs)</span>
                          ) : (
                            <span>Declared: {formatCurrency(acc.declared_income)}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5">
                        {acc.structuring_hits > 0 ? (
                          <div className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-medium text-yellow-300">
                            <AlertTriangle size={11} /> {acc.sub_50k_count} smurfs (&lt;₹50k)
                          </div>
                        ) : (
                          <span className="text-white/30 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full ${
                                isCritical ? "bg-[#FF4500]" : isModerate ? "bg-orange" : "bg-emerald-400"
                              }`}
                              style={{ width: `${acc.ter_score}%` }}
                            />
                          </div>
                          <span className={`font-mono font-bold ${
                            isCritical ? "text-[#FF4500]" : isModerate ? "text-orange" : "text-emerald-400"
                          }`}>
                            {acc.ter_score}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 pr-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAccount(acc)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white transition"
                            title="Inspect Complete Forensic Tax Dossier"
                          >
                            <Eye size={12} /> Dossier
                          </button>

                          {acc.is_attached ? (
                            <span className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
                              <Lock size={12} /> Sec 281B Attached
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAttachAccount(acc.account_id)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1.5 text-xs font-semibold text-[#FF4500] hover:bg-[#FF4500]/20 transition"
                              title="Apply Provisional Tax Lien & Bank Freeze (Sec 281B)"
                            >
                              <Lock size={12} /> Attach Lien
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── DEEP-DIVE FORENSIC TAX DOSSIER MODAL ─── */}
      <AnimatePresence>
        {selectedAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/15 bg-[#0D0D12] p-6 md:p-8 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedAccount(null)}
                className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                <XCircle size={20} />
              </button>

              {/* Dossier Header */}
              <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#FF4500]">
                    <FileCheck size={14} /> CBDT Audit Dossier · DIN Generated
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-white">
                    {selectedAccount.entity_name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/50">
                    <span>Account: <strong className="text-white font-mono">{selectedAccount.account_id}</strong></span>
                    <span>·</span>
                    <span>Bank: <strong className="text-white">{selectedAccount.bank}</strong></span>
                    <span>·</span>
                    <span>PAN: <strong className="text-white font-mono">{selectedAccount.pan}</strong></span>
                    <span>·</span>
                    <span>Type: <strong className="text-white">{selectedAccount.entity_type}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">Tax Evasion Risk</div>
                  <div className="font-display text-3xl font-bold text-[#FF4500]">
                    {selectedAccount.ter_score}/100
                  </div>
                  <div className="mt-1">{getItrBadge(selectedAccount.itr_status)}</div>
                </div>
              </div>

              {/* Inflow vs Declared Income Visual Comparison */}
              <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                  Annual Banking Velocity vs. Declared Taxable Income
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/40">Annualized Banking Inflow (Throughput)</div>
                    <div className="mt-2 font-display text-2xl font-bold text-white">
                      {formatCurrency(selectedAccount.annualized_turnover)}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      Observed Sample Inflow: {formatCurrency(selectedAccount.observed_inflow)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/40">Declared ITR Income (AIS Benchmark)</div>
                    <div className="mt-2 font-display text-2xl font-bold text-orange">
                      {selectedAccount.declared_income > 0
                        ? formatCurrency(selectedAccount.declared_income)
                        : "₹0 (Zero Return Filed)"}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      Disparity Ratio: <strong className="text-orange">{selectedAccount.disparity_ratio}x</strong> excess throughput
                    </div>
                  </div>
                </div>

                {/* SFT Structuring / Smurfing breakdown */}
                {selectedAccount.structuring_hits > 0 && (
                  <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <div className="flex items-center gap-2 font-semibold text-yellow-300 text-sm">
                      <AlertTriangle size={16} /> Rule 114E SFT Smurfing & Structuring Detected
                    </div>
                    <p className="mt-1 text-xs text-yellow-200/80 leading-relaxed">
                      Detected <strong>{selectedAccount.sub_50k_count} incoming UPI transactions</strong> calibrated between ₹45,000 and ₹49,999. 
                      This deliberate structuring is executed to evade the mandatory PAN reporting trigger under Section 139A and Rule 114B.
                    </p>
                  </div>
                )}
              </div>

              {/* Itemized Risk Factors & Statutory Tax Penalties */}
              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                    Algorithmic Evasion Indicators
                  </div>
                  <ul className="space-y-2 text-xs text-white/70">
                    {selectedAccount.ter_factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#FF4500] shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                    Projected Statutory Demand (Section 115BBE)
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-white/50">Unexplained Inflow (Sec 68/69A):</span>
                      <span className="font-mono text-white font-semibold">{formatCurrency(selectedAccount.unexplained_amount)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-white/50">Special Tax Rate (60%):</span>
                      <span className="font-mono text-white/70">{formatCurrency(selectedAccount.unexplained_amount * 0.6)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-white/50">Surcharge (25% on Tax) + Cess (4%):</span>
                      <span className="font-mono text-white/70">{formatCurrency(selectedAccount.unexplained_amount * 0.18)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-semibold text-emerald-400 text-sm pt-2">
                      <span>Total Recoverable Demand (@ 78%):</span>
                      <span className="font-mono">{formatCurrency(selectedAccount.potential_tax_liability)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Center: Dispatch Notice or Apply Lien */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                  Enforcement Action Center
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-white/60 mb-1">Select Statutory Notice Type:</label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF4500]"
                    >
                      <option value="sec_133_6" className="bg-[#12121A]">Section 133(6) — Inquiry Notice (Unexplained Bank Credits)</option>
                      <option value="sec_148a" className="bg-[#12121A]">Section 148A(b) — Show Cause Notice (Escaped Assessment)</option>
                      <option value="sec_142_1" className="bg-[#12121A]">Section 142(1) — Notice to Produce Books of Accounts</option>
                      <option value="fiu_str" className="bg-[#12121A]">FIU-IND STR — Suspicious Transaction Report to ED/Income Tax</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-4 md:pt-0">
                    <button
                      onClick={() => handleIssueNotice(selectedAccount.account_id, noticeType)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/20 transition disabled:opacity-50"
                    >
                      <Send size={14} /> Dispatch Notice
                    </button>

                    {!selectedAccount.is_attached && (
                      <button
                        onClick={() => handleAttachAccount(selectedAccount.account_id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#FF4500]/40 bg-[#FF4500]/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF4500] hover:bg-[#FF4500]/30 transition disabled:opacity-50"
                      >
                        <Lock size={14} /> Attach Account (Sec 281B)
                      </button>
                    )}
                  </div>
                </div>

                {/* History of Notices for this Account */}
                {selectedAccount.notices_issued && selectedAccount.notices_issued.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Issued Notice Log</div>
                    <div className="space-y-1.5">
                      {selectedAccount.notices_issued.map((not, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2 text-xs">
                          <div>
                            <span className="font-semibold text-white">{not.title}</span>
                            <span className="ml-2 font-mono text-white/40">{not.din}</span>
                          </div>
                          <span className="text-emerald-400 text-[11px] font-mono">{not.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
