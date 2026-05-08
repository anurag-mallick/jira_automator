"use client";
import React from 'react';
import { X, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'n', description: 'Create new ticket' },
  { key: '/', description: 'Focus search bar' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close modals or blur inputs' },
  { key: 'k', description: 'Switch to Board view' },
  { key: 'l', description: 'Switch to List view' },
];

const Keycap = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 border-b-2 rounded-md text-xs font-mono text-white/90 min-w-[24px] text-center inline-block shadow-sm">
    {children}
  </kbd>
);

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
         >
           <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950">
             <div className="flex items-center gap-2 text-white/80">
                <Command size={18} />
                <h3 className="font-bold text-sm">Keyboard Shortcuts</h3>
             </div>
             <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white">
               <X size={16} />
             </button>
           </div>
           
           <div className="p-6">
             <div className="grid gap-3">
               {shortcuts.map((sc, i) => (
                 <div key={i} className="flex items-center justify-between group">
                   <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors">{sc.description}</span>
                   <Keycap>{sc.key}</Keycap>
                 </div>
               ))}
             </div>
           </div>
         </motion.div>
       </div>
    </AnimatePresence>
  );
}
