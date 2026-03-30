// ============================================================
// Fixed Income Portfolio Risk Dashboard - Data & Calculations
// ============================================================

// Seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ============================================================
// Types
// ============================================================
export interface Bond {
  id: number;
  isin: string;
  issuer: string;
  sector: string;
  type: "Government" | "Corporate";
  rating: string;
  couponRate: number;
  maturityYears: number;
  faceValue: number;
  marketPrice: number;
  yieldToMaturity: number;
  currency: "USD";
  duration: number;
  macaulayDuration: number;
  convexity: number;
  pv01: number;
  dv01: number;
  cr01: number;
  pd: number;
  lgd: number;
  expectedLoss: number;
  cashflows: Cashflow[];
}

export interface Cashflow {
  year: number;
  coupon: number;
  principal: number;
  total: number;
  discounted: number;
}

export interface PortfolioSummary {
  totalMarketValue: number;
  totalFaceValue: number;
  weightedDuration: number;
  weightedConvexity: number;
  totalPV01: number;
  totalDV01: number;
  totalCR01: number;
  totalExpectedLoss: number;
  averageYield: number;
  governmentCount: number;
  corporateCount: number;
  sectorBreakdown: { name: string; value: number; count: number }[];
  ratingBreakdown: { name: string; value: number; count: number }[];
}

export interface MonteCarloResult {
  scenarios: number[];
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  mean: number;
  stdDev: number;
  histogram: { bucket: string; count: number; value: number }[];
}

export type RebalanceAction =
  | "increase_short_dated"
  | "increase_long_dated"
  | "increase_investment_grade"
  | "increase_lower_rated_debt";

// ============================================================
// Constants
// ============================================================
const GOVT_TEMPLATES: Array<{ name: string; maturity: number }> = [
  { name: "US Treasury 2Y Note", maturity: 2 },
  { name: "US Treasury 3Y Note", maturity: 3 },
  { name: "US Treasury 5Y Note", maturity: 5 },
  { name: "US Treasury 7Y Note", maturity: 7 },
  { name: "US Treasury 10Y Note", maturity: 10 },
  { name: "US Treasury 20Y Bond", maturity: 20 },
  { name: "US Treasury 30Y Bond", maturity: 30 },
  { name: "US Treasury TIPS 5Y", maturity: 5 },
  { name: "US Treasury TIPS 10Y", maturity: 10 },
  { name: "US Treasury FRN 2Y", maturity: 2 },
];

