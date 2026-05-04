import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "辩思 MindGrill — AI 反向写作教练",
  description:
    "辩思（MindGrill）是 PCG 校园 AI 创意大赛 2026 参赛作品：不帮你写，AI 用决策树拷问帮你想清楚论文 / 简历 / 公众号写作。",
  applicationName: "辩思 MindGrill",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "辩思",
    statusBarStyle: "default",
  },
  keywords: [
    "AI 写作",
    "辩思",
    "MindGrill",
    "决策树",
    "论文教练",
    "PCG",
    "苏格拉底",
  ],
  authors: [{ name: "MindGrill Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F0EEE6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${notoSerifSC.variable} h-full antialiased`}
    >
      {/*
        suppressHydrationWarning on <body>: browser extensions (e.g. Grammarly)
        inject attributes like `data-new-gr-c-s-check-loaded` / `data-gr-ext-installed`
        between SSR HTML arrival and React hydration, causing a benign mismatch
        warning. This flag suppresses the warning on <body> only (not its
        descendants), so real hydration bugs in app code still surface.
      */}
      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
