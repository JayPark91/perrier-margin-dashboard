# 페리에 공급가·마진 대시보드

Claude Design 시안(`Perrier Cost Breakdown.html`)을 Next.js로 옮긴 임원용 단일화면 대시보드.
원본 기획: `../dashboard-prd.md` · 원가 모델: `../model/`

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 (타입·린트 검증)
npm run start    # 빌드 후 프로덕션 서버
```

## 화면 구성

- **KPI 스트립** — 총매출 · 총 마진액 · 실현 마진율(골드) · 마진 경보 수
- **마진 경보 밴드** — 마진율 6% 미만 위험 SKU 카드(제품컷 포함), 클릭 시 워터폴 연동
- **SKU 마진 랭킹** — 높은 마진율 순, 상태색 막대
- **월별 추이** — 환율 상승 → 마진율 하락 스토리 (매출 막대 + 마진율 라인)
- **시나리오 시뮬레이션** — 환율·관세율·운임지수 슬라이더로 실시간 재계산
- **원가 분해 워터폴** — 출고가→운임→관세→통관→공급원가→공급가→마진

## 구조

| 경로 | 역할 |
|------|------|
| `lib/model.ts` | 데이터·계산 모델 (SKU 마스터·원가 분해·집계·포맷) |
| `app/page.tsx` | 메인 Dashboard (client, 상태·시나리오) |
| `app/layout.tsx` | 폰트(next/font) + 메타 |
| `app/globals.css` | 페리에 브랜드 비주얼 시스템(딥그린·골드·탄산 텍스처) |
| `components/*.tsx` | KpiStrip · AlertBand · Ranking · ScenarioPanel · Waterfall · Trend |
| `public/products/` | 경보 SKU 제품컷 |

## 데이터 (현재: 캘리브레이션 더미)

- `lib/model.ts`의 SKU 마스터는 Google Sheet `products` 탭 실측 + recon 집계(₩130,244,500 · 마진 13.1% · 경보 4종)에 맞춘 모델.
- 운임·통관 단가는 모델 가정이며 슬라이더로 조정 가능. **관세율 0%(한·EU FTA) 전제.**

## 다음 단계 (미구현)

1. **Google Sheets 라이브 연동** — `products`·`prices`·`sales` 탭 → ISR. (PRD §5)
2. **Python 모델 CSV 연동** — `../model/output/*.csv`를 빌드타임 주입.
3. 레이아웃 토글(`경영진`/`분석가`/`경보우선` — variant CSS는 `globals.css`에 보존됨).
4. PRD View 2(환율 추이)·View 3(시뮬레이터) 확장, AI 인사이트 패널.

> ⚠️ 마진 수치는 **관세 0% 전제**(HS 2201.10/2202.10 한·EU FTA 협정세율·향첨가 8종 분류 미확정). 관세사 confirm 전까지 과대 가능. 상세: `../docs/calc-logic.md`.
