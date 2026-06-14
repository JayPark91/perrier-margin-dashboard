import { fmtKRW, STATUS, type Row } from "@/lib/model";

/* ---------- SKU 마진 랭킹 ---------- */
export function Ranking({
  rows,
  selected,
  onSelect,
}: {
  rows: Row[];
  selected: string;
  onSelect: (sku: string) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.marginPct - a.marginPct);
  const SCALE = 25; // % 만점
  return (
    <div className="panel ranking">
      <div className="panel-h">
        <span>SKU 마진 랭킹</span>
        <span className="panel-h-sub">높은 마진율 순 · 클릭하면 원가 분해</span>
      </div>
      <div className="rank-list">
        {sorted.map((r, i) => {
          const st = STATUS[r.status];
          const w = Math.max(2, Math.min(100, (r.marginPct / SCALE) * 100));
          const sel = r.sku === selected;
          const fmtName = r.name
            .replace(/ OWG GLASS| CAN| PET| GLASS/, "")
            .replace(
              /^(LIME|LEMON|GRAPEFRUIT|PINA FIZZ|LEMONJITO|LIME & GINGER)\s*/i,
              ""
            );
          return (
            <button
              className={"rank-row" + (sel ? " sel" : "")}
              key={r.sku}
              onClick={() => onSelect(r.sku)}
            >
              <span className="rank-i">{String(i + 1).padStart(2, "0")}</span>
              <span className="rank-name">
                <span className="rank-name-main">
                  {r.koName} <span className="rank-fmt">{fmtName}</span>
                </span>
                <span className="rank-cat">
                  {r.catKo} · {r.name}
                </span>
              </span>
              <span className="rank-bar-wrap">
                <span
                  className="rank-bar"
                  style={{ width: w + "%", background: st.color }}
                />
              </span>
              <span className="rank-pct" style={{ color: st.color }}>
                {r.marginPct.toFixed(1)}%
              </span>
              <span className="rank-rev mono">{fmtKRW(r.revenue, "short")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
