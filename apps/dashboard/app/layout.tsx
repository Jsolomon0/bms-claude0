import type { PropsWithChildren } from "react";
import "./globals.css";

export const metadata = {
  title: "BMS Dashboard",
  description: "Internal BMS application shell"
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
