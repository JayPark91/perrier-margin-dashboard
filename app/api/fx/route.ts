import { NextResponse } from "next/server";

/* 한국은행 ECOS 매매기준율 (731Y001) — EUR/USD 최신 영업일 고시환율.
   적용환율 = ceil(고시 × 1.03 ÷ 50) × 50 (버퍼 +3%, 50원 올림 — inputs.json 규칙).
   ECOS_API_KEY 환경변수 필요. 하루 1회 캐싱(revalidate). */

const ECOS_BASE = "https://ecos.bok.or.kr/api/StatisticSearch";
const STAT = "731Y001";
const ITEM = { usd: "0000001", eur: "0000003" };
const BUFFER = 0.03;
const ROUND = 50;

// 응답 이상 감지용 타당 범위
const PLAUSIBLE = { usd: [1000, 2000], eur: [1300, 2300] } as const;

export const revalidate = 3600; // 1h ISR

function ymd(d: Date) {
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}
function applied(official: number) {
  return Math.ceil((official * (1 + BUFFER)) / ROUND) * ROUND;
}

async function latest(key: string, item: string) {
  const end = new Date();
  const start = new Date(end.getTime() - 16 * 24 * 3600 * 1000);
  const url = `${ECOS_BASE}/${key}/json/kr/1/30/${STAT}/D/${ymd(start)}/${ymd(end)}/${item}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`ECOS ${res.status}`);
  const data = await res.json();
  const rows = data?.StatisticSearch?.row;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("ECOS no data");
  const last = rows[rows.length - 1];
  return { date: String(last.TIME), value: parseFloat(last.DATA_VALUE) };
}

export async function GET() {
  const key = process.env.ECOS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, reason: "ECOS_API_KEY 미설정" },
      { status: 503 }
    );
  }
  try {
    const [usd, eur] = await Promise.all([
      latest(key, ITEM.usd),
      latest(key, ITEM.eur),
    ]);
    for (const [k, v] of [
      ["usd", usd.value],
      ["eur", eur.value],
    ] as const) {
      const [lo, hi] = PLAUSIBLE[k];
      if (!(v >= lo && v <= hi)) {
        return NextResponse.json(
          { ok: false, reason: `${k.toUpperCase()} 값(${v}) 범위 밖` },
          { status: 502 }
        );
      }
    }
    return NextResponse.json({
      ok: true,
      source: "한국은행 ECOS 매매기준율 (731Y001)",
      eur: { official: eur.value, applied: applied(eur.value), date: eur.date },
      usd: { official: usd.value, applied: applied(usd.value), date: usd.date },
      buffer: BUFFER,
      roundUpTo: ROUND,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: e instanceof Error ? e.message : "조회 실패" },
      { status: 502 }
    );
  }
}
