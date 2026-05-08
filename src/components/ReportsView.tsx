"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle, Clock, CheckCircle, Ticket, Users } from 'lucide-react';

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  slaAtRisk: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  AWAITING_USER: 'Awaiting',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  TODO:          'bg-zinc-500',
  IN_PROGRESS:   'bg-blue-500',
  AWAITING_USER: 'bg-yellow-500',
  RESOLVED:      'bg-green-500',
  CLOSED:        'bg-zinc-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  P3: 'bg-zinc-500',
  P2: 'bg-indigo-500',
  P1: 'bg-orange-500',
  P0: 'bg-red-500',
};

const ReportsView = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/tickets');
        if (!res.ok) throw new Error('Failed to load tickets');
        const data = await res.json();
        const tickets: any[] = data.tickets || [];

        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        let slaAtRisk = 0;
        const now = new Date();

        tickets.forEach(t => {
          byStatus[t.status] = (byStatus[t.status] || 0) + 1;
          byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
          if (t.slaBreachAt && new Date(t.slaBreachAt) < now && t.status !== 'RESOLVED' && t.status !== 'CLOSED') {
            slaAtRisk++;
          }
        });

        setStats({
          total: tickets.length,
          open: byStatus['TODO'] || 0,
          inProgress: byStatus['IN_PROGRESS'] || 0,
          resolved: (byStatus['RESOLVED'] || 0) + (byStatus['CLOSED'] || 0),
          closed: byStatus['CLOSED'] || 0,
          slaAtRisk,
          byPriority,
          byStatus,
        });
        setRecentTickets(tickets.slice(0, 8));
      } catch (e: any) {
        setError(e.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="glass-card p-6 flex items-center gap-3 text-red-400">
      <AlertCircle size={18} /><span className="text-sm">{error}</span>
    </div>
  );

  const statuses = ['TODO', 'IN_PROGRESS', 'AWAITING_USER', 'RESOLVED', 'CLOSED'];
  const priorities = ['P3', 'P2', 'P1', 'P0'];
  const priorityLabels: Record<string,string> = { P0: 'P0 – Critical', P1: 'P1 – High', P2: 'P2 – Normal', P3: 'P3 – Low' };
  const maxStatusCount = Math.max(...statuses.map(s => stats?.byStatus[s] || 0), 1);
  const maxPriorityCount = Math.max(...priorities.map(p => stats?.byPriority[p] || 0), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 flex items-center gap-2">
            <Ticket size={12} /> Total Tickets
          </p>
          <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Open / In Progress</p>
          <div className="text-3xl font-bold text-blue-400">{(stats?.open ?? 0) + (stats?.inProgress ?? 0)}</div>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 flex items-center gap-2">
            <CheckCircle size={12} className="text-green-400" /> Resolved
          </p>
          <div className="text-3xl font-bold text-green-400">{stats?.resolved ?? 0}</div>
        </div>
        <div className="glass-card p-5 border-orange-500/20 bg-orange-500/5">
          <p className="text-[10px] uppercase tracking-widest text-orange-400/60 font-bold mb-2 flex items-center gap-2">
            <Clock size={12} /> SLA Breached
          </p>
          <div className="text-3xl font-bold text-orange-400">{stats?.slaAtRisk ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status bar chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold mb-6 text-white/60 uppercase tracking-widest text-[10px]">Tickets by Status</h3>
          <div className="space-y-4">
            {statuses.map(s => {
              const count = stats?.byStatus[s] || 0;
              const pct = (count / maxStatusCount) * 100;
              return (
                <div key={s} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">{STATUS_LABELS[s]}</span>
                    <span className="font-bold text-white/80">{count}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${STATUS_COLORS[s]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Priority bar chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold mb-6 text-white/60 uppercase tracking-widest text-[10px]">Tickets by Priority</h3>
          <div className="space-y-4">
            {priorities.map(p => {
              const count = stats?.byPriority[p] || 0;
              const pct = (count / maxPriorityCount) * 100;
              return (
                <div key={p} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">{priorityLabels[p] ?? p}</span>
                    <span className="font-bold text-white/80">{count}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${PRIORITY_COLORS[p]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Recent Tickets</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-[10px] uppercase tracking-widest text-white/30 font-bold">
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {recentTickets.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-white/20 text-xs">No tickets yet</td></tr>
            ) : recentTickets.map(t => (
              <tr key={t.id} className="hover:bg-white/2 transition-colors">
                <td className="px-6 py-3 font-mono text-xs text-white/30">#{t.id}</td>
                <td className="px-6 py-3 font-medium max-w-xs truncate">{t.title}</td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[t.status]}/20 text-white/70`}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] font-bold ${PRIORITY_COLORS[t.priority] === 'bg-red-500' ? 'text-red-400' : PRIORITY_COLORS[t.priority] === 'bg-orange-500' ? 'text-orange-400' : PRIORITY_COLORS[t.priority] === 'bg-indigo-500' ? 'text-indigo-400' : 'text-zinc-400'}`}>
                    {t.priority}
                  </span>
                </td>
                <td className="px-6 py-3 text-xs text-white/40">{t.assignedTo?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsView;
