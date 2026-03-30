"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, Legend, ReferenceLine,
} from "recharts";
import {
  generateBonds, calculatePortfolioSummary, runMonteCarloSimulation,
  getDurationDistribution, getYieldCurveData, getPV01BySector,
  formatUSD, formatNumber,
  buildEqualWeights, normalizeWeights, applyPortfolioWeights, rebalanceWeights,
  type Bond, type MonteCarloResult, type RebalanceAction,
} from "@/lib/insurance-dashboard-data";
import "./insurance-dashboard.css";

const COMPANY_NAME = "Insurance Company A";

type TabKey = "assets" | "holdings" | "risk" | "montecarlo";
type SaveState = "loading" | "idle" | "saving" | "saved" | "error";

const COLORS = {
  blue: "#58a6ff",
  green: "#3fb950",
  red: "#f85149",
  orange: "#f0883e",
  yellow: "#d29922",
  purple: "#bc8cff",
  teal: "#39d2c0",
  pink: "#f778ba",
  gray: "#8b949e",
};

const SECTOR_COLORS: Record<string, string> = {
  Government: COLORS.blue,
  Banking: COLORS.orange,
  Technology: COLORS.purple,
  Healthcare: COLORS.green,
  Energy: COLORS.yellow,
  Utilities: COLORS.teal,
  Telecom: COLORS.pink,
  Industrials: COLORS.gray,
  Consumer: "#da7756",
  "Financial Services": "#79c0ff",
};

const REBALANCE_ACTIONS: Array<{ action: RebalanceAction; label: string; description: string }> = [
  { action: "increase_short_dated", label: "Increase short dated exposure", description: "Increase allocation to <=5Y maturities." },
  { action: "increase_long_dated", label: "Increase long dated exposure", description: "Increase allocation to >=10Y maturities." },
  { action: "increase_investment_grade", label: "Increase investment grade exposure", description: "Increase allocation to investment grade debt." },
  { action: "increase_lower_rated_debt", label: "Increase lower rated debt", description: "Increase allocation to lower-rated debt (BBB+ and below)." },
];

const DEFAULT_REBALANCE_SHIFTS: Record<RebalanceAction, string> = {
  increase_short_dated: "10",
  increase_long_dated: "10",
  increase_investment_grade: "10",
  increase_lower_rated_debt: "10",
};

function ratingClass(rating: string): string {
  if (rating.startsWith("AAA")) return "rating-aaa";
  if (rating.startsWith("AA")) return "rating-aa";
  if (rating.startsWith("A")) return "rating-a";
  if (rating.startsWith("BBB")) return "rating-bbb";
  return "rating-bb";
}

