import type { PropsWithChildren } from "react";
import { fmleSite } from "./siteConfig.ts";

export function WebsitePageShell({ children }: PropsWithChildren) {
  return (
    <div className="fmle-site">
      <header className="fmle-header">
        <a className="fmle-brand" href="/" aria-label="FMLE home">
          <img
            src="/brand/fmle-mark.png"
            alt=""
            aria-hidden="true"
            width={52}
            height={52}
            style={{ width: 52, height: 52, objectFit: "contain", flex: "0 0 auto" }}
          />
          <span className="fmle-brand-copy">
            <strong>FMLE</strong>
            <small>Tax & Financial Solution Partners</small>
          </span>
        </a>
        <nav className="fmle-nav" aria-label="Primary navigation">
          <a href="/#tax-services">Tax Services</a>
          <a href="/#financial-services">Financial Solutions</a>
          <a href="/#about">Why FMLE</a>
          <a href="/#contact">Contact</a>
        </nav>
        <a className="fmle-header-phone" href={fmleSite.phoneHref}>
          <span>Call us</span>
          <strong>{fmleSite.phone}</strong>
        </a>
      </header>
      {children}
      <footer className="fmle-footer">
        <a href="/" aria-label="FMLE home" style={{ display: "inline-flex", alignItems: "center" }}>
          <img
            src="/brand/fmle-logo.png"
            alt="FMLE Tax & Financial Solution Partners LLC"
            width={82}
            height={100}
            style={{ width: 82, height: "auto", objectFit: "contain" }}
          />
        </a>
        <p>© 2026 {fmleSite.legalName}. All rights reserved.</p>
        <div className="fmle-footer-links"><a href="/#tax-services">Tax Services</a><a href="/#financial-services">Financial Solutions</a><a href="/request">Consultation</a></div>
      </footer>
    </div>
  );
}
