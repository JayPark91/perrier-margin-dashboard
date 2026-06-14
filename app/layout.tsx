import type { Metadata } from "next";
import { Spectral, IBM_Plex_Sans_KR, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// 헤드라인 — Spectral (세리프)
const spectral = Spectral({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// 본문 — IBM Plex Sans KR (latin; 한글은 system 한글 폰트로 폴백)
const plexSans = IBM_Plex_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// 숫자·코드 — IBM Plex Mono
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Perrier · 공급가·마진 대시보드",
  description:
    "페리에 공급가·마진 대시보드 — SKU별 실현 마진, 원가 분해 워터폴, 환율·관세 시나리오 시뮬레이션.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${spectral.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
