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
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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
      "flex h-screen overflow-hidden transition-colors duration-300",
      isParentMode ? "bg-slate-50" : "bg-bg-child"
    )}>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-72 transform bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 ease-out md:static md:translate-x-0 md:w-64",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-primary rounded-xl">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">
                AI-Bud
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg bg-slate-100 text-slate-500 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200",
                    isActive
                      ? "bg-brand-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

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

      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-brand-primary active:scale-95 transition-transform"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            <span className="font-semibold text-slate-800">AI-Bud</span>
          </div>
          <div className="w-10" />
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
