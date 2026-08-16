import type { PropsWithChildren } from "react";
import "./globals.css";

export const metadata = {
  title: "FMLE Tax & Financial Solution Partners | Miami, FL",
  description:
    "Tax preparation, accounting, bookkeeping, payroll, nonprofit filing, business filing, and financial support from FMLE Tax & Financial Solution Partners in Miami, Florida.",
  keywords: [
    "Miami tax preparation",
    "tax preparer Miami",
    "bookkeeping Miami",
    "payroll services Miami",
    "business tax filing",
    "nonprofit tax filing"
  ],
  openGraph: {
    title: "FMLE Tax & Financial Solution Partners",
    description: "Tax preparation and year-round financial support for individuals, businesses, and nonprofits.",
    type: "website"
  }
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
