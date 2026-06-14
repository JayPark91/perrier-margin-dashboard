"use client";

import { useEffect, useState } from "react";

interface FxLeg {
  official: number;
  applied: number;
  date: string;
}
interface FxData {
  ok: boolean;
  source?: string;
  eur?: FxLeg;
  usd?: FxLeg;
  buffer?: number;
  roundUpTo?: number;
  reason?: string;
}

function fmtDate(yyyymmdd?: string) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}
const won = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");

export function FxBanner() {
  const [fx, setFx] = useState<FxData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d: FxData) => {
        if (!alive) return;
        if (d.ok) setFx(d);
        else setErr(d.reason || "환율 조회 실패");
      })
      .catch(() => alive && setErr("환율 조회 실패"));
    return () => {
      alive = false;
    };
  }, []);

  const date = fx?.eur?.date || fx?.usd?.date;

  return (
    <div className="fxbar">
      <div className="fxbar-lead">
        <span className="fxbar-dot" />
        <span className="fxbar-title">한국은행 매매기준율</span>
        {date && <span className="fxbar-date">{fmtDate(date)} 기준</span>}
      </div>

      {fx && (
        <div className="fxbar-rates">
          <div className="fxleg">
            <span className="fxleg-k">EUR</span>
            <span className="fxleg-v mono">{won(fx.eur!.official)}</span>
            <span className="fxleg-app mono">적용 {won(fx.eur!.applied)}</span>
          </div>
          <div className="fxleg">
            <span className="fxleg-k">USD</span>
            <span className="fxleg-v mono">{won(fx.usd!.official)}</span>
            <span className="fxleg-app mono">적용 {won(fx.usd!.applied)}</span>
          </div>
          <span className="fxbar-note">
            적용 = 고시 ×1.03, 50원 올림 · 출처 ECOS
          </span>
        </div>
      )}

      {!fx && !err && <span className="fxbar-state">환율 불러오는 중…</span>}
      {err && (
        <span className="fxbar-state fxbar-err">
          환율 조회 불가 — {err}
        </span>
      )}
    </div>
  );
}
