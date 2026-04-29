import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickLaunch Team Command Center",
  description: "Multitenant command center for projects, tasks, meetings, and decisions.",
};

const allowedThemes = new Set(["sage", "graphite", "indigo", "ember"]);

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("tcc-theme")?.value;
  const theme = themeCookie && allowedThemes.has(themeCookie) ? themeCookie : "sage";

  return (
    <html data-theme={theme} lang="en">
      <body>{children}</body>
    </html>
  );
}