const CORP_ISSUERS: { name: string; sector: string; rating: string }[] = [
  { name: "JPMorgan Chase & Co", sector: "Banking", rating: "A+" },
  { name: "Goldman Sachs Group", sector: "Banking", rating: "A" },
  { name: "Bank of America Corp", sector: "Banking", rating: "A" },
  { name: "Citigroup Inc", sector: "Banking", rating: "BBB+" },
  { name: "Morgan Stanley", sector: "Banking", rating: "A-" },
  { name: "Wells Fargo & Co", sector: "Banking", rating: "A-" },
  { name: "Apple Inc", sector: "Technology", rating: "AA+" },
  { name: "Microsoft Corp", sector: "Technology", rating: "AAA" },
  { name: "Alphabet Inc", sector: "Technology", rating: "AA+" },
  { name: "Amazon.com Inc", sector: "Technology", rating: "AA" },
  { name: "Meta Platforms Inc", sector: "Technology", rating: "A+" },
  { name: "ExxonMobil Corp", sector: "Energy", rating: "AA-" },
  { name: "Chevron Corp", sector: "Energy", rating: "AA" },
  { name: "ConocoPhillips", sector: "Energy", rating: "A" },
  { name: "Pfizer Inc", sector: "Healthcare", rating: "A+" },
  { name: "Johnson & Johnson", sector: "Healthcare", rating: "AAA" },
  { name: "UnitedHealth Group", sector: "Healthcare", rating: "A+" },
  { name: "Abbott Laboratories", sector: "Healthcare", rating: "A+" },
  { name: "AT&T Inc", sector: "Telecom", rating: "BBB" },
  { name: "Verizon Communications", sector: "Telecom", rating: "BBB+" },
  { name: "T-Mobile US Inc", sector: "Telecom", rating: "BBB" },
  { name: "Duke Energy Corp", sector: "Utilities", rating: "A-" },
  { name: "NextEra Energy Inc", sector: "Utilities", rating: "A-" },
  { name: "Southern Company", sector: "Utilities", rating: "BBB+" },
  { name: "Dominion Energy Inc", sector: "Utilities", rating: "BBB+" },
  { name: "Caterpillar Inc", sector: "Industrials", rating: "A" },
  { name: "Deere & Company", sector: "Industrials", rating: "A" },
  { name: "3M Company", sector: "Industrials", rating: "A+" },
  { name: "Boeing Co", sector: "Industrials", rating: "BBB-" },
  { name: "General Electric Co", sector: "Industrials", rating: "BBB+" },
  { name: "Procter & Gamble Co", sector: "Consumer", rating: "AA-" },
  { name: "Coca-Cola Company", sector: "Consumer", rating: "A+" },
  { name: "PepsiCo Inc", sector: "Consumer", rating: "A+" },
  { name: "Walmart Inc", sector: "Consumer", rating: "AA" },
  { name: "McDonald's Corp", sector: "Consumer", rating: "BBB+" },
  { name: "Home Depot Inc", sector: "Consumer", rating: "A" },
  { name: "Berkshire Hathaway", sector: "Financial Services", rating: "AA" },
  { name: "US Bancorp", sector: "Banking", rating: "A+" },
  { name: "Ford Motor Co", sector: "Industrials", rating: "BB+" },
  { name: "General Motors Co", sector: "Industrials", rating: "BBB-" },
];

const RATING_PD: Record<string, number> = {
  "AAA": 0.0002, "AA+": 0.0003, "AA": 0.0005, "AA-": 0.0008,
  "A+": 0.0012, "A": 0.0018, "A-": 0.0025,
  "BBB+": 0.004, "BBB": 0.007, "BBB-": 0.012,
  "BB+": 0.02, "BB": 0.035, "B+": 0.06,
};

const SECTOR_LGD: Record<string, number> = {
  "Government": 0.05, "Banking": 0.45, "Technology": 0.40,
  "Healthcare": 0.35, "Energy": 0.50, "Utilities": 0.35,
  "Telecom": 0.45, "Industrials": 0.40, "Consumer": 0.35,
  "Financial Services": 0.40,
};

const RATING_ORDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "B+"];

// ============================================================
// Bond Generation
// ============================================================
export function generateBonds(seed: number = 42): Bond[] {
  const rng = mulberry32(seed);
  const bonds: Bond[] = [];
  let id = 1;

  // 30 Government bonds
  for (let i = 0; i < 30; i++) {
    const template = GOVT_TEMPLATES[i % GOVT_TEMPLATES.length];
    const maturity = template.maturity;
    const coupon = Math.round((0.5 + rng() * 4.5) * 8) / 8;
    const ytm = Math.max(0.25, coupon + (rng() - 0.5) * 0.6);
    const rating = rng() < 0.85 ? "AAA" : "AA+";

    bonds.push(createBond({
      id: id++, issuer: template.name, sector: "Government",
      type: "Government", rating, couponRate: coupon,
      maturityYears: maturity, faceValue: 1000000, yieldToMaturity: ytm,
    }));
  }

  // 20 Corporate bonds
  for (let i = 0; i < 20; i++) {
    const corp = CORP_ISSUERS[i % CORP_ISSUERS.length];
    const maturity = 1 + Math.floor(rng() * 14);
    const coupon = Math.round((2.0 + rng() * 5.0) * 8) / 8;
    const spread = creditSpread(corp.rating, rng);
    const ytm = Math.max(1.0, coupon + (rng() - 0.3) * 0.8 + spread);

    bonds.push(createBond({
      id: id++, issuer: corp.name, sector: corp.sector,
      type: "Corporate", rating: corp.rating, couponRate: coupon,
      maturityYears: maturity, faceValue: 500000 + Math.floor(rng() * 10) * 100000,
      yieldToMaturity: ytm,
    }));
  }

  return bonds;
}

