/* Perrier 공급가·마진 데이터 모델
   출처: Google Sheet "페리에 공급가·마진 대시보드 데이터" (products 탭 실측) +
   recon 집계(₩130,244,500 · 마진 13.1% · 경보 4종)에 맞춘 prices/sales 모델.
   - 출고가(EUR)는 EUR→KRW, 운임(USD 청구)은 USD→KRW 환율을 각각 적용.
   - 카테고리(브랜드): 소스 페리에(플레인 유리 20/33/75cl) / 메종 페리에(나머지 전부).
   원본 프로토타입 app/data.js (v2) 를 TypeScript 로 이식 (계산식·캘리브레이션 동일). */

export type Cat = "GLASS" | "CAN" | "PET";
export type Brand = "source" | "maison";
export type Flavor =
  | "Plain" | "Lime" | "Lemon" | "Grapefruit"
  | "Lime & Ginger" | "Lemonjito" | "Pina Fizz";
export type Status = "risk" | "watch" | "ok";

export interface Sku {
  sku: string;
  name: string;
  brand: Brand;
  cat: Cat;
  flavor: Flavor;
  hs: string;
  upb: number;        // 박스당 입수
  eur: number;        // 출고가 (€/병)
  freightUsd: number; // 병당 운임 (USD)
  supply: number;     // 소매 공급가 (₩/병)
  volJun: number;     // 2026-06 판매량 (병)
}

export interface Scenario {
  eur: number;         // EUR → KRW (출고가)
  usd: number;         // USD → KRW (운임·물류)
  tariff: number;      // % (한·EU FTA 현재 0%)
  freightMult: number; // 운임 지수 (1.0 = 기준)
  customsRate: number; // 통관·포워딩 (CIF 의 2.5%)
  period: string;
}

export interface CostStack {
  exw: number;
  freight: number;
  duty: number;
  customs: number;
  landed: number;
  supply: number;
  margin: number;
  marginPct: number;
}

export interface Row extends Sku, CostStack {
  koName: string;
  catKo: string;
  brandKo: string;
  brandEn: string;
  img: string | null;
  status: Status;
  vol: number;
  revenue: number;
  marginAmt: number;
}

export interface Totals {
  revenue: number;
  marginAmt: number;
  units: number;
  marginPct: number;
}

export interface BrandTotal extends Totals {
  brand: Brand;
  ko: string;
  en: string;
  count: number;
  alerts: number;
}

export interface MonthPoint {
  month: string;
  label: string;
  eur: number;
  usd: number;
  revenue: number;
  marginAmt: number;
  units: number;
  marginPct: number;
}

// 기준 시나리오
export const BASE: Scenario = {
  eur: 1450, // EUR → KRW (출고가)
  usd: 1350, // USD → KRW (운임·물류)
  tariff: 0,
  freightMult: 1,
  customsRate: 0.025,
  period: "2026-06",
};

// 월별 실적 환율 (EUR·USD 모두 상승 추세 → 마진 압박)
export const EUR_HISTORY: Record<string, number> = {
  "2026-01": 1390, "2026-02": 1405, "2026-03": 1420,
  "2026-04": 1432, "2026-05": 1444, "2026-06": 1450,
};
export const USD_HISTORY: Record<string, number> = {
  "2026-01": 1330, "2026-02": 1335, "2026-03": 1340,
  "2026-04": 1345, "2026-05": 1348, "2026-06": 1350,
};
export const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
export const MONTH_LABEL: Record<string, string> = {
  "2026-01": "1월", "2026-02": "2월", "2026-03": "3월",
  "2026-04": "4월", "2026-05": "5월", "2026-06": "6월",
};

// 시즌 곡선 (6월 = 1.00)
const SEASON: Record<string, number[]> = {
  source: [0.90, 0.91, 0.93, 0.95, 0.98, 1.0], // 플레인: 안정적
  CAN:    [0.72, 0.77, 0.84, 0.90, 0.95, 1.0],
  PET:    [0.74, 0.79, 0.85, 0.91, 0.96, 1.0],
  GLASSF: [0.80, 0.83, 0.88, 0.92, 0.96, 1.0], // 가향 유리
};
function seasonKey(s: Sku): string {
  if (s.brand === "source") return "source";
  if (s.cat === "GLASS") return "GLASSF";
  return s.cat;
}

