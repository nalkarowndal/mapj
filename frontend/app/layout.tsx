import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { Providers } from "./providers";

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F8F5EF",
};

export const metadata: Metadata = {
  title: {
    default: "동북미식 (DONGBUK TABLE) | 서울 동북권 로컬 맛집 가이드",
    template: "%s | 동북미식 (DONGBUK TABLE)",
  },
  description:
    "다섯 개의 동네, 수많은 맛의 이야기. 서울 동북권(노원·도봉·강북·중랑·성북)의 검증된 로컬 식당과 상권의 미식 이야기를 전하는 지역 특화 맛집 큐레이션 플랫폼.",
  keywords: [
    "동북미식",
    "DONGBUK TABLE",
    "노원구 맛집",
    "도봉구 맛집",
    "강북구 맛집",
    "중랑구 맛집",
    "성북구 맛집",
    "서울 동북권 맛집",
  ],
  openGraph: {
    title: "동북미식 (DONGBUK TABLE) | 우리 동네의 맛있는 발견",
    description:
      "서울 동북권 다섯 지역의 숨겨진 맛과 특별한 식탁을 만나보세요.",
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
    <html
      lang="ko"
      className={`h-full ${notoSerifKr.variable} ${notoSansKr.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full m-0 bg-[var(--bg-main)] text-[var(--text-primary)] antialiased font-sans selection:bg-[#283A30]/15 selection:text-[#252622]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
