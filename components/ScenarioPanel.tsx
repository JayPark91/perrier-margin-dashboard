import { fmtNum, type Scenario } from "@/lib/model";

/* ---------- 시나리오 슬라이더 ---------- */
function Slider({
  label,
  sub,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
  accent,
}: {
  label: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="sl">
      <div className="sl-top">
        <span className="sl-label">{label}</span>
        <span className="sl-val" style={accent ? { color: "var(--gold)" } : undefined}>
          {fmt(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ["--pct" as string]: pct + "%" }}
      />
      {sub && <div className="sl-sub">{sub}</div>}
    </div>
  );
}

export function ScenarioPanel({
  scn,
  setScn,
  onReset,
  dirty,
}: {
  scn: Scenario;
  setScn: (s: Scenario) => void;
  onReset: () => void;
  dirty: boolean;
}) {
  return (
    <div className="panel scenario">
      <div className="panel-h">
        <span>시나리오 시뮬레이션</span>
        <button
          className={"reset" + (dirty ? " on" : "")}
          onClick={onReset}
          disabled={!dirty}
        >
          기준값 초기화
        </button>
      </div>
      <Slider
        label="EUR → KRW 환율"
        value={scn.eur}
        min={1300}
        max={1600}
        step={5}
        fmt={(v) => "₩" + fmtNum(v)}
        onChange={(v) => setScn({ ...scn, eur: v })}
        accent
        sub="출고가(€0.34–0.80/병)에 적용 · 6월 실적 ₩1,450"
      />
      <Slider
        label="USD → KRW 환율"
        value={scn.usd}
        min={1200}
        max={1500}
        step={5}
        fmt={(v) => "₩" + fmtNum(v)}
        onChange={(v) => setScn({ ...scn, usd: v })}
        accent
        sub="운임·물류비(USD 청구)에 적용 · 6월 실적 ₩1,350"
      />
      <Slider
        label="관세율"
        value={scn.tariff}
        min={0}
        max={20}
        step={0.5}
        fmt={(v) => v.toFixed(1) + "%"}
        onChange={(v) => setScn({ ...scn, tariff: v })}
        sub="한·EU FTA 현재 0% · 인상 시나리오 점검"
      />
      <Slider
        label="운임·물류 지수"
        value={scn.freightMult}
        min={0.7}
        max={1.5}
        step={0.05}
        fmt={(v) => "×" + v.toFixed(2)}
        onChange={(v) => setScn({ ...scn, freightMult: v })}
        sub="기준 1.00 · 해상운임·내륙비 변동"
      />
    </div>
  );
}
