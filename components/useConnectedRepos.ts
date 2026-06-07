'use client';

import { useCallback, useEffect, useState } from 'react';

export type ConnectedRepo = {
  owner: string;
  name: string;
  fullName: string;
};

const CHANGE_EVENT = 'connected-github-repos-changed';

export function useConnectedRepos() {
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/repos');
      if (!response.ok) {
        setRepos([]);
        return;
      }
      const data = await response.json();
      setRepos(Array.isArray(data.repos) ? data.repos : []);
    } catch {
      setRepos([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, [refresh]);

  const addRepo = useCallback(async (input: string) => {
    const response = await fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: input }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error || 'Unable to connect repo.' };
    }

    await refresh();
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    return { ok: true, repo: data.repo };
  }, [refresh]);

  const removeRepo = useCallback(async (fullName: string) => {
    await fetch(`/api/repos?fullName=${encodeURIComponent(fullName)}`, { method: 'DELETE' });
    await refresh();
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }, []);

  return { repos, addRepo, removeRepo, refresh };
}
