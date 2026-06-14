/* 업로드 실판매 데이터 — 파싱·기간 정규화·SKU 매칭·집계.
   엑셀 컬럼: 기간 · SKU코드 · 제품명(참고) · 수량 · 판매단가
   원가(landed)는 원가모델 BASE(실제 적용환율) 기준. */
import { SKUS, BASE, costStack, KO, status, type Sku, type Status } from "./model";

export type Gran = "month" | "quarter" | "year";

export interface SalesRow {
  period: string;       // 원본 기간 문자열
  sku: string;          // 입력된 SKU 식별자(코드/이름)
  productName?: string; // 참고용
  qty: number;          // 판매수량(병)
  unitPrice: number;    // 판매단가(₩/병)
}

export interface Bucket {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
  qty: number;
  status: Status;
}

export interface SkuAgg {
  sku: string;
  name: string;
  koName: string;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
  qty: number;
  status: Status;
}

export interface Aggregated {
  buckets: Bucket[];
  bySku: SkuAgg[];
  totals: { revenue: number; cost: number; margin: number; marginRate: number; qty: number };
  matchedRows: number;
  unmatched: string[]; // 매칭 실패 SKU 식별자
  excluded: number;    // 선택 granularity 로 버킷 불가한 행 수
}

/* ---------- 기간 파싱 ---------- */
interface Resolved { year: number; quarter: number | null; month: number | null; }

function fromDate(d: Date): Resolved {
  const m = d.getMonth() + 1;
  return { year: d.getFullYear(), month: m, quarter: Math.floor((m - 1) / 3) + 1 };
}

export function parsePeriod(v: unknown): Resolved | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return fromDate(v);

  if (typeof v === "number") {
    if (v >= 2000 && v <= 2100) return { year: v, quarter: null, month: null };
    if (v >= 200001 && v <= 210012) {
      const y = Math.floor(v / 100), m = v % 100;
      if (m >= 1 && m <= 12) return { year: y, month: m, quarter: Math.floor((m - 1) / 3) + 1 };
    }
    // Excel serial date (1900 system)
    if (v >= 25569 && v <= 73415) {
      const d = new Date(Math.round((v - 25569) * 86400000));
      if (!isNaN(d.getTime())) return fromDate(d);
    }
    return null;
  }

  const s = String(v).trim();
  let m: RegExpMatchArray | null;

  // 분기: 2026-Q2 / 2026Q2 / 2026 2분기
  m = s.match(/(\d{4})\s*[-/.]?\s*[Qq]\s*([1-4])\b/) || s.match(/(\d{4})\D*?([1-4])\s*분기/);
  if (m) return { year: +m[1], quarter: +m[2], month: null };

  // 월: 2026-06 / 2026/6 / 2026.06 / 2026년 6월
  m = s.match(/(\d{4})\s*[-/.년]\s*(\d{1,2})/);
  if (m) {
    const mo = +m[2];
    if (mo >= 1 && mo <= 12) return { year: +m[1], month: mo, quarter: Math.floor((mo - 1) / 3) + 1 };
  }

  // YYYYMM
  m = s.match(/^(\d{4})(\d{2})$/);
  if (m) {
    const mo = +m[2];
    if (mo >= 1 && mo <= 12) return { year: +m[1], month: mo, quarter: Math.floor((mo - 1) / 3) + 1 };
  }

  // 연도만
  m = s.match(/^(\d{4})\s*년?$/);
  if (m) return { year: +m[1], quarter: null, month: null };

  return null;
}

function bucketOf(r: Resolved, gran: Gran): { key: string; label: string } | null {
  if (gran === "year") return { key: `${r.year}`, label: `${r.year}년` };
  if (gran === "quarter") {
    if (r.quarter == null) return null;
    return { key: `${r.year}-Q${r.quarter}`, label: `${r.year} ${r.quarter}분기` };
  }
  if (r.month == null) return null;
  return { key: `${r.year}-${String(r.month).padStart(2, "0")}`, label: `${r.year}.${String(r.month).padStart(2, "0")}` };
}

/* ---------- SKU 매칭 ---------- */
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();
const SKU_INDEX: Map<string, Sku> = (() => {
  const map = new Map<string, Sku>();
  for (const s of SKUS) {
    map.set(norm(s.sku), s);
    map.set(norm(s.name), s);
    map.set(norm(`${KO[s.flavor]}${s.name}`), s);
  }
  return map;
})();

