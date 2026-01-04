"use client";

import React, { useState } from 'react';
import { Home, Shield, Settings, Sparkles, User, Menu } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile

  // Simple logic to detect parent mode based on path (can be expanded)
  const isParentMode = pathname?.startsWith('/parent');

  const navItems = isParentMode
    ? [
      { icon: Shield, label: 'Dashboard', href: '/parent' },
      { icon: User, label: 'Profiles', href: '/parent/profiles' },
      { icon: Settings, label: 'Settings', href: '/parent/settings' },
    ]
    : [
      { icon: Home, label: 'Chat', href: '/' },
      { icon: Sparkles, label: 'Games', href: '/games' },
      { icon: User, label: 'My Profile', href: '/profile' },
    ];

  return (
    <div className={clsx(
      "flex h-screen overflow-hidden transition-colors duration-500",
      isParentMode ? "bg-slate-50" : "bg-bg-child"
    )}>
      {/* Sidebar Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 transform bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-xl transition-transform duration-300 ease-in-out md:static md:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-brand-primary rounded-xl shadow-lg shadow-brand-primary/20 animate-bounce-slow">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
              AI-Bud
            </h1>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group",
                    isActive
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25 scale-105"
                      : "text-slate-600 hover:bg-white hover:shadow-md hover:scale-102"
                  )}
                >
                  <item.icon className={clsx("w-5 h-5", isActive && "animate-pulse")} />
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mode Switcher Stub */}
          <div className="mt-auto pt-6 border-t border-slate-100">
            <Link
              href={isParentMode ? "/" : "/parent"}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Switch to {isParentMode ? "Kid" : "Parent"} Mode
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/50"
          >
            <Menu className="w-6 h-6 text-brand-primary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
