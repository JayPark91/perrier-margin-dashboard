import Image from "next/image";
import {
  fmtKRW,
  STATUS,
  BRAND_LOGO,
  type Brand,
  type BrandTotal,
} from "@/lib/model";

/* ---------- 브랜드 라인 마진 비교 (소스 vs 메종) ---------- */
export function BrandCompare({
  brands,
}: {
  brands: Record<Brand, BrandTotal>;
}) {
  const order: Brand[] = ["source", "maison"];
  const top = Math.max(...order.map((b) => brands[b].marginPct));
  const gap = brands.source.marginPct - brands.maison.marginPct;
  const SCALE = 22;
  return (
    <div className="panel brandcmp">
      <div className="panel-h">
        <span>브랜드 라인 마진 비교</span>
        <span className="panel-h-sub">소스 페리에 vs 메종 페리에 · 2026년 6월</span>
      </div>
      <div className="bc-grid">
        {order.map((b) => {
          const d = brands[b];
          const st =
            STATUS[d.marginPct < 3 ? "risk" : d.marginPct < 6 ? "watch" : "ok"];
          const w = Math.max(4, Math.min(100, (d.marginPct / SCALE) * 100));
          return (
            <div key={b} className={"bc-card" + (d.marginPct === top ? " lead" : "")}>
              <div className="bc-logo-wrap">
                <Image
                  src={BRAND_LOGO[b]}
                  alt={d.en}
                  className="bc-logo"
                  width={120}
                  height={30}
                />
              </div>
              <div className="bc-body">
                <div className="bc-titles">
                  <span className="bc-ko">{d.ko}</span>
                  <span className="bc-en">
                    {d.en} · {d.count} SKU
                  </span>
                </div>
                <div className="bc-pct" style={{ color: st.color }}>
                  {d.marginPct.toFixed(1)}
                  <span className="bc-pct-u">%</span>
                </div>
                <div className="bc-bar-wrap">
                  <span
                    className="bc-bar"
                    style={{ width: w + "%", background: st.color }}
                  />
                </div>
                <div className="bc-metrics">
                  <div>
                    <span className="bc-mk">매출</span>
                    <span className="mono">{fmtKRW(d.revenue, "short")}</span>
                  </div>
                  <div>
                    <span className="bc-mk">마진액</span>
                    <span className="mono">{fmtKRW(d.marginAmt, "short")}</span>
                  </div>
                  <div>
                    <span className="bc-mk">경보</span>
                    <span
                      className="mono"
                      style={{ color: d.alerts ? "#E5604D" : "inherit" }}
                    >
                      {d.alerts}종
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bc-insight">
        <span className="bc-insight-dot" />
        소스 페리에가 메종 페리에보다 마진율{" "}
        <strong>
          {gap >= 0 ? "+" : ""}
          {gap.toFixed(1)}%p
        </strong>{" "}
        {gap >= 0 ? "높음" : "낮음"}
        <span className="bc-insight-sub">
          — 가향 라인(메종) 원가 부담이 수익성 격차의 핵심
        </span>
      </div>
    </div>
  );
}
