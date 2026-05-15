import type { PropsWithChildren } from "react";
import "./globals.css";

export const metadata = {
  title: "BMS Portal",
  description: "External stakeholder BMS shell"
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