export default function InsuranceDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("assets");
  const [sortField, setSortField] = useState<keyof Bond>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [mcRunning, setMcRunning] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [rebalanceShiftByAction, setRebalanceShiftByAction] = useState<Record<RebalanceAction, string>>(DEFAULT_REBALANCE_SHIFTS);
  const [durationImpact, setDurationImpact] = useState<number | null>(null);

  const [bonds, setBonds] = useState<Bond[]>([]);
  const [rawWeights, setRawWeights] = useState<Record<number, number>>({});
  const [portfolioMarketValue, setPortfolioMarketValue] = useState<number>(50000000);

  const normalizedWeights = useMemo(() => normalizeWeights(rawWeights, bonds), [rawWeights, bonds]);
  const positionedBonds = useMemo(() => applyPortfolioWeights(bonds, normalizedWeights, portfolioMarketValue), [bonds, normalizedWeights, portfolioMarketValue]);
  const summary = useMemo(() => calculatePortfolioSummary(positionedBonds), [positionedBonds]);

  useEffect(() => {
    const loadBonds = async () => {
      const seeded = generateBonds(42);
      try {
        const resp = await fetch("/api/insurance-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bonds: seeded }),
        });
        if (!resp.ok) {
          setBonds(seeded);
          return;
        }
        const data = await resp.json();
        setBonds(Array.isArray(data?.bonds) && data.bonds.length > 0 ? data.bonds : seeded);
      } catch {
        setBonds(seeded);
      }
    };
    loadBonds();
  }, []);

  useEffect(() => {
    if (bonds.length === 0) return;
    if (Object.keys(rawWeights).length === 0) {
      setRawWeights(buildEqualWeights(bonds));
    }
  }, [bonds, rawWeights]);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const res = await fetch(`/api/insurance-portfolio?company=${encodeURIComponent(COMPANY_NAME)}`);
        if (!res.ok) {
          setSaveState("idle");
          return;
        }
        const data = await res.json();
        if (data?.weights && typeof data.weights === "object") setRawWeights(data.weights);
        if (typeof data?.totalMarketValue === "number" && data.totalMarketValue > 0) setPortfolioMarketValue(data.totalMarketValue);
        setSaveState("idle");
      } catch {
        setSaveState("error");
      }
    };
    loadPortfolio();
  }, []);

  const savePortfolio = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/insurance-portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: COMPANY_NAME, totalMarketValue: portfolioMarketValue, weights: normalizedWeights }),
      });
      if (!res.ok) return setSaveState("error");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch {
      setSaveState("error");
    }
  }, [portfolioMarketValue, normalizedWeights]);

  const sortedAssets = useMemo(() => [...bonds].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
    const as = String(av);
    const bs = String(bv);
    return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  }), [bonds, sortField, sortDir]);

  const totalInputWeight = useMemo(() => bonds.reduce((sum, b) => sum + Math.max(0, Number(rawWeights[b.id] ?? 0)), 0), [rawWeights, bonds]);
  const durationDist = useMemo(() => getDurationDistribution(positionedBonds), [positionedBonds]);
  const yieldData = useMemo(() => getYieldCurveData(positionedBonds), [positionedBonds]);
  const pv01BySector = useMemo(() => getPV01BySector(positionedBonds), [positionedBonds]);
  const yieldGovt = useMemo(() => yieldData.filter((d) => d.type === "Government"), [yieldData]);
  const yieldCorp = useMemo(() => yieldData.filter((d) => d.type === "Corporate"), [yieldData]);

  const handleSort = useCallback((field: keyof Bond) => {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }, [sortField]);

  const handleRunMC = useCallback(() => {
    setMcRunning(true);
    setTimeout(() => {
      setMcResult(runMonteCarloSimulation(positionedBonds, 1000, 123));
      setMcRunning(false);
    }, 50);
  }, [positionedBonds]);

  const applyRebalance = useCallback((action: RebalanceAction) => {
    const rawShift = rebalanceShiftByAction[action] ?? "0";
    const parsedShift = Number(rawShift);
    const shiftPct = Number.isFinite(parsedShift) ? Math.max(0, Math.min(100, parsedShift)) : 0;
    const nextWeights = rebalanceWeights(bonds, rawWeights, action, shiftPct);
    const nextNormalized = normalizeWeights(nextWeights, bonds);
    const nextPositioned = applyPortfolioWeights(bonds, nextNormalized, portfolioMarketValue);
    const nextSummary = calculatePortfolioSummary(nextPositioned);

    setDurationImpact(nextSummary.weightedDuration - summary.weightedDuration);
    setRawWeights(nextWeights);
    setActiveTab("risk");
  }, [bonds, rawWeights, rebalanceShiftByAction, portfolioMarketValue, summary.weightedDuration]);

  return (
    <div className="ins-page">
      <div className="ins-demo-login">
        <div><strong>Demo Access:</strong> Logged in as {COMPANY_NAME}</div>
        <div className="ins-demo-login-sub">No authentication required.</div>
      </div>

      <div className="ins-metrics">
        <div className="ins-metric-card"><span className="ins-metric-label">Market Value</span><span className="ins-metric-value">{formatUSD(summary.totalMarketValue)}</span><span className="ins-metric-sub">{summary.governmentCount + summary.corporateCount} bonds · USD</span></div>
        <div className="ins-metric-card"><span className="ins-metric-label">Mod. Duration</span><span className="ins-metric-value accent">{formatNumber(summary.weightedDuration)}</span><span className="ins-metric-sub">Portfolio weighted</span></div>
        <div className="ins-metric-card"><span className="ins-metric-label">Total PV01</span><span className="ins-metric-value">{formatUSD(summary.totalPV01)}</span><span className="ins-metric-sub">Per 1bp shift</span></div>
        <div className="ins-metric-card"><span className="ins-metric-label">Total DV01</span><span className="ins-metric-value">{formatUSD(summary.totalDV01)}</span><span className="ins-metric-sub">Dollar value 1bp</span></div>
        <div className="ins-metric-card"><span className="ins-metric-label">Avg Yield</span><span className="ins-metric-value positive">{formatNumber(summary.averageYield)}%</span><span className="ins-metric-sub">Market-value weighted</span></div>
        <div className="ins-metric-card"><span className="ins-metric-label">Expected Loss</span><span className="ins-metric-value negative">{formatUSD(summary.totalExpectedLoss)}</span><span className="ins-metric-sub">Annual · PD × LGD</span></div>
      </div>

      <div className="ins-tabs">
        <button className={`ins-tab ${activeTab === "assets" ? "active" : ""}`} onClick={() => setActiveTab("assets")}>1. Assets</button>
        <button className={`ins-tab ${activeTab === "holdings" ? "active" : ""}`} onClick={() => setActiveTab("holdings")}>2. Holdings</button>
        <button className={`ins-tab ${activeTab === "risk" ? "active" : ""}`} onClick={() => setActiveTab("risk")}>3. Risk</button>
        <button className={`ins-tab ${activeTab === "montecarlo" ? "active" : ""}`} onClick={() => setActiveTab("montecarlo")}>4. Monte Carlo</button>
      </div>

      <div className="ins-content">
        {activeTab === "assets" && <AssetsTable bonds={sortedAssets} sortField={sortField} sortDir={sortDir} onSort={handleSort} onSelectBond={setSelectedBond} />}
        {activeTab === "holdings" && (
          <>
            <HoldingsEditor bonds={bonds} weights={rawWeights} totalInputWeight={totalInputWeight} portfolioMarketValue={portfolioMarketValue} onWeightChange={(bondId, value) => { const parsed = Number(value); setRawWeights((prev) => ({ ...prev, [bondId]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 })); }} onMarketValueChange={setPortfolioMarketValue} onNormalize={() => setRawWeights(normalizeWeights(rawWeights, bonds))} onSave={savePortfolio} saveState={saveState} />
            <div style={{ marginTop: 16 }}>
              <RebalancePanel
                actions={REBALANCE_ACTIONS}
                onApply={applyRebalance}
                shiftByAction={rebalanceShiftByAction}
                onShiftChange={(action, value) =>
                  setRebalanceShiftByAction((prev) => ({ ...prev, [action]: value }))
                }
              />
            </div>
          </>
        )}
        {activeTab === "risk" && <RiskAnalytics bonds={positionedBonds} summary={summary} durationDist={durationDist} yieldGovt={yieldGovt} yieldCorp={yieldCorp} pv01BySector={pv01BySector} durationImpact={durationImpact} />}
        {activeTab === "montecarlo" && <MonteCarloPanel result={mcResult} running={mcRunning} onRun={handleRunMC} />}
      </div>

      {selectedBond && <CashflowModal bond={selectedBond} onClose={() => setSelectedBond(null)} />}
    </div>
  );
}
function AssetsTable({ bonds, sortField, sortDir, onSort, onSelectBond }: {
  bonds: Bond[];
  sortField: keyof Bond;
  sortDir: "asc" | "desc";
  onSort: (field: keyof Bond) => void;
  onSelectBond: (bond: Bond) => void;
}) {
  const arrow = (field: keyof Bond) => sortField === field ? (sortDir === "asc" ? " ^" : " v") : "";
  return (
    <div className="ins-card">
      <div className="ins-card-header"><span className="ins-card-title">Assets - 50 USD Bonds</span></div>
      <div className="ins-table-wrap">
        <table className="ins-table">
          <thead>
            <tr>
              <th onClick={() => onSort("id")}>#<span className="sort-arrow">{arrow("id")}</span></th>
              <th onClick={() => onSort("issuer")}>Issuer<span className="sort-arrow">{arrow("issuer")}</span></th>
              <th onClick={() => onSort("type")}>Type<span className="sort-arrow">{arrow("type")}</span></th>
              <th onClick={() => onSort("sector")}>Sector<span className="sort-arrow">{arrow("sector")}</span></th>
              <th onClick={() => onSort("rating")}>Rating<span className="sort-arrow">{arrow("rating")}</span></th>
              <th onClick={() => onSort("couponRate")} className="text-right">Coupon<span className="sort-arrow">{arrow("couponRate")}</span></th>
              <th onClick={() => onSort("maturityYears")} className="text-right">Mat (Y)<span className="sort-arrow">{arrow("maturityYears")}</span></th>
              <th onClick={() => onSort("yieldToMaturity")} className="text-right">YTM<span className="sort-arrow">{arrow("yieldToMaturity")}</span></th>
              <th onClick={() => onSort("marketPrice")} className="text-right">Mkt Value<span className="sort-arrow">{arrow("marketPrice")}</span></th>
              <th onClick={() => onSort("duration")} className="text-right">Dur<span className="sort-arrow">{arrow("duration")}</span></th>
              <th onClick={() => onSort("convexity")} className="text-right">Cvx<span className="sort-arrow">{arrow("convexity")}</span></th>
              <th onClick={() => onSort("pv01")} className="text-right">PV01<span className="sort-arrow">{arrow("pv01")}</span></th>
              <th onClick={() => onSort("pd")} className="text-right">PD<span className="sort-arrow">{arrow("pd")}</span></th>
              <th onClick={() => onSort("expectedLoss")} className="text-right">EL<span className="sort-arrow">{arrow("expectedLoss")}</span></th>
              <th>CF</th>
            </tr>
          </thead>
          <tbody>
            {bonds.map((b) => (
              <tr key={b.id}>
                <td style={{ color: COLORS.gray }}>{b.id}</td>
                <td>{b.issuer}</td>
                <td><span className={b.type === "Government" ? "type-govt" : "type-corp"}>{b.type === "Government" ? "Govt" : "Corp"}</span></td>
                <td style={{ color: SECTOR_COLORS[b.sector] ?? COLORS.gray }}>{b.sector}</td>
                <td><span className={`rating-badge ${ratingClass(b.rating)}`}>{b.rating}</span></td>
                <td className="text-right">{b.couponRate.toFixed(3)}%</td>
                <td className="text-right">{b.maturityYears}Y</td>
                <td className="text-right" style={{ color: COLORS.green }}>{b.yieldToMaturity.toFixed(2)}%</td>
                <td className="text-right">{formatUSD(b.marketPrice)}</td>
                <td className="text-right" style={{ color: COLORS.orange }}>{b.duration.toFixed(2)}</td>
                <td className="text-right">{b.convexity.toFixed(1)}</td>
                <td className="text-right">{formatUSD(b.pv01)}</td>
                <td className="text-right">{b.pd.toFixed(3)}%</td>
                <td className="text-right" style={{ color: COLORS.red }}>{formatUSD(b.expectedLoss)}</td>
                <td><button className="view-btn" onClick={() => onSelectBond(b)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HoldingsEditor({
  bonds, weights, totalInputWeight, portfolioMarketValue, onWeightChange,
  onMarketValueChange, onNormalize, onSave, saveState,
}: {
  bonds: Bond[];
  weights: Record<number, number>;
  totalInputWeight: number;
  portfolioMarketValue: number;
  onWeightChange: (bondId: number, value: string) => void;
  onMarketValueChange: (value: number) => void;
  onNormalize: () => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  return (
    <div className="ins-card">
      <div className="ins-card-header ins-holdings-header">
        <span className="ins-card-title">Holdings Configuration</span>
        <div className="ins-holdings-toolbar">
          <label>Portfolio Market Value (USD)
            <input className="ins-input" type="number" min={0} step={100000} value={Number.isFinite(portfolioMarketValue) ? portfolioMarketValue : 0} onChange={(e) => onMarketValueChange(Math.max(0, Number(e.target.value || 0)))} />
          </label>
          <button className="ins-btn" onClick={onNormalize}>Normalize to 100%</button>
          <button className="ins-btn ins-btn-primary" onClick={onSave}>{saveState === "saving" ? "Saving..." : "Save Portfolio"}</button>
        </div>
      </div>
      <div className="ins-card-body">
        <div className="ins-holdings-note">Bond count: {bonds.length}. Default is equal-weighted ({(100 / bonds.length).toFixed(2)}% each). Total entered weight: {totalInputWeight.toFixed(2)}%{Math.abs(totalInputWeight - 100) > 0.01 && " (will be normalized in analytics and saved portfolio)."} Rebalance controls are available below this table.</div>
        {saveState === "error" && <div className="ins-error">Unable to save/load portfolio from Supabase. Check env vars and SQL setup.</div>}
        {saveState === "saved" && <div className="ins-success">Portfolio saved to Supabase.</div>}
        <div className="ins-table-wrap" style={{ marginTop: 12 }}>
          <table className="ins-table">
            <thead><tr><th>#</th><th>Issuer</th><th>Type</th><th>Rating</th><th className="text-right">Maturity</th><th className="text-right">Weight %</th><th className="text-right">Allocated Value</th></tr></thead>
            <tbody>
              {bonds.map((b) => {
                const w = Math.max(0, Number(weights[b.id] ?? 0));
                const alloc = (portfolioMarketValue * w) / 100;
                return (
                  <tr key={b.id}>
                    <td>{b.id}</td><td>{b.issuer}</td><td>{b.type}</td><td><span className={`rating-badge ${ratingClass(b.rating)}`}>{b.rating}</span></td><td className="text-right">{b.maturityYears}Y</td>
                    <td className="text-right"><input className="ins-input ins-weight-input" type="number" min={0} step={0.01} value={w} onChange={(e) => onWeightChange(b.id, e.target.value)} /></td>
                    <td className="text-right">{formatUSD(alloc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function RiskAnalytics({ summary, durationDist, yieldGovt, yieldCorp, pv01BySector, bonds, durationImpact }: {
  summary: ReturnType<typeof calculatePortfolioSummary>;
  durationDist: ReturnType<typeof getDurationDistribution>;
  yieldGovt: { maturity: number; yield: number }[];
  yieldCorp: { maturity: number; yield: number }[];
  pv01BySector: { sector: string; pv01: number }[];
  bonds: Bond[];
  durationImpact: number | null;
}) {
  const expectedLossByRating = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bonds) map.set(b.rating, (map.get(b.rating) ?? 0) + b.expectedLoss);
    return summary.ratingBreakdown.map((r) => ({ name: r.name, el: map.get(r.name) ?? 0 }));
  }, [bonds, summary.ratingBreakdown]);

  return (
    <div className="ins-charts-grid">
      <div className="ins-card">
        <div className="ins-card-header"><span className="ins-card-title">Duration Impact</span></div>
        <div className="ins-card-body">
          <div className="ins-rebalance-text">
            Current portfolio duration: <strong>{formatNumber(summary.weightedDuration)}</strong>
          </div>
          {durationImpact !== null && (
            <div className="ins-rebalance-text">
              Change from last rebalance: <strong>{durationImpact >= 0 ? "+" : ""}{formatNumber(durationImpact)}</strong>
            </div>
          )}
        </div>
      </div>
      <div className="ins-card"><div className="ins-card-header"><span className="ins-card-title">Duration Distribution (Weighted by Holdings)</span></div><div className="ins-card-body"><ResponsiveContainer width="100%" height={260}><BarChart data={durationDist}><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="bucket" tick={{ fill: "#8b949e", fontSize: 10 }} /><YAxis tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={(v) => formatUSD(Number(v ?? 0))} /><Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, fontSize: 11 }} formatter={(value) => formatUSD(Number(value ?? 0))} /><Bar dataKey="value" fill={COLORS.blue} radius={[3, 3, 0, 0]} name="Market Value" /></BarChart></ResponsiveContainer></div></div>
      <div className="ins-card"><div className="ins-card-header"><span className="ins-card-title">Sector Allocation (Market Value)</span></div><div className="ins-card-body"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={summary.sectorBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name" paddingAngle={2} label={(props) => `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>{summary.sectorBreakdown.map((entry) => <Cell key={entry.name} fill={SECTOR_COLORS[entry.name] ?? COLORS.gray} />)}</Pie><Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, fontSize: 11 }} formatter={(value) => formatUSD(Number(value ?? 0))} /></PieChart></ResponsiveContainer></div></div>
      <div className="ins-card"><div className="ins-card-header"><span className="ins-card-title">Yield vs Maturity</span></div><div className="ins-card-body"><ResponsiveContainer width="100%" height={260}><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="maturity" tick={{ fill: "#8b949e", fontSize: 10 }} /><YAxis dataKey="yield" tick={{ fill: "#8b949e", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, fontSize: 11 }} formatter={(value) => `${Number(value ?? 0).toFixed(2)}%`} /><Legend wrapperStyle={{ fontSize: 11, color: "#8b949e" }} /><Scatter name="Government" data={yieldGovt} fill={COLORS.blue} /><Scatter name="Corporate" data={yieldCorp} fill={COLORS.orange} /></ScatterChart></ResponsiveContainer></div></div>
      <div className="ins-card"><div className="ins-card-header"><span className="ins-card-title">PV01 Contribution by Sector</span></div><div className="ins-card-body"><ResponsiveContainer width="100%" height={260}><BarChart data={pv01BySector} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis type="number" tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={(v) => formatUSD(v)} /><YAxis dataKey="sector" type="category" tick={{ fill: "#8b949e", fontSize: 10 }} width={100} /><Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, fontSize: 11 }} formatter={(value) => formatUSD(Number(value ?? 0))} /><Bar dataKey="pv01" name="PV01" radius={[0, 3, 3, 0]}>{pv01BySector.map((entry) => <Cell key={entry.sector} fill={SECTOR_COLORS[entry.sector] ?? COLORS.gray} />)}</Bar></BarChart></ResponsiveContainer></div></div>
      <div className="ins-card"><div className="ins-card-header"><span className="ins-card-title">Rating Distribution</span></div><div className="ins-card-body"><ResponsiveContainer width="100%" height={260}><BarChart data={summary.ratingBreakdown}><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 10 }} /><YAxis tick={{ fill: "#8b949e", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, fontSize: 11 }} /><Bar dataKey="count" name="# Bonds" fill={COLORS.teal} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="ins-card"><div className="ins-card-header"><span className="ins-card-title">Expected Loss by Rating</span></div><div className="ins-card-body"><ResponsiveContainer width="100%" height={260}><BarChart data={expectedLossByRating}><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 10 }} /><YAxis tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={(v) => formatUSD(v)} /><Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, fontSize: 11 }} formatter={(value) => formatUSD(Number(value ?? 0))} /><Bar dataKey="el" name="Expected Loss" fill={COLORS.red} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
    </div>
  );
}

function MonteCarloPanel({ result, running, onRun }: { result: MonteCarloResult | null; running: boolean; onRun: () => void; }) {
  return (
    <div className="ins-mc-grid">
      <div>
        <div className="ins-card" style={{ marginBottom: 16 }}>
          <div className="ins-card-header"><span className="ins-card-title">Simulation</span></div>
          <div className="ins-card-body">
            <div className="ins-mc-params">
              <div>Scenarios: <span>1,000</span></div><div>Horizon: <span>1 Year</span></div><div>IR Model: <span>Vasicek</span></div><div>Credit: <span>Gaussian Copula</span></div>
            </div>
            <button className="ins-mc-btn" onClick={onRun} disabled={running}>{running ? "Running..." : "Run Simulation"}</button>
          </div>
        </div>
        {result && (
          <div className="ins-mc-metrics">
            <div className="ins-mc-metric"><div className="ins-mc-metric-label">VaR 95%</div><div className="ins-mc-metric-value loss">{formatUSD(result.var95)}</div></div>
            <div className="ins-mc-metric"><div className="ins-mc-metric-label">VaR 99%</div><div className="ins-mc-metric-value loss">{formatUSD(result.var99)}</div></div>
            <div className="ins-mc-metric"><div className="ins-mc-metric-label">CVaR 95%</div><div className="ins-mc-metric-value loss">{formatUSD(result.cvar95)}</div></div>
            <div className="ins-mc-metric"><div className="ins-mc-metric-label">Mean P&L</div><div className={`ins-mc-metric-value ${result.mean >= 0 ? "gain" : "loss"}`}>{result.mean >= 0 ? "+" : ""}{formatUSD(result.mean)}</div></div>
          </div>
        )}
      </div>
      <div className="ins-card">
        <div className="ins-card-header"><span className="ins-card-title">P&L Distribution - 1Y Horizon</span></div>
        <div className="ins-card-body">
          {!result && !running && <div className="ins-loading"><p style={{ color: "#8b949e" }}>Click "Run Simulation" to generate Monte Carlo scenarios</p></div>}
          {running && <div className="ins-loading"><div className="ins-spinner" /><p>Running 1,000 scenarios...</p></div>}
          {result && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={result.histogram}><CartesianGrid strokeDasharray="3 3" stroke="#21262d" /><XAxis dataKey="bucket" tick={{ fill: "#8b949e", fontSize: 9 }} interval={3} /><YAxis tick={{ fill: "#8b949e", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, fontSize: 11 }} /><ReferenceLine y={0} stroke="#30363d" /><Bar dataKey="count" name="Scenarios">{result.histogram.map((entry, idx) => <Cell key={idx} fill={entry.value < 0 ? "rgba(248, 81, 73, 0.7)" : "rgba(63, 185, 80, 0.7)"} />)}</Bar></BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
function RebalancePanel({ actions, onApply, shiftByAction, onShiftChange }: {
  actions: Array<{ action: RebalanceAction; label: string; description: string }>;
  onApply: (action: RebalanceAction) => void;
  shiftByAction: Record<RebalanceAction, string>;
  onShiftChange: (action: RebalanceAction, value: string) => void;
}) {
  const sanitizeShiftInput = (raw: string): string => {
    let cleaned = raw.replace(/[^\d.]/g, "");
    const dot = cleaned.indexOf(".");
    if (dot !== -1) cleaned = `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
    if (cleaned.startsWith("0") && !cleaned.startsWith("0.") && cleaned.length > 1) {
      cleaned = cleaned.replace(/^0+/, "");
    }
    return cleaned;
  };

  return (
    <div className="ins-rebalance-grid">
      {actions.map((item) => (
        <div className="ins-card" key={item.action}>
          <div className="ins-card-header"><span className="ins-card-title">{item.label}</span></div>
          <div className="ins-card-body">
            <p className="ins-rebalance-text">{item.description}</p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              Shift Percentage (%)
              <input
                className="ins-input"
                type="text"
                inputMode="decimal"
                value={shiftByAction[item.action]}
                onChange={(e) => onShiftChange(item.action, sanitizeShiftInput(e.target.value))}
                onBlur={(e) => {
                  const parsed = Number(e.target.value || "0");
                  const clamped = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
                  onShiftChange(item.action, String(clamped));
                }}
              />
            </label>
            <button className="ins-btn ins-btn-primary" onClick={() => onApply(item.action)}>Apply Rebalance</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CashflowModal({ bond, onClose }: { bond: Bond; onClose: () => void }) {
  const totalCoupon = bond.cashflows.reduce((s, cf) => s + cf.coupon, 0);
  const totalPrincipal = bond.cashflows.reduce((s, cf) => s + cf.principal, 0);
  const totalCash = bond.cashflows.reduce((s, cf) => s + cf.total, 0);
  const totalDiscounted = bond.cashflows.reduce((s, cf) => s + cf.discounted, 0);

  return (
    <div className="ins-modal-overlay" onClick={onClose}>
      <div className="ins-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ins-modal-header"><span className="ins-modal-title">Cashflow Schedule - {bond.issuer}</span><button className="ins-modal-close" onClick={onClose}>&times;</button></div>
        <div className="ins-modal-body">
          <div className="ins-modal-meta">
            <div className="ins-modal-meta-item"><div className="ins-modal-meta-label">ISIN</div><div className="ins-modal-meta-value">{bond.isin}</div></div>
            <div className="ins-modal-meta-item"><div className="ins-modal-meta-label">Rating</div><div className="ins-modal-meta-value">{bond.rating}</div></div>
            <div className="ins-modal-meta-item"><div className="ins-modal-meta-label">Coupon</div><div className="ins-modal-meta-value">{bond.couponRate.toFixed(3)}%</div></div>
            <div className="ins-modal-meta-item"><div className="ins-modal-meta-label">YTM</div><div className="ins-modal-meta-value">{bond.yieldToMaturity.toFixed(2)}%</div></div>
            <div className="ins-modal-meta-item"><div className="ins-modal-meta-label">Face Value</div><div className="ins-modal-meta-value">{formatUSD(bond.faceValue)}</div></div>
            <div className="ins-modal-meta-item"><div className="ins-modal-meta-label">Market Price</div><div className="ins-modal-meta-value">{formatUSD(bond.marketPrice)}</div></div>
          </div>
          <table className="ins-cf-table">
            <thead><tr><th>Year</th><th>Coupon ($)</th><th>Principal ($)</th><th>Total ($)</th><th>PV ($)</th></tr></thead>
            <tbody>{bond.cashflows.map((cf) => <tr key={cf.year}><td>{cf.year}</td><td>{formatUSD(cf.coupon)}</td><td>{cf.principal > 0 ? formatUSD(cf.principal) : "-"}</td><td>{formatUSD(cf.total)}</td><td>{formatUSD(cf.discounted)}</td></tr>)}</tbody>
            <tfoot><tr><td>Total</td><td>{formatUSD(totalCoupon)}</td><td>{formatUSD(totalPrincipal)}</td><td>{formatUSD(totalCash)}</td><td>{formatUSD(totalDiscounted)}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

