import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Providers } from "./providers";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B1120",
};

export const metadata: Metadata = {
  title: "AI 로컬 어시스턴트 | 서울 동북권 맞춤형 맛집·학원 탐색 플랫폼",
  description: "노원구, 도봉구, 강북구, 중랑구, 성북구 지역 맞춤형 실존 맛집 및 학원, 생활 정보를 AI와 실시간 지도로 탐색하는 지능형 어시스턴트",
  keywords: ["AI 로컬 어시스턴트", "노원구 맛집", "도봉구 맛집", "강북구 맛집", "중랑구 맛집", "성북구 맛집", "학원 추천", "카카오맵"],
  authors: [{ name: "AI Local Assistant Team" }],
  openGraph: {
    title: "AI 로컬 어시스턴트",
    description: "스마트한 지역 탐색과 검증된 장소 추천 비서",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full ${notoSansKr.variable}`}>
      <body className="h-full m-0 bg-[#0B1120] text-slate-100 antialiased font-sans selection:bg-blue-500/30 selection:text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

