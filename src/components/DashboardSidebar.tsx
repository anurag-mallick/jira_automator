"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutGrid, List, BarChart, Users, LogOut,
  ChevronDown, ChevronRight, Shield, Database, 
  Plus, ExternalLink, Calendar, Github, Linkedin, Cpu,
  Settings as SettingsIcon, X, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedView {
  id: number;
  name: string;
  query: any;
}

interface SidebarProps {
  activeView: string;
  setActiveView: (view: 'kanban' | 'list' | 'reports' | 'calendar' | 'intelligence' | 'sla') => void;
  onNewTicket: () => void;
  onApplyView?: (query: any) => void;
  isMobileOpen?: boolean;
  onClose?: () => void;
  refreshKey?: number;
}

const Sidebar = ({ activeView, setActiveView, onNewTicket, onApplyView, isMobileOpen, onClose, refreshKey }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const [spacesOpen, setSpacesOpen] = useState(true);
  const [viewsOpen, setViewsOpen] = useState(true);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [spaces, setSpaces] = useState<{id: number, name: string}[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  React.useEffect(() => {
    fetch('/api/views').then(res => res && res.ok && res.json()).then(data => {
      if (Array.isArray(data)) setSavedViews(data);
    }).catch(console.error);
    fetch('/api/spaces').then(res => res && res.ok && res.json()).then(data => {
      if (Array.isArray(data)) setSpaces(data);
    }).catch(console.error);
  }, [refreshKey]);

  const deleteView = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 2000);
      return;
    }

    try {
      const res = await fetch(`/api/views/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedViews((prev: SavedView[]) => prev.filter((v: SavedView) => v.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { id: 'intelligence', label: 'Dashboard', icon: BarChart },
    { id: 'kanban', label: 'Board', icon: LayoutGrid },
    { id: 'list',   label: 'List',  icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'sla',    label: 'SLA Monitor', icon: Shield },
  ];

  return (
    <aside className={`w-[260px] bg-zinc-950/95 md:bg-zinc-950/60 border-r border-white/5 flex flex-col h-screen backdrop-blur-3xl shrink-0 fixed inset-y-0 left-0 z-50 md:relative transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      {/* Workspace Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Cpu size={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black leading-none tracking-tighter">HORIZON<span className="text-blue-500">IT</span></span>
            <span className="text-[10px] text-white/30 mt-1 uppercase tracking-tighter font-bold">Workspace</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1 text-white/40 hover:text-white hover:bg-white/10 rounded">
              <X size={16} />
            </button>
          )}
          <ChevronDown size={12} className="text-white/20 hidden md:block" />
        </div>
      </div>

      {/* New Ticket CTA */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onNewTicket}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
        >
          <Plus size={15} />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Views Navigation */}
      <div className="px-2 pt-2 space-y-0.5">
        <p className="px-3 text-[9px] uppercase tracking-widest font-bold text-white/20 mb-1">Perspective</p>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as any)}
            className={`group relative w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeView === id
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner shadow-blue-500/5'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {activeView === id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-full" />
            )}
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Quick Links */}
        <div className="px-2 mt-4 space-y-0.5">
          <p className="px-3 text-[9px] uppercase tracking-widest font-bold text-white/20 mb-1">Inventory</p>
          <a
            href="/assets"
            className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all`}
          >
            <Database size={14} className="text-blue-400" />
            <span>Asset Inventory</span>
          </a>
          <a
            href="/submit"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <ExternalLink size={14} className="text-emerald-500" />
            <span>Public Portal</span>
          </a>
          <a
            href="/settings"
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <SettingsIcon size={14} className="text-zinc-400" />
            <span>Settings</span>
          </a>
          {user?.role === 'ADMIN' && (
            <a
              href="/settings/users"
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <Users size={14} className="text-purple-400" />
              <span>User Management</span>
            </a>
          )}
        </div>

        {/* Spaces Hierarchy */}
        <div className="px-2 mt-4">
          <button
            onClick={() => setSpacesOpen(!spacesOpen)}
            className="w-full flex items-center gap-2 px-3 py-1 text-[9px] uppercase tracking-widest font-bold text-white/20 hover:text-white/60 transition-colors"
          >
            {spacesOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>Departments</span>
          </button>

          <AnimatePresence initial={false}>
            {spacesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-1 space-y-0.5"
              >
                {spaces.length === 0 ? (
                  <div className="px-3 py-1.5 text-xs text-white/40 italic">No departments configured</div>
                ) : (
                  spaces.map(space => (
                    <button
                      key={space.id}
                      onClick={() => setActiveView('kanban')}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors text-white/40 hover:text-white hover:bg-white/5`}
                    >
                      <ChevronRight size={10} className="text-white/20" />
                      <div className="w-2 h-2 rounded-sm bg-blue-500" />
                      <span>{space.name}</span>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Saved Views */}
        <div className="px-2 mt-4">
          <button
            onClick={() => setViewsOpen(!viewsOpen)}
            className="w-full flex items-center gap-2 px-3 py-1 text-[9px] uppercase tracking-widest font-bold text-white/20 hover:text-white/60 transition-colors"
          >
            {viewsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>Saved Filters</span>
          </button>

          <AnimatePresence initial={false}>
            {viewsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-1 space-y-0.5"
              >
                {savedViews.length === 0 ? (
                  <div className="px-3 py-1.5 text-xs text-white/40 italic">No saved filters</div>
                ) : (
                  savedViews.map((view: SavedView) => (
                    <div
                      key={view.id}
                      onClick={() => {
                        if (onApplyView) onApplyView(view.query);
                      }}
                      className="group w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors text-white/40 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      <span className="truncate">{view.name}</span>
                      <Trash2 
                        size={12} 
                        className={`group-hover:opacity-100 transition-all shrink-0 ${confirmDeleteId === view.id ? 'opacity-100 text-red-500' : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-red-400'}`}
                        onClick={(e: React.MouseEvent) => deleteView(view.id, e)}
                      />
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Development Branding */}
      <div className="px-4 py-3 flex flex-col items-center gap-2 bg-white/[0.02] border-t border-white/5">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 text-center">Developed by <br/> Anurag Mallick</span>
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/anurag-mallick" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white transition-all transform hover:scale-110"
            title="GitHub"
          >
            <Github size={14} />
          </a>
          <a 
            href="https://www.linkedin.com/in/anuragmallick901/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/40 hover:text-blue-400 transition-all transform hover:scale-110"
            title="LinkedIn"
          >
            <Linkedin size={14} />
          </a>
        </div>
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-white/5 flex items-center justify-between bg-zinc-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-[10px] text-blue-400">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold leading-tight">{user?.name || user?.username}</span>
            <span className="text-[9px] text-white/30 uppercase tracking-tighter">{user?.role}</span>
          </div>
        </div>
        <button onClick={signOut} className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-white/5">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
