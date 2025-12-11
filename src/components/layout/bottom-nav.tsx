"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUnreadCounts } from "@/hooks/use-unread-counts";
import {
  Home,
  Compass,
  Bell,
  MessageCircle,
  User,
} from "lucide-react";

const navItems = [
  { href: "/home", icon: Home, label: "Home", badgeKey: null },
  { href: "/discover", icon: Compass, label: "Discover", badgeKey: null },
  { href: "/activity", icon: Bell, label: "Activity", badgeKey: "activity" as const },
  { href: "/messages", icon: MessageCircle, label: "Messages", badgeKey: "messages" as const },
  { href: "/profile", icon: User, label: "Profile", badgeKey: null },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: unreadCounts } = useUnreadCounts();

  const getBadgeCount = (key: "activity" | "messages" | null): number => {
    if (!key || !unreadCounts) return 0;
    return unreadCounts[key] || 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-[var(--dusk-1)]/80 backdrop-blur-xl border-t border-white/[0.06]">
      <div className="mx-auto max-w-lg">
        <div className="flex h-[72px] items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href) ?? false;
            const badgeCount = getBadgeCount(item.badgeKey);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-2xl min-w-[56px] min-h-[56px] px-3 py-2 transition-all duration-200 active:scale-95",
                  isActive
                    ? "text-[var(--accent-lilac)]"
                    : "text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                )}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-[var(--accent-violet)]/15 blur-sm" />
                )}
                <div className="relative">
                  <item.icon
                    className={cn(
                      "h-6 w-6 transition-all duration-200",
                      isActive && "drop-shadow-[0_0_8px_rgba(140,91,255,0.6)]"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {/* Badge for unread count */}
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--accent-magenta)] text-white text-[10px] font-bold shadow-lg shadow-[var(--accent-magenta)]/30">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                  {/* Glowing dot for active state */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent-lilac)] shadow-[0_0_6px_var(--accent-lilac)]" />
                  )}
                </div>
                <span className={cn(
                  "relative text-[11px] font-medium transition-all duration-200",
                  isActive && "text-[var(--accent-lilac)]"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
