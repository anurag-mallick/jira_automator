"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash, AlertCircle, Columns, Loader2, Edit2, Check, X } from 'lucide-react';

interface KanbanColumn {
  id: number;
  title: string;
  order: number;
}

export default function BoardStagesSettings() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    try {
      const res = await fetch("/api/kanban-columns");
      if (res.ok) {
        setColumns(await res.json());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    setActionLoading(true);
    setError('');
    const newOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order)) + 10 : 10;
    try {
      const res = await fetch("/api/kanban-columns", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: newStageName.trim().toUpperCase().replace(/ /g, '_'), order: newOrder })
      });
      if (res.ok) {
        setNewStageName('');
        await fetchColumns();
      } else {
        const body = await res.json();
        setError(body.error || "Failed to add stage");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteStage = async (id: number) => {
    if (!confirm("Are you sure? Tickets in this stage might lose their stage reference.")) return;
    try {
      const res = await fetch(`/api/kanban-columns/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchColumns();
      } else {
        const body = await res.json();
        setError(body.error || "Failed to delete stage");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (col: KanbanColumn) => {
    setEditingId(col.id);
    setEditingTitle(col.title);
  };

  const saveEdit = async (id: number) => {
    if (!editingTitle.trim()) return;
    try {
      const res = await fetch(`/api/kanban-columns/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: editingTitle })
      });
      if (res.ok) {
        setEditingId(null);
        await fetchColumns();
      } else {
        const body = await res.json();
        setError(body.error || "Failed to update stage");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newCols = [...columns];
    const temp = newCols[index].order;
    newCols[index].order = newCols[index - 1].order;
    newCols[index - 1].order = temp;
    newCols.sort((a,b) => a.order - b.order);
    setColumns(newCols);
    saveOrder(newCols);
  };

  const moveDown = async (index: number) => {
    if (index === columns.length - 1) return;
    const newCols = [...columns];
    const temp = newCols[index].order;
    newCols[index].order = newCols[index + 1].order;
    newCols[index + 1].order = temp;
    newCols.sort((a,b) => a.order - b.order);
    setColumns(newCols);
    saveOrder(newCols);
  };

  const saveOrder = async (cols: KanbanColumn[]) => {
    try {
      await fetch("/api/kanban-columns", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ columns: cols })
      });
    } catch (err) {
      console.error("Order save failed:", err);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <Columns className="text-indigo-400" /> Board Stages (Global)
        </h1>
        <p className="text-white/50 text-sm">Define the lifecycle stages for tickets across the organization.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold mb-4 text-white">Current Stages</h3>
        <div className="space-y-3">
          {columns.length === 0 && <p className="text-sm text-white/40 italic py-4">No custom stages found.</p>}
          {columns.map((col, idx) => (
            <div key={col.id} className="flex items-center justify-between bg-zinc-900 border border-white/10 p-4 rounded-xl group transition-all hover:border-indigo-500/30">
              {editingId === col.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <input 
                    type="text" 
                    value={editingTitle} 
                    onChange={e => setEditingTitle(e.target.value)}
                    className="flex-1 bg-zinc-800 border-none rounded px-3 py-1 text-sm focus:ring-1 focus:ring-indigo-500 text-white"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(col.id)} className="p-1.5 text-green-400 hover:bg-green-400/20 rounded">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-zinc-400 hover:bg-zinc-700/50 rounded">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <span className="font-bold tracking-wide text-white/90">{col.title}</span>
              )}
              
              {user?.role === 'ADMIN' && editingId !== col.id && (
                <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(col)} 
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => moveUp(idx)} 
                    disabled={idx === 0} 
                    className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => moveDown(idx)} 
                    disabled={idx === columns.length - 1} 
                    className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    ↓
                  </button>
                  <button 
                    onClick={() => deleteStage(col.id)} 
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg ml-2 transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {user?.role === 'ADMIN' && (
        <form onSubmit={addStage} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-end gap-4 shadow-xl">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-widest text-white/40 font-bold ml-1 block mb-2">Add New Stage</label>
            <input 
              type="text"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="e.g. IN_REVIEW, DEPLOYED"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <button 
            type="submit"
            disabled={actionLoading || !newStageName.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 h-12 box-border"
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Add</>}
          </button>
        </form>
      )}
    </div>
  );
}
