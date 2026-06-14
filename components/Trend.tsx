import { fmtKRW, type MonthPoint } from "@/lib/model";

/* ---------- 월별 매출·마진 추이 ---------- */
export function Trend({ data }: { data: MonthPoint[] }) {
  const W = 560, H = 230, padT = 22, padB = 34, padL = 14, padR = 14;
  const maxRev = Math.max(...data.map((d) => d.revenue)) * 1.15;
  const minPct = Math.min(...data.map((d) => d.marginPct)) - 2;
  const maxPct = Math.max(...data.map((d) => d.marginPct)) + 2;
  const n = data.length;
  const slot = (W - padL - padR) / n;
  const bw = slot * 0.46;
  const yRev = (v: number) => padT + (H - padT - padB) * (1 - v / maxRev);
  const yPct = (v: number) =>
    padT + (H - padT - padB) * (1 - (v - minPct) / (maxPct - minPct));
  const cx = (i: number) => padL + slot * i + slot / 2;
  const linePts = data.map((d, i) => `${cx(i)},${yPct(d.marginPct)}`).join(" ");

  return (
    <div className="panel trend">
      <div className="panel-h">
        <span>월별 매출 · 마진율 추이</span>
        <span className="panel-h-sub">막대 매출 · 라인 마진율 · 2026 상반기</span>
      </div>
      <div className="tr-svg-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="tr-svg"
        >
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E6650" />
              <stop offset="100%" stopColor="#0E4030" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((g, i) => (
            <line
              key={i}
              x1={padL}
              x2={W - padR}
              y1={yRev(maxRev * g)}
              y2={yRev(maxRev * g)}
              className="tr-grid"
            />
          ))}
          {data.map((d, i) => {
            const x = padL + slot * i + (slot - bw) / 2;
            return (
              <g key={d.month}>
                <rect
                  x={x}
                  y={yRev(d.revenue)}
                  width={bw}
                  height={H - padB - yRev(d.revenue)}
                  rx="2.5"
                  className="tr-bar"
                />
                <text
                  x={cx(i)}
                  y={yRev(d.revenue) - 7}
                  textAnchor="middle"
                  className="tr-rev"
                >
                  {fmtKRW(d.revenue, "short")}
                </text>
                <text
                  x={cx(i)}
                  y={H - padB + 18}
                  textAnchor="middle"
                  className="tr-lab"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
          <polyline points={linePts} className="tr-line" fill="none" />
          {data.map((d, i) => (
            <g key={"p" + i}>
              <circle cx={cx(i)} cy={yPct(d.marginPct)} r="3.5" className="tr-dot" />
              <text
                x={cx(i)}
                y={yPct(d.marginPct) - 9}
                textAnchor="middle"
                className="tr-pct"
              >
                {d.marginPct.toFixed(1)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
