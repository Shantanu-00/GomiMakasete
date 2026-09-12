import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GomiMakasete (ゴミ任せて) — Autonomous Japanese Waste Intelligence",
  description: "Next-generation multi-modal municipal waste classifier with accidental valuable protection and preparation action decomposition on AWS Bedrock AgentCore.",
  keywords: ["Japanese Waste Sorting", "GomiMakasete", "AWS Bedrock", "AgentCore", "Strands Agents", "Recycling Japan"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
