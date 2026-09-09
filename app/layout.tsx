import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X Growth Agent",
  description: "Human-first AI growth operating system for X.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
