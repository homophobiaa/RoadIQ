// Primary site navigation, shared across the main pages. `Справочник` is a
// first-class destination here (desktop + mobile), never buried in a menu.

import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../store";
import { Logo, SpikeMark } from "./ui";
import { RoadTypeIcon } from "./speed-limits/shared";
import { cx } from "../lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: "Табло", icon: <SpikeMark className="h-4 w-4" color="currentColor" />, end: true },
  { to: ROUTES.cheatsheets, label: "Справочник", icon: <RoadTypeIcon type="motorway" size={18} /> },
];

export function TopNav({ right }: { right?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-6">
        <NavLink to={ROUTES.dashboard} aria-label="Начало">
          <Logo />
        </NavLink>
        <nav className="flex items-center gap-1.5" aria-label="Основна навигация">
          {ITEMS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cx(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-on-primary"
                    : "text-body hover:bg-surface-soft",
                )
              }
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {right && <div className="flex flex-wrap items-center gap-3">{right}</div>}
    </header>
  );
}
