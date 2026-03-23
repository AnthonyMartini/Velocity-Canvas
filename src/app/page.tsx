"use client";

import { useState, useEffect } from 'react';
import LandingPage from '@/LandingPage';
import GeneratorPage from '@/GeneratorPage';
import RendererPage from '@/RendererPage';
import ComponentLibraryPage from '@/ComponentLibraryPage';
import PlansPage from '@/PlansPage';
import logo from '@/assets/logo.png';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Image from 'next/image';

// ── Tab Icons ──────────────────────────────────────────────────────────────────
const GeneratorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527ZM16.72 6.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 0 1 0-1.06Zm-9.44 0a.75.75 0 0 1 0 1.06L2.56 12l4.72 4.72a.75.75 0 0 1-1.06 1.06L.97 12.53a.75.75 0 0 1 0-1.06L6.22 6.22a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
  </svg>
);

const RendererIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
    <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
    <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
    <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
  </svg>
);

const LibraryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c1.68 0 3.282.515 4.75 1.407A.75.75 0 0 0 24 19.462V5.212a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
  </svg>
);

const PlansIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
    <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.91 2.91 0 0 1 2.332-1.39ZM12 6.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5Zm4.5-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
  </svg>
);

const TABS = [
  { id: 'generator', label: 'Component Generator', Icon: GeneratorIcon },
  { id: 'renderer', label: 'Canvas Editor', Icon: RendererIcon },
  { id: 'library', label: 'Documentation', Icon: LibraryIcon },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('generator');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  const fetchCredits = async (firebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/user/credits', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (data.credits !== undefined) {
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser) {
        fetchCredits(firebaseUser);
      } else {
        setCredits(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleStart = (tabId = 'generator', signedInUser = null) => {
    setActiveTab(tabId);
    if (signedInUser) setUser(signedInUser);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-base flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage onStart={handleStart} />;
  }

  return (
    <div className="h-screen bg-base flex flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-surface/60 backdrop-blur-sm sticky top-0 z-10 bg-base/90 shrink-0">
        <div className="max-w-none px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image 
              src={logo} 
              alt="Velocity Canvas Logo" 
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-accent/30" 
            />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Velocity Canvas</h1>
              <p className="text-subtext text-xs leading-tight">Power Apps UI Generator</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-surface/50 border border-overlay/40 rounded-xl p-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  activeTab === id
                    ? 'bg-accent text-base shadow-md shadow-accent/30'
                    : 'text-subtext hover:text-text hover:bg-overlay/40'
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>

          {/* Status + User */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface/50 border border-overlay/40 rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" style={{ animationDuration: '3s' }} />
              <span className="text-subtext text-xs font-medium">{process.env.NEXT_PUBLIC_GEMINI_MODEL_DISPLAY || 'Gemini 3.1 Flash'}</span>
            </div>
            
            {credits !== null && (
              <div 
                onClick={() => setActiveTab('plans')}
                className={`flex items-center gap-2 border rounded-full px-3 py-1.5 shadow-sm transition-all duration-200 cursor-pointer group ${
                  activeTab === 'plans' 
                    ? 'bg-accent text-base border-accent ring-2 ring-accent/20' 
                    : 'bg-accent/10 border-accent/20 hover:bg-accent/20 hover:border-accent/30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 ${activeTab === 'plans' ? 'text-base' : 'text-accent animate-pulse-slow'}`}>
                  <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 4.343a.75.75 0 0 1 0 1.06l-1.061 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.062 0ZM5.404 14.596a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.061-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM15.657 15.657a.75.75 0 0 1-1.06 0l-1.061-1.06a.75.75 0 1 1 1.06-1.06l1.061 1.06a.75.75 0 0 1 0 1.06ZM5.404 5.404a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.061 1.06a.75.75 0 0 1 0 1.06Z" />
                </svg>
                <div className="flex flex-col items-start leading-none">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${activeTab === 'plans' ? 'text-base/70' : 'text-accent/70'}`}>Credits</span>
                  <span className={`text-sm font-black ${activeTab === 'plans' ? 'text-base' : 'text-text'}`}>{credits}</span>
                </div>
              </div>
            )}
            {user && (
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName ?? 'User'} 
                    className="w-7 h-7 rounded-full" 
                    referrerPolicy="no-referrer" 
                  />
                )}
                <button
                  onClick={handleSignOut}
                  className="text-subtext text-xs hover:text-text transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${activeTab === 'renderer' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {activeTab === 'generator' && <GeneratorPage user={user} onCreditDeduction={() => fetchCredits(user)} />}
        {activeTab === 'renderer' && <RendererPage user={user} onCreditDeduction={() => fetchCredits(user)} />}
        {activeTab === 'library' && <ComponentLibraryPage user={user} />}
        {activeTab === 'plans' && <PlansPage user={user} />}

        {/* ── Footer (Generator only) ──────────────────────────────────────────── */}
        {activeTab === 'generator' && (
          <footer className="mt-auto border-t border-surface/60 py-5 px-6 shrink-0">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-subtext/40">
              <span>Velocity Canvas — Power Apps YAML Generator</span>
              <span>Powered by {process.env.NEXT_PUBLIC_GEMINI_MODEL_DISPLAY || 'Gemini 3.1 Flash'} · pa.yaml v3.0</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
