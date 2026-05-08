"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, ShieldAlert, Timer, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';

interface SLATicket {
  id: number;
  title: string;
  priority: string;
  status: string;
  slaBreachAt: string;
  assignedTo: { name: string; username: string } | null;
}

interface SLAData {
  breached: SLATicket[];
  under1h: SLATicket[];
  under4h: SLATicket[];
  under24h: SLATicket[];
  safe: SLATicket[];
}

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference <= 0) return 'BREACHED';
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      return `${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className="font-mono">{timeLeft}</span>;
};

const SLARow = ({ ticket, urgency }: { ticket: SLATicket, urgency: 'critical' | 'warning' | 'high' | 'normal' }) => {
  const urgencyColors = {
    critical: 'text-red-500 border-l-red-500 bg-red-500/5',
    warning: 'text-orange-500 border-l-orange-500 bg-orange-500/5',
    high: 'text-yellow-500 border-l-yellow-500 bg-yellow-500/5',
    normal: 'text-green-500 border-l-green-500 bg-green-500/5',
  };

  return (
    <div className={`group flex items-center justify-between p-4 rounded-xl border border-white/5 border-l-4 transition-all hover:bg-white/[0.03] mb-2 ${urgencyColors[urgency]}`}>
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-white/20">#{ticket.id}</span>
          <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-white/40">{ticket.priority}</span>
        </div>
        <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{ticket.title}</h4>
      </div>
      
      <div className="flex items-center gap-8 shrink-0">
        <div className="flex flex-col items-end">
           <span className="text-[9px] uppercase tracking-widest text-white/20 font-bold mb-1">Assignee</span>
           <div className="flex items-center gap-2 text-white/60 text-xs font-medium">
             <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
               <User size={10} />
             </div>
             {ticket.assignedTo?.name || ticket.assignedTo?.username || 'Unassigned'}
           </div>
        </div>
        
        <div className="flex flex-col items-end w-24">
           <span className="text-[9px] uppercase tracking-widest text-white/20 font-bold mb-1">Limit</span>
           <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
             <Timer size={14} className="opacity-40" />
             <CountdownTimer targetDate={ticket.slaBreachAt} />
           </div>
        </div>

        <Link href={`/?ticketId=${ticket.id}`} className="p-2 hover:bg-white/10 rounded-lg text-white/20 hover:text-white transition-all">
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default function SLADashboard() {
  const [data, setData] = useState<SLAData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/tickets/sla');
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error("Failed to fetch SLA data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-white/20">
         <Loader2 className="w-8 h-8 animate-spin mb-4" />
         <span className="text-[10px] uppercase tracking-widest font-black">Analyzing SLA Metrics</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-12 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
       <div className="border-b border-white/5 pb-8">
          <h2 className="text-3xl font-black text-white tracking-tight">SLA Watch</h2>
          <p className="text-sm text-white/30 font-medium">Real-time surveillance of service commitments.</p>
       </div>

       <div className="space-y-10">
         {/* Critical Section */}
         <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg"><ShieldAlert size={18} /></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Breached & Critical Risk</h3>
            </div>
            <div className="space-y-1">
              {[...data.breached, ...data.under1h].length === 0 ? (
                <div className="p-12 text-center bg-zinc-900/40 rounded-3xl border border-white/5 border-dashed">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/10 font-black">All Targets Met</span>
                </div>
              ) : (
                <>
                  {data.breached.map(t => <SLARow key={t.id} ticket={t} urgency="critical" />)}
                  {data.under1h.map(t => <SLARow key={t.id} ticket={t} urgency="warning" />)}
                </>
              )}
            </div>
         </section>

         {/* Warning Section */}
         <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-orange-500/10 text-orange-500 rounded-lg"><AlertTriangle size={18} /></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Incoming Deadlines (&lt; 4h)</h3>
            </div>
            <div className="space-y-1">
              {data.under4h.length === 0 ? (
                <div className="p-12 text-center bg-zinc-900/40 rounded-3xl border border-white/5 border-dashed">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/10 font-black">No Pressing Tickets</span>
                </div>
              ) : (
                data.under4h.map(t => <SLARow key={t.id} ticket={t} urgency="high" />)
              )}
            </div>
         </section>

         {/* Safe Section */}
         <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-green-500/10 text-green-500 rounded-lg"><Clock size={18} /></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Operational Window</h3>
            </div>
            <div className="space-y-1">
              {[...data.under24h, ...data.safe].length === 0 ? (
                <div className="p-12 text-center bg-zinc-900/40 rounded-3xl border border-white/5 border-dashed">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/10 font-black">Queue Empty</span>
                </div>
              ) : (
                <>
                  {data.under24h.map(t => <SLARow key={t.id} ticket={t} urgency="normal" />)}
                  {data.safe.map(t => <SLARow key={t.id} ticket={t} urgency="normal" />)}
                </>
              )}
            </div>
         </section>
       </div>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
