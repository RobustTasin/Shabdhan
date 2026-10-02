"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Reports", href: "/reports" },
  { name: "Evidence", href: "/evidence" },
  { name: "Disputes", href: "/disputes" },
  { name: "Notifications", href: "/notifications" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="flex flex-1 flex-col p-4">
      <div className="flex-1 space-y-1">
        {navigation.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="rounded-xl bg-slate-50 p-3">
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
        </div>
      </div>
    </nav>
  );
}