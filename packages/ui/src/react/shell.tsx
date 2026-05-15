import type { PropsWithChildren, ReactNode } from "react";
import type {
  AppNavigationItem,
  EmptyStateContent,
  ModuleAction,
  ModuleSummaryItem,
  NotificationPreview,
  ShellUserSummary
} from "../../../types/src/index.ts";

type CardSpan = "4" | "6" | "8" | "12";

function cardSpanClass(span: CardSpan): string {
  if (span === "4") {
    return "bms-card--span-4";
  }

  if (span === "6") {
    return "bms-card--span-6";
  }

  if (span === "8") {
    return "bms-card--span-8";
  }

  return "bms-card--span-12";
}

function groupNavigation(items: readonly AppNavigationItem[]) {
  const groups = new Map<string, AppNavigationItem[]>();

  for (const item of items) {
    const current = groups.get(item.group) ?? [];
    current.push(item);
    groups.set(item.group, current);
  }

  return [...groups.entries()];
}

export function RoleBadge({ role }: { role: string }) {
  const tone =
    role === "owner" || role === "administrator"
      ? "accent"
      : role === "applicant" || role === "customer" || role === "subcontractor" || role === "supercontractor"
        ? "warning"
        : "neutral";

  return <span className={`bms-badge bms-badge--${tone}`}>{role}</span>;
}

export function ShellSidebar({
  appName,
  eyebrow,
  subtitle,
  navigation,
  activeHref
}: {
  appName: string;
  eyebrow: string;
  subtitle: string;
  navigation: readonly AppNavigationItem[];
  activeHref: string;
}) {
  return (
    <aside className="bms-sidebar">
      <div className="bms-sidebar__brand">
        <span className="bms-sidebar__eyebrow">{eyebrow}</span>
        <div className="bms-sidebar__title">{appName}</div>
        <div className="bms-sidebar__subtitle">{subtitle}</div>
      </div>
      {groupNavigation(navigation).map(([group, items]) => (
        <section className="bms-sidebar__group" key={group}>
          <h2 className="bms-sidebar__group-label">{group}</h2>
          <nav className="bms-sidebar__nav">
            {items.map((item) => {
              const prefixes = item.matchPrefixes ?? [item.href];
              const isActive = prefixes.some((prefix) => activeHref === prefix || activeHref.startsWith(`${prefix}/`));

              return (
                <a
                  className={`bms-sidebar__item ${isActive ? "bms-sidebar__item--active" : ""}`}
                  href={item.href}
                  key={item.id}
                >
                  <span className="bms-sidebar__item-title">{item.label}</span>
                  <span className="bms-sidebar__item-description">{item.description}</span>
                </a>
              );
            })}
          </nav>
        </section>
      ))}
    </aside>
  );
}

