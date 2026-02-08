"use client";

import React, { useState } from 'react';
import { Home, Shield, Settings, Sparkles, User, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/user-context';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile } = useUser();
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
        "fixed inset-y-0 left-0 z-50 w-72 transform bg-white/95 backdrop-blur-2xl border-r border-slate-200 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] md:static md:translate-x-0 md:w-64 md:bg-white/80 md:shadow-xl",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/20 animate-bounce-slow">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
                AI-Bud
              </h1>
            </div>
            {/* Close button for mobile sidebar */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-xl bg-slate-100 text-slate-500 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
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
                    "flex items-center gap-3 px-4 py-4 md:py-3 rounded-2xl transition-all duration-300 group",
                    isActive
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25 scale-[1.02] md:scale-105"
                      : "text-slate-600 hover:bg-slate-50 hover:scale-[1.01]"
                  )}
                >
                  <item.icon className={clsx("w-5 h-5", isActive && "animate-pulse")} />
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mode Switcher Stub - Only for non-adults (under 18) */}
          {(userProfile?.age && userProfile.age < 18) && (
            <div className="mt-auto pt-6 border-t border-slate-100">
              <Link
                href={isParentMode ? "/" : "/parent"}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Switch to {isParentMode ? "Kid" : "Parent"} Mode
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/50 backdrop-blur-lg border-b border-slate-200 shadow-sm z-30">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2.5 rounded-2xl bg-white shadow-sm border border-slate-100 text-brand-primary active:scale-95 transition-transform"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            <span className="font-bold text-slate-800">AI-Bud</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth no-scrollbar">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
