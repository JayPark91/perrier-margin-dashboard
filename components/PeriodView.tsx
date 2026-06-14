"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { SKUS, KO, fmtKRW, fmtNum, STATUS } from "@/lib/model";
import {
  aggregate,
  rowsFromSheet,
  TEMPLATE_HEADERS,
  type Gran,
  type SalesRow,
} from "@/lib/sales";

const LS_KEY = "perrier-sales-v1";
const GRAN_LABEL: Record<Gran, string> = { month: "월별", quarter: "분기별", year: "연도별" };

export function PeriodView() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [gran, setGran] = useState<Gran>("month");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // localStorage 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setRows(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (r: SalesRow[]) => {
    setRows(r);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(r));
    } catch {}
  };

  async function handleFile(file: File) {
    setErr(null);
    setMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const parsed = rowsFromSheet(json);
      if (parsed.length === 0) {
        setErr("인식된 데이터가 없습니다. 템플릿의 컬럼(기간·SKU코드·수량·판매단가)을 확인하세요.");
        return;
      }
      persist(parsed);
      setMsg(`${file.name} — ${parsed.length}행 불러옴`);
    } catch {
      setErr("파일을 읽지 못했습니다. .xlsx / .csv 파일인지 확인하세요.");
    }
  }

  function downloadTemplate() {
    const sample = SKUS.map((s) => ({
      기간: "2026-06",
      SKU코드: s.sku,
      제품명: `${KO[s.flavor] || s.flavor} ${s.name}`,
      수량: s.volJun,
      판매단가: s.supply,
    }));
    const ws = XLSX.utils.json_to_sheet(sample, { header: [...TEMPLATE_HEADERS] });
    ws["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "sales");
    XLSX.writeFile(wb, "perrier-sales-template.xlsx");
  }

  const agg = useMemo(() => aggregate(rows, gran), [rows, gran]);
  const hasData = rows.length > 0;

  return (
    <div className="period">
      {/* 업로드 카드 */}
      <div className="panel up-panel">
        <div className="panel-h">
          <span>실판매 데이터 가져오기</span>
          <span className="panel-h-sub">SKU별 기간 매출 엑셀 업로드 · 브라우저에 저장</span>
        </div>

        <div
          className={"up-drop" + (drag ? " over" : "")}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="up-drop-i">⬆</div>
          <div className="up-drop-t">
            엑셀 파일을 끌어다 놓거나 <span className="up-link">클릭해서 선택</span>
          </div>
          <div className="up-drop-s">컬럼: 기간 · SKU코드 · 제품명 · 수량 · 판매단가 (.xlsx / .csv)</div>
        </div>

        <div className="up-actions">
          <button className="up-btn" onClick={downloadTemplate}>
            ⬇ 템플릿 다운로드
          </button>
          {hasData && (
            <button
              className="up-btn ghost"
              onClick={() => {
                persist([]);
                setMsg(null);
              }}
            >
              데이터 지우기
            </button>
          )}
          {msg && <span className="up-msg ok">{msg}</span>}
          {err && <span className="up-msg err">{err}</span>}
          {hasData && !msg && (
            <span className="up-msg">
              저장된 데이터 {rows.length}행 · 매칭 {agg.matchedRows}행
            </span>
          )}
        </div>

        {hasData && (agg.unmatched.length > 0 || agg.excluded > 0) && (
          <div className="up-warn">
            {agg.unmatched.length > 0 && (
              <span>⚠ 매칭 실패 SKU: {agg.unmatched.slice(0, 6).join(", ")}{agg.unmatched.length > 6 ? " 외" : ""}</span>
            )}
            {agg.excluded > 0 && <span>⚠ {GRAN_LABEL[gran]}로 집계 불가한 행 {agg.excluded}개 제외</span>}
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="panel up-empty">
          <div className="up-empty-h">아직 업로드된 실판매 데이터가 없습니다</div>
          <ol className="up-empty-steps">
            <li><b>템플릿 다운로드</b> → 기간·SKU코드·수량·판매단가 채우기 (11종 예시 포함)</li>
            <li>기간 형식: <code>2026-06</code>(월) · <code>2026-Q2</code>(분기) · <code>2026</code>(연도) 혼용 가능</li>
            <li>위 영역에 파일을 올리면 <b>월/분기/연도별 마진율</b>이 자동 계산됩니다</li>
          </ol>
          <div className="up-empty-note">
            원가(landed)는 원가모델(실제 적용환율 EUR ₩1,850 / USD ₩1,600) 기준으로 계산됩니다 ·
            업로드 데이터는 본인 브라우저에만 저장(서버 전송 없음)
          </div>
        </div>
      ) : (
        <>
          {/* 요약 KPI */}
          <div className="kpi-strip">
            <div className="kpi">
              <div className="kpi-k">총 매출</div>
              <div className="kpi-v kpi-v-lg">{fmtKRW(agg.totals.revenue)}</div>
              <div className="kpi-sub">업로드 실적 합계</div>
            </div>
            <div className="kpi">
              <div className="kpi-k">총 마진액</div>
              <div className="kpi-v">{fmtKRW(agg.totals.margin)}</div>
              <div className="kpi-sub">매출 − 공급원가</div>
            </div>
            <div className="kpi kpi-accent">
              <div className="kpi-k">실현 마진율</div>
              <div className="kpi-v">{agg.totals.marginRate.toFixed(1)}%</div>
              <div className="kpi-sub">전체 가중평균</div>
            </div>
            <div className="kpi">
              <div className="kpi-k">집계 기간 수</div>
              <div className="kpi-v">{agg.buckets.length}</div>
              <div className="kpi-sub">{GRAN_LABEL[gran]} · 판매 {fmtNum(agg.totals.qty)}병</div>
            </div>
          </div>

          {/* 입도 토글 */}
          <div className="gran-toggle">
            {(["month", "quarter", "year"] as Gran[]).map((g) => (
              <button
                key={g}
                className={"gran-btn" + (gran === g ? " on" : "")}
                onClick={() => setGran(g)}
              >
                {GRAN_LABEL[g]}
              </button>
            ))}
          </div>

          <div className="period-grid">
            <PeriodChart buckets={agg.buckets} />
            <div className="panel">
              <div className="panel-h">
                <span>{GRAN_LABEL[gran]} 마진</span>
                <span className="panel-h-sub">기간별 매출·원가·마진율</span>
              </div>
              <div className="ptable">
                <div className="ptable-h">
                  <span>기간</span><span>매출</span><span>마진액</span><span>마진율</span>
                </div>
                {agg.buckets.map((b) => {
                  const st = STATUS[b.status];
                  return (
                    <div className="ptable-r" key={b.key}>
                      <span className="pt-period">{b.label}</span>
                      <span className="mono">{fmtKRW(b.revenue, "short")}</span>
                      <span className="mono">{fmtKRW(b.margin, "short")}</span>
                      <span className="mono pt-rate" style={{ color: st.color }}>
                        {b.marginRate.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SKU별 마진 (전체 기간 합산) */}
          <div className="panel">
            <div className="panel-h">
              <span>SKU별 마진 (업로드 전체 합산)</span>
              <span className="panel-h-sub">높은 마진율 순</span>
            </div>
            <div className="ptable sku">
              <div className="ptable-h sku">
                <span>SKU</span><span>수량</span><span>매출</span><span>마진액</span><span>마진율</span>
              </div>
              {agg.bySku.map((s) => {
                const st = STATUS[s.status];
                return (
                  <div className="ptable-r sku" key={s.sku}>
                    <span className="pt-sku">
                      {s.koName} <span className="pt-sku-en">{s.name}</span>
                    </span>
                    <span className="mono">{fmtNum(s.qty)}</span>
                    <span className="mono">{fmtKRW(s.revenue, "short")}</span>
                    <span className="mono">{fmtKRW(s.margin, "short")}</span>
                    <span className="mono pt-rate" style={{ color: st.color }}>
                      {s.marginRate.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="foot">
            <span>원가(landed) = 원가모델 · 실제 적용환율(EUR ₩1,850 / USD ₩1,600) 기준 · 관세 0%</span>
            <span>업로드 데이터는 본인 브라우저에만 저장 · 마진율 &lt;3% 위험 · &lt;6% 주의</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 기간 차트 (매출 막대 + 마진율 라인) ---------- */
function PeriodChart({ buckets }: { buckets: { label: string; revenue: number; marginRate: number }[] }) {
  const data = buckets.slice(-12); // 최근 12개
  const W = 560, H = 250, padT = 24, padB = 38, padL = 14, padR = 14;
  if (data.length === 0) return null;
  const maxRev = Math.max(...data.map((d) => d.revenue)) * 1.15 || 1;
  const minPct = Math.min(0, ...data.map((d) => d.marginRate)) - 2;
  const maxPct = Math.max(...data.map((d) => d.marginRate)) + 2;
  const n = data.length;
  const slot = (W - padL - padR) / n;
  const bw = Math.min(slot * 0.5, 40);
  const yRev = (v: number) => padT + (H - padT - padB) * (1 - v / maxRev);
  const yPct = (v: number) =>
    padT + (H - padT - padB) * (1 - (v - minPct) / (maxPct - minPct || 1));
  const cx = (i: number) => padL + slot * i + slot / 2;
  const linePts = data.map((d, i) => `${cx(i)},${yPct(d.marginRate)}`).join(" ");

  return (
    <div className="panel">
      <div className="panel-h">
        <span>마진율 추이</span>
        <span className="panel-h-sub">막대 매출 · 라인 마진율</span>
      </div>
      <div className="tr-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="tr-svg">
          <defs>
            <linearGradient id="barGradP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E6650" />
              <stop offset="100%" stopColor="#0E4030" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((g, i) => (
            <line key={i} x1={padL} x2={W - padR} y1={yRev(maxRev * g)} y2={yRev(maxRev * g)} className="tr-grid" />
          ))}
          {data.map((d, i) => {
            const x = padL + slot * i + (slot - bw) / 2;
            return (
              <g key={i}>
                <rect x={x} y={yRev(d.revenue)} width={bw} height={H - padB - yRev(d.revenue)} rx="2.5" fill="url(#barGradP)" />
                <text x={cx(i)} y={H - padB + 18} textAnchor="middle" className="tr-lab">{d.label}</text>
              </g>
            );
          })}
          <polyline points={linePts} className="tr-line" fill="none" />
          {data.map((d, i) => (
            <g key={"p" + i}>
              <circle cx={cx(i)} cy={yPct(d.marginRate)} r="3.5" className="tr-dot" />
              <text x={cx(i)} y={yPct(d.marginRate) - 9} textAnchor="middle" className="tr-pct">
                {d.marginRate.toFixed(1)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
