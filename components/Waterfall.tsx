import { fmtKRW, fmtNum, STATUS, type Row } from "@/lib/model";

type WfStep = {
  k: string;
  v: number;
  type: "base" | "add" | "total" | "price" | "margin";
  note?: string;
};

/* ---------- 원가 워터폴 ---------- */
export function Waterfall({ row }: { row: Row | undefined }) {
  if (!row) return null;
  const st = STATUS[row.status];
  // 단계: 출고가 → +운임 → +관세 → +통관 = 공급원가 → 공급가 → 마진
  const steps: WfStep[] = [
    { k: "출고가", v: row.exw, type: "base", note: `€${row.eur} × 환율` },
    { k: "운임·물류", v: row.freight, type: "add" },
    { k: "관세", v: row.duty, type: "add" },
    { k: "통관·포워딩", v: row.customs, type: "add" },
    { k: "공급원가", v: row.landed, type: "total" },
    { k: "공급가", v: row.supply, type: "price" },
    { k: "마진", v: row.margin, type: "margin" },
  ];
  const W = 560, H = 240, padT = 30, padB = 42, padL = 8, padR = 8;
  const n = steps.length;
  const gap = 16;
  const bw = (W - padL - padR - gap * (n - 1)) / n;
  const maxV = Math.max(row.supply, row.landed) * 1.12;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / maxV);
  const h = (v: number) => (H - padT - padB) * (v / maxV);

  let cum = 0;
  const bars = steps.map((s, i) => {
    const x = padL + i * (bw + gap);
    let fill = "var(--addc)";
    let lo = 0;
    let hi = 0;
    if (s.type === "base") { lo = 0; hi = s.v; cum = s.v; fill = "var(--exw)"; }
    else if (s.type === "add") { lo = cum; hi = cum + s.v; cum += s.v; fill = "var(--addc)"; }
    else if (s.type === "total") { lo = 0; hi = s.v; cum = s.v; fill = "var(--landed)"; }
    else if (s.type === "price") { lo = 0; hi = s.v; fill = "var(--gold)"; }
    else if (s.type === "margin") { lo = row.landed; hi = row.supply; fill = st.color; }
    const top = y(hi);
    const height = Math.max(2, h(hi - lo));
    return { ...s, x, top, height, fill, lo, hi, i };
  });

  return (
    <div className="panel waterfall">
      <div className="panel-h">
        <span>원가 분해 워터폴</span>
        <span className="panel-h-sub">
          {row.koName} · {row.name} · 병당 (₩)
        </span>
      </div>
      <div className="wf-svg-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="wf-svg"
        >
          {/* connectors */}
          {bars.map((b, i) => {
            if (i === 0 || b.type === "total" || b.type === "price") return null;
            const prev = bars[i - 1];
            const yy = b.type === "margin" ? y(row.landed) : y(prev.hi);
            return (
              <line
                key={"c" + i}
                x1={prev.x + bw}
                y1={yy}
                x2={b.x}
                y2={yy}
                className="wf-conn"
              />
            );
          })}
          {bars.map((b) => (
            <g key={b.k}>
              <rect
                x={b.x}
                y={b.top}
                width={bw}
                height={b.height}
                rx="2.5"
                fill={b.fill}
                opacity={b.type === "add" ? 0.9 : 1}
              />
              <text
                x={b.x + bw / 2}
                y={b.top - 8}
                className="wf-val"
                textAnchor="middle"
              >
                {b.type === "add" && b.v > 0 ? "+" : ""}
                {fmtNum(b.v)}
              </text>
              <text
                x={b.x + bw / 2}
                y={H - padB + 18}
                className="wf-lab"
                textAnchor="middle"
              >
                {b.k}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="wf-foot">
        <div className="wf-foot-i">
          <span className="wf-foot-k">병당 마진</span>
          <span className="mono" style={{ color: st.color }}>{fmtKRW(row.margin)}</span>
        </div>
        <div className="wf-foot-i">
          <span className="wf-foot-k">마진율</span>
          <span className="mono" style={{ color: st.color }}>
            {row.marginPct.toFixed(1)}% {st.dot}
          </span>
        </div>
        <div className="wf-foot-i">
          <span className="wf-foot-k">6월 판매</span>
          <span className="mono">{fmtNum(row.vol)}병</span>
        </div>
        <div className="wf-foot-i">
          <span className="wf-foot-k">마진 기여</span>
          <span className="mono">{fmtKRW(row.marginAmt, "short")}</span>
        </div>
      </div>
    </div>
  );
}