// SKU 마스터 (products 탭 실측 + 모델 공급가/운임/판매량)
export const SKUS: Sku[] = [
  { sku: "11652556", name: "20cl OWG GLASS",   brand: "source", cat: "GLASS", flavor: "Plain",     hs: "2201.1", upb: 24, eur: 0.4203, freightUsd: 0.0519, supply: 842,  volJun: 25000 },
  { sku: "12620194", name: "33cl OWG GLASS",   brand: "source", cat: "GLASS", flavor: "Plain",     hs: "2201.1", upb: 24, eur: 0.46,   freightUsd: 0.0630, supply: 944,  volJun: 20500 },
  { sku: "12620243", name: "75cl OWG GLASS",   brand: "source", cat: "GLASS", flavor: "Plain",     hs: "2201.1", upb: 12, eur: 0.80,   freightUsd: 0.1111, supply: 1678, volJun: 10300 },
  { sku: "12574515", name: "LIME 25cl CAN",    brand: "maison", cat: "CAN",   flavor: "Lime",      hs: "2202.1", upb: 30, eur: 0.3383, freightUsd: 0.0311, supply: 560,  volJun: 13600 },
  { sku: "12574518", name: "LEMON 25cl CAN",   brand: "maison", cat: "CAN",   flavor: "Lemon",     hs: "2202.1", upb: 30, eur: 0.3383, freightUsd: 0.0311, supply: 576,  volJun: 13600 },
  { sku: "12574489", name: "GRAPEFRUIT 25cl CAN", brand: "maison", cat: "CAN", flavor: "Grapefruit", hs: "2202.1", upb: 30, eur: 0.3383, freightUsd: 0.0311, supply: 632, volJun: 12400 },
  { sku: "12574517", name: "LIME 50cl PET",    brand: "maison", cat: "PET",   flavor: "Lime",      hs: "2202.1", upb: 24, eur: 0.4226, freightUsd: 0.0444, supply: 784,  volJun: 14800 },
  { sku: "12574516", name: "LEMON 50cl PET",   brand: "maison", cat: "PET",   flavor: "Lemon",     hs: "2202.1", upb: 24, eur: 0.4226, freightUsd: 0.0444, supply: 730,  volJun: 14800 },
  { sku: "12620971", name: "LIME & GINGER 33cl OWG GLASS", brand: "maison", cat: "GLASS", flavor: "Lime & Ginger", hs: "2202.1", upb: 24, eur: 0.4841, freightUsd: 0.0630, supply: 926, volJun: 11300 },
  { sku: "12574528", name: "LEMONJITO 25cl CAN", brand: "maison", cat: "CAN", flavor: "Lemonjito", hs: "2202.1", upb: 24, eur: 0.4841, freightUsd: 0.0311, supply: 810, volJun: 9200 },
  { sku: "12605790", name: "PINA FIZZ 25cl CAN", brand: "maison", cat: "CAN", flavor: "Pina Fizz", hs: "2202.1", upb: 24, eur: 0.4841, freightUsd: 0.0311, supply: 855, volJun: 10300 },
];

// 제품 이미지 (업로드 본품 컷, public/products/) — 11종 전체
export const IMG: Record<string, string> = {
  "11652556": "/products/source-glass-200.png", // 20cl (실제 330ml 이미지 대체)
  "12620194": "/products/source-glass-330.png", // 33cl
  "12620243": "/products/source-glass-750.png", // 75cl
  "12574515": "/products/lime-can-250.png",
  "12574518": "/products/lemon-can-250.png",
  "12574489": "/products/grapefruit-can-250.png",
  "12574517": "/products/lime-pet-500.png",
  "12574516": "/products/lemon-pet-500.png",
  "12620971": "/products/limeginger-glass-330.png",
  "12574528": "/products/lemonjito-can-250.png",
  "12605790": "/products/pinafizz-can-250.png",
};

// 브랜드 로고 (public/brand/)
export const BRAND_LOGO: Record<Brand, string> = {
  source: "/brand/logo-source.png",
  maison: "/brand/logo-perrier.png",
};
export const TOPBAR_LOGO = "/brand/logo-perrier.png";

// 한글 표시명 ("레몬히또" — 사용자 교정)
export const KO: Record<string, string> = {
  Plain: "플레인", Lime: "라임", Lemon: "레몬", Grapefruit: "자몽",
  "Lime & Ginger": "라임&진저", Lemonjito: "레몬히또", "Pina Fizz": "피나피즈",
};
export const CAT_KO: Record<Cat, string> = { GLASS: "유리", CAN: "캔", PET: "페트" };
export const BRAND_KO: Record<Brand, string> = { source: "소스 페리에", maison: "메종 페리에" };
export const BRAND_EN: Record<Brand, string> = { source: "Source Perrier", maison: "Maison Perrier" };

