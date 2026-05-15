import type { PropsWithChildren } from "react";
import "./globals.css";

export const metadata = {
  title: "BMS Website",
  description: "Public website shell for the BMS platform"
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
