"use client";
import React, { useState, useEffect } from 'react';
import { Clock, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { TicketPriority } from '@/generated/prisma';

interface SLAPolicy {
  id?: number;
  name: string;
  priority: string;
  responseTimeMins: number;
  responseTimeHours: number;
}

const PRIORITIES = [
  { id: TicketPriority.P0, name: 'P0 (Critical)', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { id: TicketPriority.P1, name: 'P1 (High)', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: TicketPriority.P2, name: 'P2 (Normal)', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: TicketPriority.P3, name: 'P3 (Low)', color: 'text-zinc-400', bgColor: 'bg-zinc-400/10' },
];

export default function SLASettingsPage() {
  const [policies, setPolicies] = useState<Record<string, SLAPolicy>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const resp = await fetch('/api/sla');
      if (!resp.ok) throw new Error('Failed to fetch policies');
      const data: SLAPolicy[] = await resp.json();
      
      const policyMap: Record<string, SLAPolicy> = {};
      data.forEach(p => {
        policyMap[p.priority] = p;
      });
      setPolicies(policyMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicy = async (priority: string, hours: number) => {
    setSaving(priority);
    setError(null);
    setSuccess(null);
    try {
      const resp = await fetch('/api/sla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority,
          responseTimeHours: hours,
          name: PRIORITIES.find(p => p.id === priority)?.name || priority
        })
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Failed to update policy');
      }

      const updatedPolicy = await resp.json();
      setPolicies(prev => ({ ...prev, [priority]: updatedPolicy }));
      setSuccess(`Updated SLA for ${priority}`);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="text-blue-500" />
          SLA Policies
        </h1>
        <p className="text-white/60 mt-2">
          Define response time targets (in hours) for each ticket priority. These will be used to calculate SLA breach times.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div className="grid gap-4">
        {PRIORITIES.map((p) => {
          const policy = policies[p.id];
          const [val, setVal] = useState(policy?.responseTimeHours?.toString() || "");

          // Sync val when policies are loaded
          useEffect(() => {
            if (policy) setVal(policy.responseTimeHours.toString());
          }, [policy]);

          return (
            <div 
              key={p.id}
              className="bg-zinc-900 border border-white/5 p-6 rounded-xl hover:bg-zinc-900/80 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className={`${p.bgColor} ${p.color} p-3 rounded-lg`}>
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-wider text-sm">
                    {p.name}
                  </h3>
                  <p className="text-white/40 text-xs mt-1">
                    Current Goal: {policy ? `${policy.responseTimeHours} hours` : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder="Hours"
                    className="w-32 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-white/20 pointer-events-none">
                    hrs
                  </span>
                </div>
                
                <button
                  onClick={() => handleUpdatePolicy(p.id, parseFloat(val))}
                  disabled={saving === p.id || !val}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/10 active:scale-95"
                >
                  {saving === p.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-xl">
        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2 text-sm">
          <AlertCircle size={16} />
          Note on SLA Application
        </h4>
        <ul className="text-white/60 text-xs space-y-2 list-disc ml-4">
          <li>SLA breach times are calculated exactly when a ticket is created.</li>
          <li>Updating these policies will only affect newly created tickets.</li>
          <li>For existing tickets, you can manually update the due date if needed.</li>
        </ul>
      </div>
    </div>
  );
}
