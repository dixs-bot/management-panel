"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogIn, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const menuItems = [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Users", href: "/users", icon: Users },
    { title: "Settings", href: "/settings", icon: Settings },
    { title: "Login", href: "/login", icon: LogIn },
    { title: "Register", href: "/register", icon: UserPlus },
  ];

  return (
    <aside
      className={cn(
        "h-screen bg-card text-card-foreground border-r transition-all duration-300 flex flex-col justify-between sticky top-0",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <Link href="/" className="font-bold text-lg tracking-wider text-primary">
              BLURADMIN
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground ml-auto cursor-pointer"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t text-xs text-muted-foreground">
        {sidebarOpen ? "BlurAdmin Next.js © 2026" : "2026"}
      </div>
    </aside>
  );
}