// 단일 SKU 원가 분해 (EUR/USD 환율 분리)
export function costStack(s: Sku, scn: Scenario): CostStack {
  const exw     = s.eur * scn.eur;                              // 출고가 (€ × EUR환율)
  const freight = s.freightUsd * scn.usd * scn.freightMult;     // 운임 ($ × USD환율 × 지수)
  const cif     = exw + freight;
  const duty    = cif * (scn.tariff / 100);                     // 관세
  const customs = (cif + duty) * scn.customsRate;                // 통관·포워딩
  const landed  = exw + freight + duty + customs;                // 공급원가
  const margin  = s.supply - landed;
  const marginPct = s.supply > 0 ? (margin / s.supply) * 100 : 0;
  return { exw, freight, duty, customs, landed, supply: s.supply, margin, marginPct };
}

export function status(marginPct: number): Status {
  if (marginPct < 3) return "risk";   // 🔴 위험
  if (marginPct < 6) return "watch";  // 🟡 주의
  return "ok";                        // 🟢 양호
}

export function computeAll(scn: Scenario): Row[] {
  return SKUS.map((s) => {
    const c = costStack(s, scn);
    return {
      ...s,
      ...c,
      koName: KO[s.flavor] || s.flavor,
      catKo: CAT_KO[s.cat],
      brandKo: BRAND_KO[s.brand],
      brandEn: BRAND_EN[s.brand],
      img: IMG[s.sku] || null,
      status: status(c.marginPct),
      vol: s.volJun,
      revenue: s.supply * s.volJun,
      marginAmt: c.margin * s.volJun,
    };
  });
}

export function totals(rows: Row[]): Totals {
  const revenue = rows.reduce((a, r) => a + r.revenue, 0);
  const marginAmt = rows.reduce((a, r) => a + r.marginAmt, 0);
  const units = rows.reduce((a, r) => a + r.vol, 0);
  return { revenue, marginAmt, units, marginPct: revenue ? (marginAmt / revenue) * 100 : 0 };
}

// 브랜드(소스/메종)별 집계
export function brandTotals(rows: Row[]): Record<Brand, BrandTotal> {
  const out = {} as Record<Brand, BrandTotal>;
  (["source", "maison"] as Brand[]).forEach((b) => {
    const g = rows.filter((r) => r.brand === b);
    const t = totals(g);
    out[b] = {
      ...t,
      brand: b,
      ko: BRAND_KO[b],
      en: BRAND_EN[b],
      count: g.length,
      alerts: g.filter((r) => r.status !== "ok").length,
    };
  });
  return out;
}

// 월별 추이 (실적 환율 사용, 관세/운임지수는 시나리오 반영)
export function monthly(scn: Scenario): MonthPoint[] {
  return MONTHS.map((m, i) => {
    const eur = EUR_HISTORY[m];
    const usd = USD_HISTORY[m];
    let revenue = 0, marginAmt = 0, units = 0;
    SKUS.forEach((s) => {
      const f = SEASON[seasonKey(s)][i];
      const vol = Math.round(s.volJun * f);
      const c = costStack(s, { ...scn, eur, usd });
      revenue += s.supply * vol;
      marginAmt += c.margin * vol;
      units += vol;
    });
    return {
      month: m, label: MONTH_LABEL[m], eur, usd, revenue, marginAmt, units,
      marginPct: revenue ? (marginAmt / revenue) * 100 : 0,
    };
  });
}

export function fmtKRW(n: number, opt?: "short"): string {
  const v = Math.round(n);
  if (opt === "short") {
    if (Math.abs(v) >= 1e8) return "₩" + (v / 1e8).toFixed(1) + "억";
    if (Math.abs(v) >= 1e4) return "₩" + (v / 1e4).toFixed(0) + "만";
  }
  return "₩" + v.toLocaleString("ko-KR");
}
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

// 상태색·라벨 (컴포넌트 공유)
export const STATUS: Record<Status, { color: string; label: string; dot: string }> = {
  risk:  { color: "#E5604D", label: "위험", dot: "🔴" },
  watch: { color: "#E6B450", label: "주의", dot: "🟡" },
  ok:    { color: "#5BC68A", label: "양호", dot: "🟢" },
};