export function buildEqualWeights(bonds: Bond[]): Record<number, number> {
  if (bonds.length === 0) return {};
  const w = 100 / bonds.length;
  return Object.fromEntries(bonds.map((b) => [b.id, Number(w.toFixed(6))]));
}

export function normalizeWeights(weights: Record<number, number>, bonds: Bond[]): Record<number, number> {
  const ids = new Set(bonds.map((b) => b.id));
  const cleanEntries = Object.entries(weights)
    .map(([k, v]) => [Number(k), Number.isFinite(v) ? Math.max(0, v) : 0] as const)
    .filter(([id]) => ids.has(id));

  const total = cleanEntries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return buildEqualWeights(bonds);

  return Object.fromEntries(cleanEntries.map(([id, v]) => [id, Number(((v / total) * 100).toFixed(6))]));
}

export function applyPortfolioWeights(
  bonds: Bond[],
  weights: Record<number, number>,
  portfolioMarketValue: number
): Bond[] {
  const safePortfolioValue = Number.isFinite(portfolioMarketValue) && portfolioMarketValue > 0
    ? portfolioMarketValue
    : 0;

  return bonds.map((bond) => {
    const weightPct = Math.max(0, weights[bond.id] ?? 0);
    const targetMarketValue = (safePortfolioValue * weightPct) / 100;
    const scale = bond.marketPrice > 0 ? targetMarketValue / bond.marketPrice : 0;

    return {
      ...bond,
      faceValue: bond.faceValue * scale,
      marketPrice: targetMarketValue,
      pv01: bond.pv01 * scale,
      dv01: bond.dv01 * scale,
      cr01: bond.cr01 * scale,
      expectedLoss: bond.expectedLoss * scale,
    };
  });
}

function isInvestmentGrade(rating: string): boolean {
  const idx = RATING_ORDER.indexOf(rating);
  const bbbMinus = RATING_ORDER.indexOf("BBB-");
  return idx !== -1 && idx <= bbbMinus;
}

function isLowerRatedDebt(rating: string): boolean {
  const idx = RATING_ORDER.indexOf(rating);
  const bbbPlus = RATING_ORDER.indexOf("BBB+");
  return idx !== -1 && idx >= bbbPlus;
}

function shiftExposure(
  bonds: Bond[],
  currentWeights: Record<number, number>,
  increaseSelector: (bond: Bond) => boolean,
  decreaseSelector: (bond: Bond) => boolean,
  shiftPct: number
): Record<number, number> {
  const weights = { ...currentWeights };
  const toIncrease = bonds.filter(increaseSelector);
  const toDecrease = bonds.filter(decreaseSelector);
  if (toIncrease.length === 0 || toDecrease.length === 0) return currentWeights;

  const decreaseTotal = toDecrease.reduce((s, b) => s + (weights[b.id] ?? 0), 0);
  const increaseTotal = toIncrease.reduce((s, b) => s + (weights[b.id] ?? 0), 0);
  const delta = Math.min(shiftPct, decreaseTotal);
  if (delta <= 0) return currentWeights;

  for (const bond of toDecrease) {
    const w = weights[bond.id] ?? 0;
    const share = decreaseTotal > 0 ? w / decreaseTotal : 0;
    weights[bond.id] = Math.max(0, w - delta * share);
  }
  for (const bond of toIncrease) {
    const w = weights[bond.id] ?? 0;
    const share = increaseTotal > 0 ? w / increaseTotal : 1 / toIncrease.length;
    weights[bond.id] = w + delta * share;
  }

  return normalizeWeights(weights, bonds);
}

