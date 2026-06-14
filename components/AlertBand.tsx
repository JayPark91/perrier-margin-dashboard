import Image from "next/image";
import { fmtKRW, STATUS, type Row } from "@/lib/model";

/* ---------- 마진 경보 밴드 (상단·제품 이미지 포함) ---------- */
export function AlertBand({
  rows,
  selected,
  onSelect,
}: {
  rows: Row[];
  selected: string;
  onSelect: (sku: string) => void;
}) {
  const flagged = rows
    .filter((r) => r.status !== "ok")
    .sort((a, b) => a.marginPct - b.marginPct);

  return (
    <div className="panel alert-band">
      <div className="panel-h">
        <span>마진 경보 — 위험 SKU</span>
        <span className="panel-h-sub">
          {flagged.length}종 · 마진율 6% 미만 · 즉시 점검 대상
        </span>
      </div>
      <div className="ab-grid">
        {flagged.map((r) => {
          const st = STATUS[r.status];
          const sel = r.sku === selected;
          const img = r.img;
          return (
            <div
              key={r.sku}
              className={"ab-card" + (sel ? " sel" : "")}
              style={{ ["--st" as string]: st.color }}
            >
              <div
                className="ab-info"
                onClick={() => onSelect(r.sku)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(r.sku);
                }}
              >
                <div className="ab-top">
                  <span className="ab-dot" style={{ background: st.color }} />
                  <span
                    className="ab-tag"
                    style={{ color: st.color, borderColor: st.color }}
                  >
                    {st.label}
                  </span>
                  <span className="ab-pct mono" style={{ color: st.color }}>
                    {r.marginPct.toFixed(1)}%
                  </span>
                </div>
                <div className="ab-name">
                  {r.koName} <span className="ab-fmt">{r.name}</span>
                </div>
              </div>
              <div className="ab-imgwrap">
                {img && (
                  <Image
                    src={img}
                    alt={`${r.koName} ${r.name} 제품컷`}
                    fill
                    sizes="(max-width:1080px) 50vw, 22vw"
                  />
                )}
              </div>
              <div className="ab-cap mono">
                <span>병당 마진 {fmtKRW(r.margin)}</span>
                <span>기여 {fmtKRW(r.marginAmt, "short")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
