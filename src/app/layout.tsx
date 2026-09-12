import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "크리에이터 매칭 | Creator Match",
  description: "예산과 카테고리, 팔로워 규모로 우리 브랜드의 크리에이터 조건을 설정하세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
