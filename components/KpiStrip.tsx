import type { ReactNode } from "react";
import { fmtKRW, type Totals } from "@/lib/model";

/* ---------- 작은 프리미티브 ---------- */
export function Delta({
  value,
  suffix = "",
  invert = false,
}: {
  value: number | null | undefined;
  suffix?: string;
  invert?: boolean;
}) {
  if (value === 0 || value == null) return <span className="delta flat">—</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span className={"delta " + (good ? "pos" : "neg")}>
      {up ? "▲" : "▼"}{" "}
      {Math.abs(value).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}

/* ---------- KPI 스트립 ---------- */
export function KpiStrip({
  tot,
  base,
  alerts,
}: {
  tot: Totals;
  base: Totals;
  alerts: number;
}) {
  const dRev = tot.revenue - base.revenue;
  const dMarPct = tot.marginPct - base.marginPct;
  const dMarAmt = tot.marginAmt - base.marginAmt;
  const moved = Math.abs(dRev) > 1 || Math.abs(dMarAmt) > 1;
  const cards: {
    k: string;
    v: ReactNode;
    sub: ReactNode;
    big?: boolean;
    accent?: boolean;
    warn?: boolean;
  }[] = [
    {
      k: "총매출",
      v: fmtKRW(tot.revenue),
      sub: moved ? <Delta value={Math.round(dRev / 1e4)} suffix="만" /> : "2026년 6월",
      big: true,
    },
    {
      k: "총 마진액",
      v: fmtKRW(tot.marginAmt),
      sub: moved ? <Delta value={Math.round(dMarAmt / 1e4)} suffix="만" /> : "공급가 − 공급원가",
    },
    {
      k: "실현 마진율",
      v: tot.marginPct.toFixed(1) + "%",
      sub: moved ? <Delta value={+dMarPct.toFixed(1)} suffix="%p" /> : "기준 시나리오",
      accent: true,
    },
    {
      k: "마진 경보",
      v: alerts,
      sub: "SKU · 마진율 6% 미만",
      warn: true,
    },
  ];
  return (
    <div className="kpi-strip">
      {cards.map((c, i) => (
        <div
          className={
            "kpi" + (c.accent ? " kpi-accent" : "") + (c.warn ? " kpi-warn" : "")
          }
          key={i}
        >
          <div className="kpi-k">{c.k}</div>
          <div className={"kpi-v" + (c.big ? " kpi-v-lg" : "")}>{c.v}</div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
