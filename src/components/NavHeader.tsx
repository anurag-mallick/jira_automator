"use client";
import React from 'react';
import { Settings, Server, ChevronRight, Star, LayoutGrid, List, BarChart, Calendar, Search, Menu, Shield, Maximize2, Minimize2, Move } from 'lucide-react';
import Link from 'next/link';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useDensity } from '@/context/DensityContext';

interface BreadcrumbsProps {
  activeView: string;
  setActiveView: (view: 'kanban' | 'list' | 'reports' | 'calendar' | 'intelligence' | 'sla') => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onMenuToggle?: () => void;
}

const VIEW_LABELS: Record<string, string> = {
  intelligence: 'Intelligence Dashboard',
  kanban: 'Board View',
  list: 'List View',
  calendar: 'Calendar View',
  sla: 'SLA Monitor',
  reports: 'Reports',
};

const NavHeader = ({ activeView, setActiveView, searchQuery, onSearchChange, onMenuToggle }: BreadcrumbsProps) => {
  const { density, setDensity } = useDensity();

  return (
    <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-zinc-950/20 backdrop-blur-sm sticky top-0 z-30 gap-4">
      <div className="flex items-center min-w-0">
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-1.5 mr-2 -ml-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-md"
          >
            <Menu size={18} />
          </button>
        )}
        
        <div className="hidden sm:flex items-center gap-2 text-sm shrink-0 truncate">
          <span className="text-white/40 hover:text-white cursor-pointer transition-colors truncate">Spaces</span>
          <ChevronRight size={14} className="text-white/20 shrink-0" />
          <div className="flex items-center gap-2 font-bold px-2 py-1 rounded bg-white/5 shrink-0">
            <LayoutGrid size={14} className="text-blue-500" />
            <span>{VIEW_LABELS[activeView] || 'Dashboard'}</span>
          </div>
          <Star size={14} className="text-white/20 hover:text-yellow-500 cursor-pointer transition-colors ml-2 shrink-0" />
        </div>
      </div>

      {/* Global Search */}
      {onSearchChange !== undefined && (
        <div className="grow max-w-md mx-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search across all tickets..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium"
            />
          </div>
        </div>
      )}

      {/* Density & View Switcher */}
      <div className="flex items-center gap-4 md:gap-6 ml-auto shrink-0 overflow-x-auto scrollbar-hide py-1">
        {/* Density Toggle */}
        <div className="flex items-center bg-white/5 p-1 rounded-md border border-white/5 shrink-0 mr-2">
          <button 
            onClick={() => setDensity('compact')}
            className={`p-1.5 rounded transition-all ${density === 'compact' ? 'bg-zinc-800 text-blue-500' : 'text-white/20 hover:text-white/40'}`}
            title="Compact View"
          >
            <Minimize2 size={13} />
          </button>
          <button 
            onClick={() => setDensity('comfortable')}
            className={`p-1.5 rounded transition-all ${density === 'comfortable' ? 'bg-zinc-800 text-blue-500' : 'text-white/20 hover:text-white/40'}`}
            title="Comfortable View"
          >
            <Move size={13} />
          </button>
          <button 
            onClick={() => setDensity('spacious')}
            className={`p-1.5 rounded transition-all ${density === 'spacious' ? 'bg-zinc-800 text-blue-500' : 'text-white/20 hover:text-white/40'}`}
            title="Spacious View"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        <div className="flex items-center bg-white/5 p-1 rounded-md border border-white/5 shrink-0">
          <button 
            onClick={() => setActiveView('intelligence')}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${activeView === 'intelligence' ? 'bg-zinc-800 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            <BarChart size={12} className="text-indigo-400" />
            Intelligence
          </button>
          <button 
            onClick={() => setActiveView('kanban')}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${activeView === 'kanban' ? 'bg-zinc-800 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            <LayoutGrid size={12} />
            Board
          </button>
          <button 
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${activeView === 'list' ? 'bg-zinc-800 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            <List size={12} />
            List
          </button>
          <button 
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${activeView === 'calendar' ? 'bg-zinc-800 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            <Calendar size={12} />
            Calendar
          </button>
          <button 
            onClick={() => setActiveView('sla')}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${activeView === 'sla' ? 'bg-zinc-800 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            <Shield size={12} className="text-blue-400" />
            SLA
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-6 text-white/40 shrink-0">
          <NotificationCenter />
          <Link href="/assets" className="text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5 ml-2">
            <Server className="w-4 h-4" />
            Assets
          </Link>
          <Link 
            href="/settings"
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all active:scale-[0.98]"
          >
            <Settings size={14} />
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
};

export default NavHeader;