export function rebalanceWeights(
  bonds: Bond[],
  currentWeights: Record<number, number>,
  action: RebalanceAction,
  shiftPct: number = 10
): Record<number, number> {
  const normalized = normalizeWeights(currentWeights, bonds);
  const shift = Math.max(0, Math.min(100, shiftPct));

  switch (action) {
    case "increase_short_dated":
      return shiftExposure(
        bonds,
        normalized,
        (b) => b.maturityYears <= 5,
        (b) => b.maturityYears >= 10,
        shift
      );
    case "increase_long_dated":
      return shiftExposure(
        bonds,
        normalized,
        (b) => b.maturityYears >= 10,
        (b) => b.maturityYears <= 5,
        shift
      );
    case "increase_investment_grade":
      return shiftExposure(
        bonds,
        normalized,
        (b) => isInvestmentGrade(b.rating),
        (b) => isLowerRatedDebt(b.rating),
        shift
      );
    case "increase_lower_rated_debt":
      return shiftExposure(
        bonds,
        normalized,
        (b) => isLowerRatedDebt(b.rating),
        (b) => !isLowerRatedDebt(b.rating),
        shift
      );
    default:
      return normalized;
  }
}

function creditSpread(rating: string, rng: () => number): number {
  const base: Record<string, number> = {
    "AAA": 0.15, "AA+": 0.25, "AA": 0.35, "AA-": 0.50,
    "A+": 0.70, "A": 0.90, "A-": 1.10, "BBB+": 1.40,
    "BBB": 1.80, "BBB-": 2.30, "BB+": 3.00, "BB": 3.50,
  };
  return ((base[rating] ?? 1.0) + (rng() - 0.5) * 0.2) / 100;
}

function createBond(p: {
  id: number; issuer: string; sector: string; type: "Government" | "Corporate";
  rating: string; couponRate: number; maturityYears: number;
  faceValue: number; yieldToMaturity: number;
}): Bond {
  const isin = p.type === "Government"
    ? `US912828${String(p.id).padStart(3, "0")}${p.maturityYears}`
    : `US${p.issuer.replace(/[^A-Z]/gi, "").substring(0, 4).toUpperCase()}${String(p.id).padStart(3, "0")}${p.maturityYears}`;

  const annualCoupon = p.faceValue * (p.couponRate / 100);
  const y = p.yieldToMaturity / 100;

  const cashflows: Cashflow[] = [];
  for (let t = 1; t <= p.maturityYears; t++) {
    const principal = t === p.maturityYears ? p.faceValue : 0;
    const coupon = annualCoupon;
    const total = coupon + principal;
    const discounted = total / Math.pow(1 + y, t);
    cashflows.push({ year: t, coupon, principal, total, discounted });
  }

  const marketPrice = cashflows.reduce((s, cf) => s + cf.discounted, 0);
  const macaulayDuration = cashflows.reduce((s, cf) => s + cf.year * cf.discounted, 0) / marketPrice;
  const duration = macaulayDuration / (1 + y);
  const convexity = cashflows.reduce((s, cf) => s + cf.year * (cf.year + 1) * cf.discounted, 0) / (marketPrice * (1 + y) * (1 + y));
  const pv01 = duration * marketPrice * 0.0001;
  const dv01 = pv01;
  const cr01 = p.type === "Corporate" ? duration * marketPrice * 0.0001 : 0;
  const pd = (RATING_PD[p.rating] ?? 0.001) * 100;
  const lgd = (SECTOR_LGD[p.sector] ?? 0.40) * 100;
  const expectedLoss = (pd / 100) * (lgd / 100) * marketPrice;

  return {
    id: p.id, isin, issuer: p.issuer, sector: p.sector,
    type: p.type, rating: p.rating, couponRate: p.couponRate,
    maturityYears: p.maturityYears, faceValue: p.faceValue,
    marketPrice, yieldToMaturity: p.yieldToMaturity, currency: "USD",
    duration, macaulayDuration, convexity, pv01, dv01, cr01,
    pd, lgd, expectedLoss, cashflows,
  };
}

