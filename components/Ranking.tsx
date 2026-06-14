"use client";

import { useState } from "react";
import Image from "next/image";
import { fmtKRW, STATUS, type Row } from "@/lib/model";

/* ---------- SKU 마진 랭킹 (+ 이름 검색) ---------- */
export function Ranking({
  rows,
  selected,
  onSelect,
}: {
  rows: Row[];
  selected: string;
  onSelect: (sku: string) => void;
}) {
  const [q, setQ] = useState("");
  const SCALE = 25; // % 만점
  const query = q.trim().toLowerCase();
  const sorted = [...rows]
    .sort((a, b) => b.marginPct - a.marginPct)
    .filter((r) =>
      !query
        ? true
        : `${r.koName} ${r.name} ${r.catKo} ${r.brandKo}`
            .toLowerCase()
            .includes(query)
    );

  return (
    <div className="panel ranking">
      <div className="panel-h">
        <span>SKU 마진 랭킹</span>
        <span className="panel-h-sub">높은 마진율 순 · 클릭하면 원가 분해</span>
      </div>

      <div className="rank-search">
        <svg className="rank-search-i" viewBox="0 0 24 24" width="15" height="15" aria-hidden>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SKU 이름 검색 (예: 라임, LEMON, 75cl)"
          aria-label="SKU 이름 검색"
        />
        {q && (
          <button className="rank-search-x" onClick={() => setQ("")} aria-label="검색 지우기">
            ×
          </button>
        )}
      </div>

      <div className="rank-list">
        {sorted.length === 0 && (
          <div className="rank-empty">「{q}」 검색 결과 없음</div>
        )}
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
              <span className="rank-thumb">
                {r.img && (
                  <Image src={r.img} alt="" fill sizes="34px" />
                )}
              </span>
              <span className="rank-name">
                <span className="rank-name-main">
                  {r.koName} <span className="rank-fmt">{fmtName}</span>
                </span>
                <span className="rank-cat">
                  {r.brandKo} · {r.catKo} · {r.name}
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