export function matchSku(id: string): Sku | null {
  if (!id) return null;
  const n = norm(id);
  if (SKU_INDEX.has(n)) return SKU_INDEX.get(n)!;
  // 부분 일치(이름 포함) 폴백
  for (const s of SKUS) {
    if (norm(s.name).includes(n) || n.includes(norm(s.sku))) return s;
  }
  return null;
}

// SKU별 병당 원가(landed) — BASE(실제 적용환율) 기준, 메모이즈
const LANDED: Record<string, number> = (() => {
  const o: Record<string, number> = {};
  for (const s of SKUS) o[s.sku] = costStack(s, BASE).landed;
  return o;
})();

/* ---------- 집계 ---------- */
export function aggregate(rows: SalesRow[], gran: Gran): Aggregated {
  const buckets = new Map<string, Bucket>();
  const bySku = new Map<string, SkuAgg>();
  const unmatched = new Set<string>();
  let matchedRows = 0, excluded = 0;
  let tRev = 0, tCost = 0, tQty = 0;

  for (const row of rows) {
    const sku = matchSku(row.sku || row.productName || "");
    if (!sku) { if (row.sku || row.productName) unmatched.add(row.sku || row.productName || ""); continue; }
    const res = parsePeriod(row.period);
    if (!res) continue;
    const b = bucketOf(res, gran);
    if (!b) { excluded++; continue; }

    const qty = Number(row.qty) || 0;
    const unit = Number(row.unitPrice) || 0;
    if (qty <= 0) continue;
    const revenue = unit * qty;
    const cost = LANDED[sku.sku] * qty;
    matchedRows++;
    tRev += revenue; tCost += cost; tQty += qty;

    // bucket
    const cur = buckets.get(b.key) || { key: b.key, label: b.label, revenue: 0, cost: 0, margin: 0, marginRate: 0, qty: 0, status: "ok" as Status };
    cur.revenue += revenue; cur.cost += cost; cur.qty += qty;
    buckets.set(b.key, cur);

    // sku
    const cs = bySku.get(sku.sku) || { sku: sku.sku, name: sku.name, koName: KO[sku.flavor] || sku.flavor, revenue: 0, cost: 0, margin: 0, marginRate: 0, qty: 0, status: "ok" as Status };
    cs.revenue += revenue; cs.cost += cost; cs.qty += qty;
    bySku.set(sku.sku, cs);
  }

  const finalize = <T extends { revenue: number; cost: number; margin: number; marginRate: number; status: Status }>(x: T): T => {
    x.margin = x.revenue - x.cost;
    x.marginRate = x.revenue ? (x.margin / x.revenue) * 100 : 0;
    x.status = status(x.marginRate);
    return x;
  };

  const bucketArr = [...buckets.values()].map(finalize).sort((a, b) => a.key.localeCompare(b.key));
  const skuArr = [...bySku.values()].map(finalize).sort((a, b) => b.marginRate - a.marginRate);
  const margin = tRev - tCost;

  return {
    buckets: bucketArr,
    bySku: skuArr,
    totals: { revenue: tRev, cost: tCost, margin, marginRate: tRev ? (margin / tRev) * 100 : 0, qty: tQty },
    matchedRows,
    unmatched: [...unmatched],
    excluded,
  };
}

/* ---------- 엑셀 헤더 매핑 (유연) ---------- */
export const TEMPLATE_HEADERS = ["기간", "SKU코드", "제품명", "수량", "판매단가"] as const;

// 다양한 헤더명 → 표준 키
const HEADER_ALIASES: Record<string, keyof SalesRow> = {
  기간: "period", period: "period", 월: "period", 년월: "period", 날짜: "period",
  sku코드: "sku", sku: "sku", 코드: "sku", skucode: "sku",
  제품명: "productName", 제품: "productName", product: "productName", name: "productName", 품목: "productName",
  수량: "qty", qty: "qty", 판매수량: "qty", quantity: "qty", 병수: "qty",
  판매단가: "unitPrice", 단가: "unitPrice", unitprice: "unitPrice", price: "unitPrice", 가격: "unitPrice",
};

export function rowsFromSheet(raw: Record<string, unknown>[]): SalesRow[] {
  return raw
    .map((r) => {
      const out: Partial<SalesRow> = {};
      for (const [k, v] of Object.entries(r)) {
        const key = HEADER_ALIASES[norm(String(k))];
        if (!key) continue;
        if (key === "qty" || key === "unitPrice") {
          out[key] = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]/g, "")) || 0;
        } else if (v instanceof Date) {
          out[key] = `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}`;
        } else {
          out[key] = String(v ?? "").trim();
        }
      }
      return out as SalesRow;
    })
    .filter((r) => (r.sku || r.productName) && r.period);
}
