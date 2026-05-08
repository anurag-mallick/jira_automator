"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Info, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'new_ticket';
  timestamp: Date;
  read: boolean;
}

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = React.useCallback((notif: Notification) => {
    setNotifications(prev => [notif, ...prev]);
    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(notif.title, { body: notif.message });
    }
  }, []);

  useEffect(() => {
    // Poll for new tickets every 15 seconds
    let lastKnownId = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/tickets?pageSize=1&page=1');
        if (res.ok) {
          const data = await res.json();
          const latest = data.tickets?.[0];
          if (latest && latest.id > lastKnownId && lastKnownId !== 0) {
            addNotification({
              id: Math.random().toString(),
              title: 'New Ticket Created',
              message: `Ticket #${latest.id}: ${latest.title}`,
              type: 'new_ticket',
              timestamp: new Date(),
              read: false
            });
          }
          if (latest) lastKnownId = latest.id;
        }
      } catch (e) {}
    }, 15000);

    return () => clearInterval(interval);
  }, [addNotification]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/5 rounded-full transition-colors relative"
      >
        <Bell size={18} className={unreadCount > 0 ? "text-indigo-400" : "text-white/60"} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-black" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[100]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-[400px] bg-zinc-950 border-l border-white/5 shadow-2xl z-[101] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Notifications</h2>
                  <p className="text-xs text-white/40">Keep track of important events</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                    < Bell size={48} className="mb-4" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-xl border transition-all ${n.read ? 'bg-transparent border-white/5 opacity-60' : 'bg-white/5 border-indigo-400/20'}`}>
                      <div className="flex gap-4">
                        <div className="mt-1">
                          {n.type === 'warning' && <AlertTriangle size={16} className="text-orange-400" />}
                          {n.type === 'success' && <CheckCircle size={16} className="text-green-400" />}
                          {n.type === 'new_ticket' && <Package size={16} className="text-indigo-400" />}
                          {n.type === 'info' && <Info size={16} className="text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{n.title}</p>
                          <p className="text-xs text-white/50 mt-1 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-white/20 mt-2 font-mono">{format(n.timestamp, 'HH:mm:ss')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-6 border-t border-white/5">
                  <button 
                    onClick={markAllRead}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};


export default NotificationCenter;
