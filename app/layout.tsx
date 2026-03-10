// Root layout — sets HTML metadata, imports Tailwind globals

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "郭寶 — 你的AI 問責管家",
  description: "LINE 上的 AI 問責夥伴，用可愛的方式督促你完成目標。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
