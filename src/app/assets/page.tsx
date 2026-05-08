"use client";

import { useState, useEffect } from "react";
import NavHeader from "@/components/NavHeader";
import { 
  Laptop, Monitor, Server, Plus, Search, Edit2, Trash2, Box, 
  MapPin, ShieldCheck, ChevronDown, ChevronUp, ArrowLeft, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Asset, User } from "@/types";
import AuthGuard from "@/components/AuthGuard";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAsset, setExpandedAsset] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "LAPTOP",
    status: "ACTIVE",
    description: "",
    serialNumber: "",
    manufacturer: "",
    model: "",
    location: "",
    purchaseDate: "",
    warrantyExpiry: "",
    purchaseCost: "",
    assignedToId: "",
    specs: {
      cpu: "",
      ram: "",
      storage: "",
      os: "",
      licenseKey: ""
    }
  });

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      if (res.ok) setAssets(data);
    } catch (error) {
      console.error("Failed to load assets", error);
      setError('Failed to load assets. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) setStaff(data.filter((u: User) => u.role !== 'USER'));
    } catch (error) {
      console.error("Failed to load staff", error);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchStaff();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        purchaseCost: formData.purchaseCost ? parseFloat(formData.purchaseCost) : null,
        assignedToId: formData.assignedToId ? parseInt(formData.assignedToId) : null,
      };

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchAssets();
        // Reset form
        setFormData({
          name: "", type: "LAPTOP", status: "ACTIVE", description: "",
          serialNumber: "", manufacturer: "", model: "", location: "",
          purchaseDate: "", warrantyExpiry: "", purchaseCost: "", assignedToId: "",
          specs: { cpu: "", ram: "", storage: "", os: "", licenseKey: "" }
        });
      }
    } catch (error) {
      console.error("Failed to create asset", error);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "LAPTOP": return <Laptop className="w-5 h-5 text-blue-400" />;
      case "DESKTOP": return <Monitor className="w-5 h-5 text-purple-400" />;
      case "SERVER": return <Server className="w-5 h-5 text-amber-400" />;
      case "SOFTWARE": return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      default: return <Box className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    asset.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
        <NavHeader activeView="kanban" setActiveView={() => {}} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="flex-grow p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700/50 shadow-xl"
              title="Back to Dashboard"
            >
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <Server className="w-8 h-8 text-blue-500" />
                IT Asset Management
              </h1>
              <p className="text-slate-400 mt-1">Comprehensive inventory tracking for hardware and software.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            Add Asset
          </button>
        </div>

        {/* Search */}
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">{error}</div>}
        <div className="bg-slate-800/80 border border-slate-700 p-2 rounded-2xl flex items-center gap-3 mb-6 relative z-10 w-full max-w-md">
           <Search className="w-5 h-5 text-slate-400 ml-2" />
           <input
             type="text"
             placeholder="Search by name, type, serial, model..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="bg-transparent border-none text-white focus:outline-none w-full placeholder:text-slate-500"
           />
        </div>

        {/* Assets List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading inventory...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center text-slate-500">
              <Box className="w-12 h-12 mx-auto mb-4 opacity-20" />
              No assets found.
            </div>
          ) : (
            filteredAssets.map(asset => (
              <div key={asset.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all hover:bg-slate-800/60">
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                      {getIconForType(asset.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{asset.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="bg-slate-700 px-2 py-0.5 rounded uppercase tracking-wider font-bold border border-slate-600">{asset.type}</span>
                        {asset.serialNumber && <span>SN: {asset.serialNumber}</span>}
                        {asset.location && <span className="flex items-center gap-1"><MapPin size={12} /> {asset.location}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                        asset.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10' : 
                        asset.status === 'MAINTENANCE' ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 bg-slate-700'
                      }`}>
                        {asset.status}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {asset.assignedTo ? `Assignee: ${asset.assignedTo.name || asset.assignedTo.username}` : 'Unassigned'}
                      </div>
                    </div>
                    {expandedAsset === asset.id ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                  </div>
                </div>

                {expandedAsset === asset.id && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Asset Info</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Manufacturer</span> <span className="text-slate-200">{asset.manufacturer || '-'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Model</span> <span className="text-slate-200">{asset.model || '-'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Purchase Date</span> <span className="text-slate-200">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '-'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Purchase Cost</span> <span className="text-slate-200">{asset.purchaseCost ? `$${asset.purchaseCost}` : '-'}</span></div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Technical Specs</h4>
                      <div className="space-y-2">
                        {asset.specs && typeof asset.specs === 'object' ? (
                          Object.entries(asset.specs).map(([key, val]) => (
                            val ? (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-slate-500 capitalize">{key}</span> 
                                <span className="text-slate-200">{String(val)}</span>
                              </div>
                            ) : null
                          ))
                        ) : <span className="text-sm text-slate-600 italic">No specs defined</span>}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Actions & Notes</h4>
                      <p className="text-sm text-slate-400 italic line-clamp-3">{asset.description || 'No additional notes provided for this asset.'}</p>
                      
                      {pendingDeleteId === asset.id ? (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
                          <span className="text-xs font-bold text-rose-500">Delete {asset.name}?</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setPendingDeleteId(null)}
                              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' });
                                  if (res.ok) fetchAssets();
                                  setPendingDeleteId(null);
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white px-2 py-1 rounded shadow-lg shadow-rose-500/20"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <Edit2 size={12} /> Edit
                          </button>
                          <button 
                            className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors"
                            onClick={() => setPendingDeleteId(asset.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* New Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <Box className="w-6 h-6 text-blue-500" />
                Asset Registration
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Asset Name / Label *</label>
                  <input
                    type="text" required value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="e.g. London Office iMac #42"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP">Desktop</option>
                    <option value="SERVER">Server</option>
                    <option value="MONITOR">Monitor</option>
                    <option value="SOFTWARE">Software License</option>
                    <option value="MOBILE">Mobile Device</option>
                    <option value="PERIPHERAL">Peripheral</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                  <select
                    value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="ACTIVE">Active / Deployed</option>
                    <option value="STOCK">In Stock</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="RETIRED">Retired / Disposed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Identity & Procurement</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <input
                      placeholder="Serial Number" value={formData.serialNumber}
                      onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <input
                      placeholder="Manufacturer" value={formData.manufacturer}
                      onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <input
                      placeholder="Model Name" value={formData.model}
                      onChange={e => setFormData({...formData, model: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase ml-1">Purchase Date</label>
                    <input
                      type="date" value={formData.purchaseDate}
                      onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase ml-1">Warranty Expiry</label>
                    <input
                      type="date" value={formData.warrantyExpiry}
                      onChange={e => setFormData({...formData, warrantyExpiry: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase ml-1">Cost (USD)</label>
                    <input
                      type="number" step="0.01" value={formData.purchaseCost}
                      onChange={e => setFormData({...formData, purchaseCost: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-purple-500 uppercase tracking-widest">Technical Specifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    placeholder="CPU / Processor" value={formData.specs.cpu}
                    onChange={e => setFormData({...formData, specs: {...formData.specs, cpu: e.target.value}})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    placeholder="RAM / Memory" value={formData.specs.ram}
                    onChange={e => setFormData({...formData, specs: {...formData.specs, ram: e.target.value}})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    placeholder="Storage (SSD/HDD)" value={formData.specs.storage}
                    onChange={e => setFormData({...formData, specs: {...formData.specs, storage: e.target.value}})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    placeholder="Operating System / License Key" value={formData.specs.os}
                    onChange={e => setFormData({...formData, specs: {...formData.specs, os: e.target.value}})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Location</label>
                  <input
                    value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none"
                    placeholder="e.g. Remote, Mumbai Office, Floor 3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Assign To</label>
                  <select
                    value={formData.assignedToId} onChange={e => setFormData({...formData, assignedToId: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="">Maintain in Inventory (Unassigned)</option>
                    {staff.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes / Internal Description</label>
                <textarea
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none min-h-[100px] resize-none"
                  placeholder="Additional details about condition, accessories, etc."
                />
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-800 sticky bottom-0 bg-slate-900 pb-2">
                <button
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-all border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
