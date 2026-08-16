import type { PropsWithChildren } from "react";
import { fmleSite } from "./siteConfig.ts";

export function WebsitePageShell({ children }: PropsWithChildren) {
  return (
    <div className="fmle-site">
      <header className="fmle-header">
        <a className="fmle-brand" href="/" aria-label="FMLE home">
          <span className="fmle-mark" aria-hidden="true">
            <span className="fmle-mark-red" />
            <span className="fmle-mark-navy" />
            <span className="fmle-mark-teal" />
            <span className="fmle-mark-blue" />
            <span className="fmle-mark-lime" />
          </span>
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
        <div className="fmle-brand fmle-brand-footer">
          <span className="fmle-brand-copy"><strong>FMLE</strong><small>{fmleSite.descriptor}</small></span>
        </div>
        <p>© 2026 {fmleSite.legalName}. All rights reserved.</p>
        <div className="fmle-footer-links"><a href="/#tax-services">Tax Services</a><a href="/#financial-services">Financial Solutions</a><a href="/request">Consultation</a></div>
      </footer>
    </div>
  );
}