// ============================================================
// Portfolio Summary
// ============================================================
export function calculatePortfolioSummary(bonds: Bond[]): PortfolioSummary {
  const totalMarketValue = bonds.reduce((s, b) => s + b.marketPrice, 0);
  const totalFaceValue = bonds.reduce((s, b) => s + b.faceValue, 0);
  const weightedDuration = totalMarketValue > 0
    ? bonds.reduce((s, b) => s + b.duration * b.marketPrice, 0) / totalMarketValue
    : 0;
  const weightedConvexity = totalMarketValue > 0
    ? bonds.reduce((s, b) => s + b.convexity * b.marketPrice, 0) / totalMarketValue
    : 0;
  const totalPV01 = bonds.reduce((s, b) => s + b.pv01, 0);
  const totalDV01 = bonds.reduce((s, b) => s + b.dv01, 0);
  const totalCR01 = bonds.reduce((s, b) => s + b.cr01, 0);
  const totalExpectedLoss = bonds.reduce((s, b) => s + b.expectedLoss, 0);
  const averageYield = totalMarketValue > 0
    ? bonds.reduce((s, b) => s + b.yieldToMaturity * b.marketPrice, 0) / totalMarketValue
    : 0;

  const sectorMap = new Map<string, { value: number; count: number }>();
  const ratingMap = new Map<string, { value: number; count: number }>();

  for (const b of bonds) {
    const se = sectorMap.get(b.sector) ?? { value: 0, count: 0 };
    se.value += b.marketPrice;
    se.count++;
    sectorMap.set(b.sector, se);

    const re = ratingMap.get(b.rating) ?? { value: 0, count: 0 };
    re.value += b.marketPrice;
    re.count++;
    ratingMap.set(b.rating, re);
  }

  const sectorBreakdown = Array.from(sectorMap.entries())
    .map(([name, d]) => ({ name, value: d.value, count: d.count }))
    .sort((a, b) => b.value - a.value);

  const ratingBreakdown = Array.from(ratingMap.entries())
    .map(([name, d]) => ({ name, value: d.value, count: d.count }))
    .sort((a, b) => RATING_ORDER.indexOf(a.name) - RATING_ORDER.indexOf(b.name));

  return {
    totalMarketValue, totalFaceValue, weightedDuration, weightedConvexity,
    totalPV01, totalDV01, totalCR01, totalExpectedLoss, averageYield,
    governmentCount: bonds.filter(b => b.type === "Government").length,
    corporateCount: bonds.filter(b => b.type === "Corporate").length,
    sectorBreakdown, ratingBreakdown,
  };
}

