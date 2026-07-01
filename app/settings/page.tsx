'use client';
import { useState, useEffect } from 'react';
import { Moon, Sun, LogOut, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') setDarkMode(false);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    console.log('data-theme set to:', document.documentElement.getAttribute('data-theme'));
    console.log('body bg:', getComputedStyle(document.body).backgroundColor);
  };



// inside the component:
const router = useRouter();

const handleLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  router.push('/');
};

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center px-5 gap-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(100,160,255,0.1)', background: 'rgba(8,16,38,0.7)', backdropFilter: 'blur(8px)' }}>
        <Settings size={15} style={{ color: '#93c5fd' }} />
        <span className="text-sm font-medium" style={{ color: 'rgba(200,220,255,0.9)' }}>Settings</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-lg flex flex-col gap-3">

          {/* Appearance */}
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(12,24,58,0.6)', border: '1px solid rgba(70,120,220,0.15)' }}>
            <div className="text-[11px] uppercase tracking-wider mb-3"
              style={{ color: 'rgba(100,140,200,0.5)' }}>Appearance</div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode
                  ? <Moon size={16} style={{ color: '#93c5fd' }} />
                  : <Sun size={16} style={{ color: '#fcd34d' }} />}
                <div>
                  <div className="text-sm" style={{ color: 'rgba(190,215,255,0.85)' }}>
                    {darkMode ? 'Dark mode' : 'Light mode'}
                  </div>
                  <div className="text-[11px]" style={{ color: 'rgba(100,140,200,0.5)' }}>
                    {darkMode ? 'Easy on the eyes' : 'Bright and clean'}
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <button onClick={toggleTheme}
                className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
                style={{
                  background: darkMode ? 'rgba(37,99,235,0.5)' : 'rgba(100,140,200,0.2)',
                  border: `1px solid ${darkMode ? 'rgba(96,165,250,0.4)' : 'rgba(100,140,200,0.2)'}`,
                }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                  style={{
                    left: darkMode ? 'calc(100% - 22px)' : '2px',
                    background: darkMode ? '#93c5fd' : 'rgba(150,180,230,0.6)',
                  }} />
              </button>
            </div>
          </div>

          {/* Account */}
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(12,24,58,0.6)', border: '1px solid rgba(70,120,220,0.15)' }}>
            <div className="text-[11px] uppercase tracking-wider mb-3"
              style={{ color: 'rgba(100,140,200,0.5)' }}>Account</div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', color: '#fff' }}>
                  JD
                </div>
                <div>
                  <div className="text-sm" style={{ color: 'rgba(190,215,255,0.85)' }}>dev</div>
                  <div className="text-[11px]" style={{ color: 'rgba(100,140,200,0.5)' }}>local instance</div>
                </div>
              </div>

              <button onClick={handleLogout}
                className="flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'var(--logout-bg)',
                  border: '1px solid var(--logout-border)',
                  color: 'var(--logout-text)',
                  cursor: 'pointer',
                }}>
                <LogOut size={13} />
                Log out
              </button>
            </div>
          </div>

          {/* Version */}
          <div className="text-[11px] px-1" style={{ color: 'rgba(80,110,170,0.45)' }}>
            opensource.manager v0.1.0 — built with Next.js, React, and a lot of ❤️
          </div>

        </div>
      </div>
    </div>
  );
}