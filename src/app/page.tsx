"use client";

import { useState, useEffect } from 'react';
import LandingPage from '@/LandingPage';
import RendererPage from '@/RendererPage';
import ComponentLibraryPage from '@/ComponentLibraryPage';
import PlansPage from '@/PlansPage';
import AdminPage from '@/AdminPage';
import logo from '@/assets/logo.png';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Image from 'next/image';

// ── Tab Icons ──────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.99 9a.75.75 0 11-1.06 1.06L20 13.43V20.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4H10v4a.75.75 0 01-.75.75H4.75a.75.75 0 01-.75-.75v-7.07l-.47.47a.75.75 0 11-1.06-1.06l8.99-9z" />
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

const AdminIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.097.078.16.208.16.336a7.158 7.158 0 0 0 0 1.954c0 .128-.063.258-.16.336l-.84.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.31.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.675-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.098-.078-.161-.208-.161-.336a7.158 7.158 0 0 0 0-1.954c0-.128.063-.258.16-.336l.84-.692a1.875 1.875 0 0 0 .432-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
  </svg>
);

const TABS = [
  { id: 'renderer', label: 'Home', Icon: HomeIcon },
  { id: 'library', label: 'Documentation', Icon: LibraryIcon },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('renderer');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [credits, setCredits] = useState<number | string | null>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchCredits = async (firebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/user/credits', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setCredits('Error');
        return;
      }
      if (data.credits !== undefined) {
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits('Error');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser) {
        fetchCredits(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch('/api/admin/check', {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setIsAdmin(data.isAdmin);
          }
        } catch (e) {
          console.error('Error fetching admin status:', e);
        }
      } else {
        setCredits(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleStart = (tabId = 'renderer', signedInUser = null) => {
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
        <div className="max-w-none px-6 py-3 flex items-center justify-between relative">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image 
              src={logo} 
              alt="Velocity Canvas Logo" 
              width={45}
              height={45}
              className="w-11 h-11" 
            />
            <div>
              <h1 className="text-text font-bold text-lg leading-tight tracking-tight">Velocity Canvas</h1>
              <p className="text-subtext text-xs leading-tight">Power Apps UI Generator</p>
            </div>
          </div>

          {/* Tab Navigation — absolutely centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/50 border border-overlay/40 rounded-xl p-1">
            {TABS.concat(isAdmin ? [{ id: 'admin', label: 'Admin', Icon: AdminIcon }] : []).map(({ id, label, Icon }) => (
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

            
            {credits !== null && (
              <div 
                onClick={() => setActiveTab('plans')}
                className={`flex items-center gap-2 border rounded-full px-3 py-1.5 shadow-sm transition-all duration-200 cursor-pointer group ${
                  activeTab === 'plans' 
                    ? 'bg-accent text-base border-accent ring-2 ring-accent/20' 
                    : 'bg-accent/10 border-accent/20 hover:bg-accent/20 hover:border-accent/30'
                }`}
              >
                <div className="flex flex-col items-center leading-none">
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
      <div className={`flex-1 flex flex-col min-h-0 ${activeTab !== 'renderer' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {/* RendererPage stays mounted to preserve activeProject state; hidden via CSS when not active */}
        <div className={activeTab === 'renderer' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
          <RendererPage
            user={user}
            onCreditDeduction={() => fetchCredits(user)}
            activeProject={activeProject}
            setActiveProject={setActiveProject}
          />
        </div>
        {activeTab === 'library' && <ComponentLibraryPage user={user} />}
        {activeTab === 'plans' && <PlansPage user={user} onRefreshCredits={() => fetchCredits(user)} />}
        {activeTab === 'admin' && <AdminPage user={user} />}


      </div>
    </div>
  );
}
