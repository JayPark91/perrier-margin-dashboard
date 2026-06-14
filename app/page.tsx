"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  BASE,
  computeAll,
  totals,
  monthly,
  brandTotals,
  TOPBAR_LOGO,
  type Scenario,
} from "@/lib/model";
import { KpiStrip } from "@/components/KpiStrip";
import { AlertBand } from "@/components/AlertBand";
import { Ranking } from "@/components/Ranking";
import { ScenarioPanel } from "@/components/ScenarioPanel";
import { Waterfall } from "@/components/Waterfall";
import { Trend } from "@/components/Trend";
import { BrandCompare } from "@/components/BrandCompare";
import { FxBanner } from "@/components/FxBanner";

// 레이아웃 기본값 (디자인 시안 Tweaks 의 '경영진' 배치 고정;
// '분석가'·'경보우선' variant CSS 는 globals.css 에 보존되어 추후 토글 추가 가능)
const LAYOUT = "경영진";

export default function Dashboard() {
  const [scn, setScn] = useState<Scenario>({ ...BASE });
  const [selected, setSelected] = useState("12574515"); // LIME 25cl CAN (위험)

  const rows = useMemo(() => computeAll(scn), [scn]);
  const tot = useMemo(() => totals(rows), [rows]);
  const baseRows = useMemo(() => computeAll(BASE), []);
  const base = useMemo(() => totals(baseRows), [baseRows]);
  const months = useMemo(() => monthly(scn), [scn]);
  const brands = useMemo(() => brandTotals(rows), [rows]);

  const selRow = rows.find((r) => r.sku === selected) || rows[0];
  const alertCount = rows.filter((r) => r.status !== "ok").length;
  const dirty =
    scn.eur !== BASE.eur ||
    scn.usd !== BASE.usd ||
    scn.tariff !== BASE.tariff ||
    scn.freightMult !== BASE.freightMult;

  return (
    <div className="app-root">
      <div className={"app layout-" + LAYOUT}>
        <FxBanner />

        <header className="topbar">
          <div className="brand">
            <span className="brand-plaque">
              <Image
                src={TOPBAR_LOGO}
                className="brand-logo"
                alt="Perrier"
                width={92}
                height={26}
                priority
              />
            </span>
            <span className="brand-divider" />
            <span className="brand-sub">공급가 · 마진 대시보드</span>
          </div>
          <div className="top-meta">
            <div className="chip">
              <span className="chip-k">기준</span>
              <span className="chip-v">2026년 6월</span>
            </div>
            <div className="chip">
              <span className="chip-k">SKU</span>
              <span className="chip-v">11종 · 소스/메종 2카테고리</span>
            </div>
            <div className="chip">
              <span className="chip-k">실현 마진율</span>
              <span className="chip-v" style={{ color: "var(--gold)" }}>
                {tot.marginPct.toFixed(1)}%
              </span>
            </div>
            {dirty && (
              <div className="chip chip-live">
                <span className="live-dot" />
                시나리오 적용중
              </div>
            )}
          </div>
        </header>

        <KpiStrip tot={tot} base={base} alerts={alertCount} />

        <AlertBand rows={rows} selected={selected} onSelect={setSelected} />

        <main className="grid">
          <section className="col-a">
            <Ranking rows={rows} selected={selected} onSelect={setSelected} />
            <Trend data={months} />
          </section>
          <section className="col-b">
            <ScenarioPanel
              scn={scn}
              setScn={setScn}
              dirty={dirty}
              onReset={() => setScn({ ...BASE })}
            />
            <Waterfall row={selRow} />
            <BrandCompare brands={brands} />
          </section>
        </main>

        <footer className="foot">
          <span>
            출처 · Google Sheet products 탭 실측 + 모델 — 공급가는 실제 적용환율
            (EUR ₩1,850 / USD ₩1,600) 기준 재산정, 실현 마진율 13.1%
          </span>
          <span>
            환율 = 한국은행 매매기준율 ×1.03·50원 올림 · 운임·통관 단가는 모델 가정 ·
            관세 0%(한·EU FTA)
          </span>
        </footer>
      </div>
    </div>
  );
}
