"use client";
import { Settings as SettingsIcon, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function GeneralSettings() {
  const { user } = useAuth();
  const workspaceUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-blue-500" />
          General Settings
        </h1>
        <p className="text-white/40 mt-2">Manage your workspace configuration and preferences.</p>
      </div>

      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
            <Info className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">System Information</h2>
            <p className="text-xs text-white/30 uppercase tracking-widest font-bold mt-1">Horizon IT Workspace v1.0.0</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid gap-2">
            <span className="text-[10px] uppercase font-black text-white/20 tracking-[0.2em]">Workspace URL</span>
            <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-blue-400 font-mono">
              {workspaceUrl}
            </div>
          </div>
          
          <div className="grid gap-2">
            <span className="text-[10px] uppercase font-black text-white/20 tracking-[0.2em]">Administrator</span>
            <div className="text-white/60 text-sm">
              {user?.name || 'Administrator'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
