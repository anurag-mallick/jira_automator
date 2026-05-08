"use client";

import { useState, useEffect } from "react";
import NavHeader from "@/components/NavHeader";
import { Plus, Trash2, Zap, Play, Filter } from "lucide-react";

interface Automation {
  id: number;
  name: string;
  trigger: string;
  condition: string | null;
  action: string;
  isActive: boolean;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("TICKET_CREATED");
  const [conditionField, setConditionField] = useState("priority");
  const [conditionValue, setConditionValue] = useState("P0");
  const [actionType, setActionType] = useState("ASSIGN_TO");
  const [actionValue, setActionValue] = useState("");
  
  const [users, setUsers] = useState<{id: number, name: string | null, username: string}[]>([]);

  const fetchAutomations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/automations");
      if (res.ok) setAutomations(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAutomations();
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const condition = JSON.stringify({ field: conditionField, value: conditionValue });
      const action = JSON.stringify({ type: actionType, value: actionValue });

      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, trigger, condition, action }),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchAutomations();
        setName("");
        setActionValue("");
      }
    } catch (error) {
      console.error("Failed to save automation", error);
    }
  };

  const toggleStatus = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) fetchAutomations();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAutomation = async (id: number) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (res.ok) fetchAutomations();
    } catch (e) {
      console.error(e);
    }
  };

  const parseJsonSafe = (str: string | null) => {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return null; }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      <NavHeader activeView="kanban" setActiveView={() => {}} />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="text-amber-400 w-8 h-8" />
              Advanced Automations
            </h1>
            <p className="text-slate-400 mt-2">Create 'If This, Then That' rules to automate your helpdesk.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Rule
          </button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-slate-400 text-center py-12">Loading rules...</div>
          ) : automations.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center">
              <Zap className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Automations Yet</h3>
              <p className="text-slate-400 max-w-sm mb-6">Create rules to automatically assign tickets, set priorities, or update statuses based on conditions.</p>
              <button onClick={() => setIsModalOpen(true)} className="text-amber-400 font-medium hover:text-amber-300">Create your first rule</button>
            </div>
          ) : (
            automations.map(auto => {
              const conditionObj = parseJsonSafe(auto.condition);
              const actionObj = parseJsonSafe(auto.action);
              
              return (
                <div key={auto.id} className={`bg-slate-800 border ${auto.isActive ? 'border-amber-500/30 shadow-lg shadow-amber-500/5' : 'border-slate-700 opacity-60'} rounded-2xl p-6 transition-all relative overflow-hidden group`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-1.5 rounded-lg ${auto.isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-bold text-white">{auto.name}</h3>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm mt-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 inline-flex">
                        <span className="flex items-center gap-1.5 text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded">
                          <Play className="w-3 h-3" />
                          WHEN
                        </span>
                        <span className="text-slate-300">Ticket is {auto.trigger === 'TICKET_CREATED' ? 'Created' : 'Updated'}</span>
                        
                        {conditionObj && (
                          <>
                            <span className="text-slate-500 mx-1">&bull;</span>
                            <span className="flex items-center gap-1.5 text-purple-400 font-medium bg-purple-500/10 px-2 py-1 rounded">
                              <Filter className="w-3 h-3" />
                              IF
                            </span>
                            <span className="text-slate-300 tracking-wider">
                              <span className="uppercase text-xs text-slate-400">{conditionObj.field}</span> == <span className="font-bold text-white">{conditionObj.value}</span>
                            </span>
                          </>
                        )}

                        <span className="text-slate-500 mx-1">&bull;</span>
                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded">
                          <Zap className="w-3 h-3" />
                          THEN
                        </span>
                        <span className="text-slate-300 tracking-wider">
                          <span className="uppercase text-xs text-slate-400">{actionObj?.type.replace('_', ' ')}</span> <span className="font-bold text-white">{actionObj?.value}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={auto.isActive} onChange={() => toggleStatus(auto.id, auto.isActive)} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${auto.isActive ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${auto.isActive ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                      </label>
                      <button onClick={() => deleteAutomation(auto.id)} className="text-slate-500 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* New Automation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Build Automation Rule
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Rule Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="e.g. Escalate Critical Bugs to Admins"
                />
              </div>

              {/* Visual Builder UI */}
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-6 relative overflow-hidden">
                <div className="absolute left-10 top-10 bottom-10 w-px bg-slate-800 z-0"></div>
                
                {/* Trigger */}
                <div className="flex gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Play className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">When</label>
                    <select value={trigger} onChange={e => setTrigger(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                      <option value="TICKET_CREATED">Ticket is Created</option>
                      <option value="TICKET_UPDATED">Ticket is Updated</option>
                    </select>
                  </div>
                </div>

                {/* Condition */}
                <div className="flex gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Filter className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">If</label>
                    <div className="flex gap-2">
                      <select value={conditionField} onChange={e => setConditionField(e.target.value)} className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                        <option value="priority">Priority IS</option>
                        <option value="status">Status IS</option>
                        <option value="tags">Tags CONTAINS</option>
                      </select>
                      <input 
                        type="text" 
                        value={conditionValue} 
                        onChange={e => setConditionValue(e.target.value)} 
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" 
                        placeholder="e.g. P0, Bug, TODO"
                      />
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="flex gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Then Do</label>
                    <div className="flex gap-2">
                      <select value={actionType} onChange={e => setActionType(e.target.value)} className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                        <option value="ASSIGN_TO">Assign To</option>
                        <option value="SET_PRIORITY">Set Priority</option>
                        <option value="SET_STATUS">Set Status</option>
                      </select>
                      
                      {actionType === 'ASSIGN_TO' ? (
                        <select value={actionValue} onChange={e => setActionValue(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                          <option value="">Select User...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          value={actionValue} 
                          onChange={e => setActionValue(e.target.value)} 
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" 
                          placeholder="e.g. P0, IN_PROGRESS"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors border border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-medium shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
