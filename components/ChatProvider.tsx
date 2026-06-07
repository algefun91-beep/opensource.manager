'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Step = { type: 'done' | 'running' | 'error'; text: string };
export type ChatMessage = { role: 'user' | 'agent'; content: string; steps?: Step[]; timestamp: Date };

const ChatContext = createContext<null | {
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  getConversationText: () => string;
}>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sandbox/messages')
      .then(response => response.ok ? response.json() : { messages: [] })
      .then(data => {
        if (cancelled) return;
        const msgs = Array.isArray(data?.messages) ? data.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        })) : [];
        setMessages(msgs);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const controller = new AbortController();
    fetch('/api/sandbox/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })) }),
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [messages, loaded]);

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
