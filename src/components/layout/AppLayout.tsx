"use client";

import React, { useState } from 'react';
import { Home, Shield, Settings, Sparkles, User, Menu, X, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/user-context';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile } = useUser();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const isParentMode = pathname?.startsWith('/parent');
  const isAuthScreen = !userProfile && pathname === '/';

  if (isAuthScreen) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  const navItems = isParentMode
    ? [
        { icon: Shield, label: 'Dashboard', href: '/parent' },
        { icon: User, label: 'Profiles', href: '/parent/profiles' },
        { icon: Settings, label: 'Settings', href: '/parent/settings' },
      ]
    : [
        { icon: MessageSquare, label: 'Chat', href: '/' },
        { icon: Sparkles, label: 'Games', href: '/games' },
        { icon: User, label: 'Profile', href: '/profile' },
      ];

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#F9FAFB] border-r border-slate-200 transition-transform duration-200 md:static md:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight">AI-Bud</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-200 md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="space-y-1">
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-4 px-2">
            <div className="text-xs text-slate-500">
              {userProfile?.username || 'Guest'}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {userProfile?.budName || 'Bud'}
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md border border-slate-200 p-2 text-slate-700"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">AI-Bud</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