export function ShellTopNav({
  title,
  subtitle,
  user,
  notifications
}: {
  title: string;
  subtitle: string;
  user: ShellUserSummary;
  notifications: readonly NotificationPreview[];
}) {
  return (
    <header className="bms-topbar">
      <div className="bms-topbar__cluster">
        <div className="bms-topbar__headline">
          <div className="bms-topbar__title">{title}</div>
          <div className="bms-topbar__subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="bms-topbar__user">
        <div className="bms-topbar__headline">
          <div className="bms-topbar__title">{user.displayName}</div>
          <div className="bms-topbar__subtitle">{user.primaryRole}</div>
        </div>
        <div className="bms-badge-row">
          {user.roles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
        <span className="bms-badge bms-badge--neutral">{notifications.length} alerts</span>
      </div>
    </header>
  );
}

export function AppShellFrame({
  appName,
  eyebrow,
  subtitle,
  navigation,
  activeHref,
  topNavTitle,
  topNavSubtitle,
  user,
  notifications,
  children
}: PropsWithChildren<{
  appName: string;
  eyebrow: string;
  subtitle: string;
  navigation: readonly AppNavigationItem[];
  activeHref: string;
  topNavTitle: string;
  topNavSubtitle: string;
  user: ShellUserSummary;
  notifications: readonly NotificationPreview[];
}>) {
  return (
    <div className="bms-shell">
      <ShellSidebar
        appName={appName}
        eyebrow={eyebrow}
        subtitle={subtitle}
        navigation={navigation}
        activeHref={activeHref}
      />
      <main className="bms-main">
        <ShellTopNav title={topNavTitle} subtitle={topNavSubtitle} user={user} notifications={notifications} />
        <div className="bms-page">{children}</div>
      </main>
    </div>
  );
}

export function MarketingShell({
  brand,
  navigation,
  children
}: PropsWithChildren<{
  brand: string;
  navigation: readonly AppNavigationItem[];
}>) {
  return (
    <div>
      <header className="bms-site-header">
        <div>
          <div className="bms-sidebar__eyebrow">BMS Platform</div>
          <div className="bms-sidebar__title">{brand}</div>
        </div>
        <nav className="bms-site-nav">
          {navigation.map((item) => (
            <a className="bms-site-nav__link" href={item.href} key={item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="bms-site-main">{children}</main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badges
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: readonly ModuleAction[];
  badges?: readonly string[];
}) {
  return (
    <section className="bms-page-header">
      <div className="bms-page-header__eyebrow">{eyebrow}</div>
      <h1 className="bms-page-header__title">{title}</h1>
      <p className="bms-page-header__description">{description}</p>
      {badges && (
        <div className="bms-badge-row" style={{ marginTop: 14 }}>
          {badges.map((badge) => (
            <span className="bms-badge bms-badge--neutral" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      )}
      {actions && (
        <div className="bms-actions">
          {actions.map((action, index) => (
            <a
              className={`bms-button ${index === 0 ? "bms-button--primary" : "bms-button--secondary"}`}
              href={action.href}
              key={action.label}
            >
              {action.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export function StatsCard({
  title,
  description,
  stats,
  span = "8"
}: {
  title: string;
  description: string;
  stats: readonly ModuleSummaryItem[];
  span?: CardSpan;
}) {
  return (
    <section className={`bms-card ${cardSpanClass(span)}`}>
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <div className="bms-stats" style={{ marginTop: 18 }}>
        {stats.map((stat) => (
          <div className="bms-stat" key={stat.label}>
            <span className="bms-stat__label">{stat.label}</span>
            <span className="bms-stat__value">{stat.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ModuleGrid({
  title,
  description,
  modules
}: {
  title: string;
  description: string;
  modules: readonly { title: string; description: string }[];
}) {
  return (
    <section className="bms-card bms-card--span-8">
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <div className="bms-module-grid" style={{ marginTop: 18 }}>
        {modules.map((module) => (
          <div className="bms-module-card" key={module.title}>
            <h3 className="bms-module-card__title">{module.title}</h3>
            <p className="bms-module-card__body">{module.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NotificationCenter({
  title,
  description,
  notifications,
  span = "4"
}: {
  title: string;
  description: string;
  notifications: readonly NotificationPreview[];
  span?: CardSpan;
}) {
  return (
    <section className={`bms-card ${cardSpanClass(span)}`}>
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <ul className="bms-list" style={{ marginTop: 18 }}>
        {notifications.map((item) => (
          <li className={`bms-list__item bms-notification bms-notification--${item.tone}`} key={item.id}>
            <p className="bms-list__title">{item.title}</p>
            <p className="bms-list__body">{item.body}</p>
            <span className="bms-list__meta">{item.timestampLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EmptyState({ content }: { content: EmptyStateContent }) {
  return (
    <section className="bms-empty-state">
      <h3 className="bms-empty-state__title">{content.title}</h3>
      <p className="bms-empty-state__description">{content.description}</p>
      {content.action && (
        <div className="bms-actions">
          <a className="bms-button bms-button--primary" href={content.action.href}>
            {content.action.label}
          </a>
        </div>
      )}
    </section>
  );
}

export function LoadingState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="bms-loading-state">
      <h3 className="bms-loading-state__title">{title}</h3>
      <p className="bms-loading-state__description">{description}</p>
    </section>
  );
}

export function PlaceholderPanel({
  title,
  description,
  emptyState,
  children
}: PropsWithChildren<{
  title: string;
  description: string;
  emptyState: EmptyStateContent;
}>) {
  return (
    <section className="bms-card bms-card--span-12">
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <div style={{ marginTop: 18 }}>{children ?? <EmptyState content={emptyState} />}</div>
    </section>
  );
}

export function SimpleList({
  title,
  description,
  items,
  span = "4"
}: {
  title: string;
  description: string;
  items: readonly { title: string; body: string; meta?: string }[];
  span?: CardSpan;
}) {
  return (
    <section className={`bms-card ${cardSpanClass(span)}`}>
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <ul className="bms-list" style={{ marginTop: 18 }}>
        {items.map((item) => (
          <li className="bms-list__item" key={item.title}>
            <p className="bms-list__title">{item.title}</p>
            <p className="bms-list__body">{item.body}</p>
            {item.meta ? <span className="bms-list__meta">{item.meta}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="bms-grid">{children}</div>;
}

export function PipelineBoard({
  title,
  description,
  stages
}: {
  title: string;
  description: string;
  stages: readonly { title: string; count: string; description?: string }[];
}) {
  return (
    <section className="bms-card bms-card--span-8">
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <div className="bms-pipeline-grid" style={{ marginTop: 18 }}>
        {stages.map((stage) => (
          <div className="bms-pipeline-card" key={stage.title}>
            <div className="bms-stat__label">{stage.title}</div>
            <span className="bms-pipeline-card__count">{stage.count}</span>
            {stage.description ? <p className="bms-card__description">{stage.description}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function KeyValueSummary({
  title,
  description,
  items,
  span = "8"
}: {
  title: string;
  description: string;
  items: readonly { label: string; value: string }[];
  span?: CardSpan;
}) {
  return (
    <section className={`bms-card ${cardSpanClass(span)}`}>
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <div className="bms-kv-grid" style={{ marginTop: 18 }}>
        {items.map((item) => (
          <div className="bms-kv-item" key={item.label}>
            <span className="bms-kv-item__label">{item.label}</span>
            <span className="bms-kv-item__value">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FormCard({
  title,
  description,
  children
}: PropsWithChildren<{
  title: string;
  description: string;
}>) {
  return (
    <section className="bms-form-card">
      <h2 className="bms-card__title">{title}</h2>
      <p className="bms-card__description">{description}</p>
      <div style={{ marginTop: 18 }}>{children}</div>
    </section>
  );
}

export function FormGrid({ children }: PropsWithChildren) {
  return <div className="bms-form-grid">{children}</div>;
}

export function TextField({
  label,
  name,
  required,
  placeholder,
  type = "text",
  defaultValue,
  span = "12"
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "datetime-local";
  defaultValue?: string;
  span?: "12" | "6";
}) {
  return (
    <div className={`bms-form-field ${span === "6" ? "bms-form-field--span-6" : ""}`}>
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      <input defaultValue={defaultValue} id={name} name={name} placeholder={placeholder} required={required} type={type} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="bms-form-field">
      <label htmlFor={name}>{label}</label>
      <select defaultValue={defaultValue} id={name} name={name}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  required,
  placeholder,
  defaultValue
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="bms-form-field">
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      <textarea defaultValue={defaultValue} id={name} name={name} placeholder={placeholder} required={required} />
    </div>
  );
}

export function FileField({
  label,
  name,
  note,
  rules,
  accept
}: {
  label: string;
  name: string;
  note?: string;
  rules?: readonly string[];
  accept?: string;
}) {
  return (
    <div className="bms-form-field">
      <label htmlFor={name}>{label}</label>
      <input accept={accept ?? "image/jpeg,image/png,image/webp"} id={name} name={name} type="file" />
      {note ? <div className="bms-form-note">{note}</div> : null}
      {rules ? (
        <ul className="bms-form-rules">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
