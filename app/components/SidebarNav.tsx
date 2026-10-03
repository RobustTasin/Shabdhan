"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "⌂" },
  { name: "Reports", href: "/reports", icon: "▤" },
  { name: "Search", href: "/search", icon: "⌕" },
  { name: "Evidence", href: "/evidence", icon: "◈" },
  { name: "Disputes", href: "/disputes", icon: "⚖" },
  { name: "Notifications", href: "/notifications", icon: "●" },
];

type SidebarNavProps = {
  compact?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
};

export default function SidebarNav({
  compact = false,
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav
      className={`flex flex-1 flex-col ${
        compact ? "p-2" : "p-4"
      }`}
    >
      <div className="flex-1 space-y-1">
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={compact ? item.name : undefined}
              aria-label={item.name}
              className={`flex items-center rounded-lg transition ${
                compact
                  ? "justify-center px-2 py-3"
                  : "gap-3 px-3 py-2.5"
              } ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center text-base ${
                  active ? "text-white" : "text-slate-500"
                }`}
              >
                {item.icon}
              </span>

              {!compact && (
                <span className="truncate text-sm font-medium">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div
        className={`mt-4 border-t border-slate-200 pt-4 ${
          compact ? "px-1" : ""
        }`}
      >
        <div
          className={`rounded-xl bg-slate-50 ${
            compact ? "p-2" : "p-3"
          }`}
        >
          {compact ? (
            <>
              <div
                title={user?.username || "User"}
                className="flex h-9 w-full items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-700"
              >
                {(user?.username || "U").charAt(0).toUpperCase()}
              </div>

              <button
                type="button"
                onClick={logout}
                title="Logout"
                aria-label="Logout"
                className="mt-2 flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                ↪
              </button>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold">
                {user?.username || "User"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {user?.role || "USER"}
              </div>

              <button
                type="button"
                onClick={logout}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