// ============================================================
// Monte Carlo Simulation (Vasicek IR + Single-Factor Gaussian Copula)
// ============================================================
export function runMonteCarloSimulation(
  bonds: Bond[], numScenarios: number = 1000, seed: number = 123
): MonteCarloResult {
  const rng = mulberry32(seed);

  // Vasicek parameters
  const kappa = 0.5;
  const theta = 0.03;
  const sigmaR = 0.01;
  const r0 = 0.035;
  const dt = 1;

  // Gaussian Copula correlation
  const rho = 0.3;
  const sqrtRho = Math.sqrt(rho);
  const sqrtOneMinusRho = Math.sqrt(1 - rho);

  const scenarios: number[] = [];

  for (let s = 0; s < numScenarios; s++) {
    const zMarket = boxMuller(rng);

    // Interest rate shift (Vasicek)
    const dr = kappa * (theta - r0) * dt + sigmaR * Math.sqrt(dt) * zMarket;

    let pnl = 0;

    for (const bond of bonds) {
      // Rate impact (duration + convexity)
      const rateImpact = -bond.duration * bond.marketPrice * dr
        + 0.5 * bond.convexity * bond.marketPrice * dr * dr;

      // Credit risk (Gaussian Copula)
      const zIdio = boxMuller(rng);
      const zCredit = sqrtRho * zMarket + sqrtOneMinusRho * zIdio;
      const defaultBarrier = normInv(bond.pd / 100);

      if (zCredit < defaultBarrier) {
        pnl -= bond.marketPrice * (bond.lgd / 100);
      } else {
        pnl += rateImpact;
        if (bond.type === "Corporate") {
          const spreadShock = zCredit * 0.003;
          pnl -= bond.duration * bond.marketPrice * spreadShock;
        }
      }
    }

    scenarios.push(pnl);
  }

  const sorted = [...scenarios].sort((a, b) => a - b);
  const n05 = Math.floor(0.05 * numScenarios);
  const n01 = Math.floor(0.01 * numScenarios);

  const var95 = -sorted[n05];
  const var99 = -sorted[n01];
  const cvar95 = -sorted.slice(0, n05).reduce((s, v) => s + v, 0) / n05;
  const cvar99 = -sorted.slice(0, n01).reduce((s, v) => s + v, 0) / n01;
  const mean = scenarios.reduce((s, v) => s + v, 0) / numScenarios;
  const stdDev = Math.sqrt(scenarios.reduce((s, v) => s + (v - mean) ** 2, 0) / numScenarios);

  // Histogram
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  const nBins = 40;
  const binW = (hi - lo) / nBins;
  const histogram: MonteCarloResult["histogram"] = [];

  for (let i = 0; i < nBins; i++) {
    const bLow = lo + i * binW;
    const bHigh = bLow + binW;
    const count = scenarios.filter(v => v >= bLow && (i === nBins - 1 ? v <= bHigh : v < bHigh)).length;
    histogram.push({
      bucket: `${(bLow / 1000).toFixed(0)}K`,
      count,
      value: (bLow + bHigh) / 2,
    });
  }

  return { scenarios, var95, var99, cvar95, cvar99, mean, stdDev, histogram };
}

// Inverse normal CDF (Beasley-Springer-Moro)
function normInv(p: number): number {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  if (p === 0.5) return 0;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// ============================================================
// Chart data helpers
// ============================================================
export function getDurationDistribution(bonds: Bond[]): { bucket: string; count: number; value: number }[] {
  const buckets = [
    { label: "0-2Y", min: 0, max: 2 },
    { label: "2-5Y", min: 2, max: 5 },
    { label: "5-7Y", min: 5, max: 7 },
    { label: "7-10Y", min: 7, max: 10 },
    { label: "10-15Y", min: 10, max: 15 },
    { label: "15-20Y", min: 15, max: 20 },
    { label: "20Y+", min: 20, max: 100 },
  ];
  return buckets.map(b => ({
    bucket: b.label,
    count: bonds.filter(bond => bond.duration >= b.min && bond.duration < b.max).length,
    value: bonds.filter(bond => bond.duration >= b.min && bond.duration < b.max)
      .reduce((s, bond) => s + bond.marketPrice, 0),
  }));
}

export function getYieldCurveData(bonds: Bond[]): { maturity: number; yield: number; type: string; issuer: string }[] {
  return bonds.map(b => ({
    maturity: b.maturityYears,
    yield: b.yieldToMaturity,
    type: b.type,
    issuer: b.issuer,
  }));
}

export function getPV01BySector(bonds: Bond[]): { sector: string; pv01: number }[] {
  const map = new Map<string, number>();
  for (const b of bonds) {
    map.set(b.sector, (map.get(b.sector) ?? 0) + b.pv01);
  }
  return Array.from(map.entries())
    .map(([sector, pv01]) => ({ sector, pv01 }))
    .sort((a, b) => b.pv01 - a.pv01);
}

export function formatUSD(value: number, decimals: number = 0): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(decimals)}K`;
  return `$${value.toFixed(decimals)}`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
