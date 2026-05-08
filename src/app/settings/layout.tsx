"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Columns, FolderTree, Shield, Settings as SettingsIcon, FilePlus, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const SETTINGS_NAVIGATION = [
  { name: 'General', href: '/settings', icon: SettingsIcon },
  { name: 'Security', href: '/settings/security', icon: Shield },
  { name: 'Spaces & Folders', href: '/settings/spaces', icon: FolderTree },
  { name: 'Board Stages', href: '/settings/board-stages', icon: Columns },
  { name: 'Ticket Templates', href: '/settings/templates', icon: FilePlus, adminOnly: true },
  { name: 'SLA Policies', href: '/settings/sla', icon: Clock, adminOnly: true },
  { name: 'User Management', href: '/settings/users', icon: Users, adminOnly: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Settings Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-zinc-950/50 flex flex-col pt-6">
        <div className="px-6 mb-8 group cursor-pointer">
          <Link href="/" className="flex items-center gap-2 group-hover:bg-white/5 p-2 rounded-lg transition-colors -ml-2">
            <LayoutDashboard size={20} className="text-blue-500" />
            <span className="font-bold tracking-tight text-white/90">Back to Board</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <h3 className="px-2 text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Settings</h3>
          {SETTINGS_NAVIGATION.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner' 
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}
                `}
              >
                <Icon size={18} className={isActive ? 'text-blue-400' : 'text-white/40 group-hover:text-white'} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Settings Content Area */}
      <main className="flex-1 overflow-y-auto bg-zinc-900 custom-scrollbar">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
