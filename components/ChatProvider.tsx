'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Step = { type: 'done' | 'running' | 'error'; text: string };
export type ChatMessage = { role: 'user' | 'agent'; content: string; steps?: Step[]; timestamp: Date };

const STORAGE_KEY = 'sandbox-persistence-v1';

const ChatContext = createContext<null | {
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  getConversationText: () => string;
}>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load messages from storage once
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const json = window.localStorage.getItem(STORAGE_KEY);
      if (!json) return;
      const data = JSON.parse(json);
      if (Array.isArray(data?.messages)) {
        const msgs = data.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }));
        setMessages(msgs);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist messages only (avoid stomping other state fields)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const base = raw ? JSON.parse(raw) : {};
      const payload = { ...base, messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })) };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [messages]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const data = JSON.parse(e.newValue || '{}');
        if (Array.isArray(data?.messages)) {
          const msgs = data.messages.map((m: any) => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : new Date() }));
          setMessages(msgs);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addMessage = useCallback((m: ChatMessage) => setMessages(prev => [...prev, m]), []);

  const getConversationText = useCallback(() => {
    return messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
  }, [messages]);

  return (
    <ChatContext.Provider value={{ messages, setMessages, addMessage, getConversationText }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext as any);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
