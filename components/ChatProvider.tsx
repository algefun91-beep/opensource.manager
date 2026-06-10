'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

type Step = { type: 'done' | 'running' | 'error'; text: string };
export type ChatMessage = {
  role: 'user' | 'agent';
  content: string;
  steps?: Step[];
  timestamp: Date;
};

type ChatContextType = {
  messages: ChatMessage[];
  addMessage: (m: ChatMessage) => void;
  updateLastMessage: (updater: (prev: ChatMessage) => ChatMessage) => void;
  getConversationText: () => string;
  clearMessages: () => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load messages on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/sandbox/messages')
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(data => {
        if (cancelled) return;
        const msgs: ChatMessage[] = Array.isArray(data?.messages)
          ? data.messages.map((m: any) => ({
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            }))
          : [];
        setMessages(msgs);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  // Debounced save — only fires 1s after messages stop changing, and only when not streaming
  useEffect(() => {
    if (!loaded) return;

    const isStreaming = messages.some(m => m.steps?.some(s => s.type === 'running'));
    if (isStreaming) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/sandbox/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
        }),
      }).catch(() => undefined);
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, loaded]);

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages(prev => [...prev, m]);
  }, []);

  // Update the last message in the list — used for streaming
  const updateLastMessage = useCallback((updater: (prev: ChatMessage) => ChatMessage) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), updater(last)];
    });
  }, []);

  const getConversationText = useCallback(() => {
    return messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');
  }, [messages]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <ChatContext.Provider value={{ messages, addMessage, updateLastMessage, getConversationText, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}