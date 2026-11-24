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
  title: "맛탐정 동북 | 서울 동북권 미식 가이드 & AI 맛집 큐레이션",
  description: "노원구, 도봉구, 강북구, 중랑구, 성북구의 30년 전통 노포부터 스페셜티 베이커리 카페까지 엄선된 실존 맛집을 소개하고 실시간 지도로 안내하는 미식 플랫폼",
  keywords: ["맛탐정 동북", "노원구 맛집", "도봉구 맛집", "강북구 맛집", "중랑구 맛집", "성북구 맛집", "노포 맛집", "빵지순례"],
  authors: [{ name: "Gourmet Guide Team" }],
  openGraph: {
    title: "맛탐정 동북 | 서울 동북권 미식 큐레이션 플랫폼",
    description: "서울 동북권 5대 자치구 엄선 맛집 소개 및 AI 미식 소믈리에 가이드",
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
      <body className="h-full m-0 bg-[#0B1120] text-slate-100 antialiased font-sans selection:bg-amber-500/30 selection:text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
