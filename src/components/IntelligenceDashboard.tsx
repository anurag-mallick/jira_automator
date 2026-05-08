"use client";
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Loader2, AlertCircle, Clock, CheckCircle, Ticket, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  slaBreached: number;
  byPriority: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
  trend: { date: string; count: number }[];
}

const COLORS: Record<string, string> = {
  P0: '#ef4444',
  P1: '#f97316',
  P2: '#6366f1',
  P3: '#71717a',
};

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  AWAITING_USER: 'Awaiting',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const IntelligenceDashboard = () => {
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error(`Failed to load dashboard data`);
        const data = await res.json();

        const byStatus: Record<string, number> = {};
        data.statusGroups?.forEach((g: any) => byStatus[g.status] = g._count.status);
        
        const byPriority: Record<string, number> = {};
        data.priorityGroups?.forEach((g: any) => byPriority[g.priority] = g._count.priority);
        
        const trendMap: Record<string, number> = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          trendMap[format(subDays(now, i), 'MMM dd')] = 0;
        }

        data.recentTickets?.forEach((t: any) => {
          const createdDate = format(new Date(t.createdAt), 'MMM dd');
          if (trendMap[createdDate] !== undefined) trendMap[createdDate]++;
        });

        setStats({
          total: data.total,
          open: byStatus['TODO'] || 0,
          inProgress: byStatus['IN_PROGRESS'] || 0,
          resolved: (byStatus['RESOLVED'] || 0) + (byStatus['CLOSED'] || 0),
          closed: byStatus['CLOSED'] || 0,
          slaBreached: data.slaBreached || 0,
          byStatus: Object.entries(byStatus).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value })),
          byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
          trend: Object.entries(trendMap).map(([date, count]) => ({ date, count })),
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-3 text-red-400">
      <AlertCircle size={20} />
      <span>{error}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', value: stats?.total, icon: Ticket, trend: '+5%', color: 'border-white/20' },
          { label: 'Pending Help', value: (stats?.open || 0) + (stats?.inProgress || 0), icon: Clock, trend: '-2%', color: 'border-blue-500/40' },
          { label: 'Resolved', value: stats?.resolved, icon: CheckCircle, trend: '+12%', color: 'border-green-500/40' },
          { label: 'SLA Breaches', value: stats?.slaBreached, icon: AlertCircle, trend: 'Critical', color: 'border-red-500' },
        ].map((kpi, i) => (
          <div key={i} className={`bg-zinc-900/40 border border-white/5 border-l-4 ${kpi.color} p-5 group hover:bg-zinc-900/60 transition-all rounded-xl`}>
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{kpi.label}</p>
              <kpi.icon size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{kpi.value}</div>
            <div className="text-[10px] flex items-center gap-1 font-bold">
              <span className={kpi.trend === 'Critical' ? 'text-red-500' : 'text-green-500'}>{kpi.trend}</span>
              <span className="text-white/20 font-normal">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-500" /> Volume Trend
            </h3>
            <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Last 7 Days</span>
          </div>
          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6">Priority Mix</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.byPriority}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {stats?.byPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px]">
            {stats?.byPriority.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[p.name] }} />
                <span className="text-white/40 font-bold uppercase">{p.name}</span>
                <span className="text-white/80 font-mono ml-auto">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6">Workflow Distribution</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#6366f1" fillOpacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceDashboard;
