"use client";
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TemplatesSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'TODO',
    priority: 'P2',
    tags: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        setIsCreating(false);
        setFormData({ name: '', description: '', status: 'TODO', priority: 'P2', tags: '' });
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Ticket Templates</h2>
          <p className="text-sm text-white/40 mt-1">Manage global templates for faster ticket creation.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      {isCreating && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-white">Create Template</h3>
            <button onClick={() => setIsCreating(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white/40 mb-1 block uppercase">Template Name *</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 mb-1 block uppercase">Tags (comma separated)</label>
              <input 
                type="text" 
                value={formData.tags}
                onChange={e => setFormData({...formData, tags: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white/40 mb-1 block uppercase">Default Priority</label>
              <select 
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white" 
              >
                <option value="P0">P0 - Critical</option>
                <option value="P1">P1 - High</option>
                <option value="P2">P2 - Normal</option>
                <option value="P3">P3 - Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 mb-1 block uppercase">Default Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white" 
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/40 mb-1 block uppercase">Description *</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white resize-none" 
            />
          </div>

          <button 
            disabled={!formData.name || !formData.description}
            onClick={handleCreate}
            className="bg-white text-black hover:bg-white/90 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            Save Template
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-white/40 text-sm">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-white/40 text-sm p-8 text-center border border-white/10 border-dashed rounded-xl">
          No templates found. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map(t => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-xl p-5 flex justify-between items-start"
            >
              <div>
                <h3 className="font-bold text-lg text-white mb-2">{t.name}</h3>
                <p className="text-sm text-white/60 mb-3">{t.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80">{t.priority}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80">{t.status}</span>
                  {t.tags && t.tags.length > 0 && (
                     <div className="flex gap-1 ml-2">
                        {t.tags.map((tag: string, i: number) => (
                           <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/30 text-indigo-300">
                             {tag}
                           </span>
                        ))}
                     </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => handleDelete(t.id)}
                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                title="Delete Template"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
