"use client";

import React from "react";
import { useUIStore, useUserStore } from "@/store/ui";
import { Sun, Moon, LogOut, User } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { theme, toggleTheme } = useUIStore();
  const { user, logout } = useUserStore();

  return (
    <header className="h-16 border-b bg-card text-card-foreground flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Welcome back, <span className="text-foreground font-semibold">{user?.name || "Guest"}</span>
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <div className="flex items-center space-x-3 border-l pl-4">
            <Link href="/settings" className="flex items-center space-x-2 text-sm hover:text-primary">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <User size={16} />
              </div>
              <span className="hidden md:inline font-medium">{user.name}</span>
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive cursor-pointer"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}