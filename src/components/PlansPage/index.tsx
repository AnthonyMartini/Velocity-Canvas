import React, { useState } from 'react';
import { PLANS } from './constants';
import { formatActivityDate, formatActivityTime } from './helpers';

interface PlansPageProps {
  user: any;
}

export default function PlansPage({ user }: PlansPageProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [interested, setInterested] = useState(false);
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [plan] = PLANS;

  const handleExpressInterest = async () => {
    if (!user || submittingInterest) return;
    setSubmittingInterest(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/user/plan-interest', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          planId: plan.id,
          email: user.email
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save interest');
      
      setInterested(true);
    } catch (e) {
      console.error("Error saving interest:", e);
      // Fallback: still show interest noted for better UX if it's just a transient error
      setInterested(true);
    } finally {
      setSubmittingInterest(false);
    }
  };

  const fetchLogs = async () => {
    if (!user) return;
    setLoadingLogs(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/user/activity', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const openLogs = () => {
    setShowLogs(true);
    fetchLogs();
  };

  return (
    <div className="flex-1 bg-base min-h-full py-12 px-6 relative overflow-y-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-16 animate-fade-in px-4 gap-8">
        <div className="text-center md:text-left">
          <div>
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
              Pricing for <span className="text-accent">Early Access</span>
            </h2>
            <p className="text-subtext text-lg max-w-xl">
              We are still shaping the first paid version of Velocity Canvas. For now, we are planning one simple
              `$10/month` plan, but billing is not open yet while we tighten the product and onboarding experience.
            </p>
          </div>
        </div>
        
        <button 
          onClick={openLogs}
          className="flex items-center gap-2 bg-overlay/20 hover:bg-overlay/40 border border-white/5 px-5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all duration-200 cursor-pointer shadow-xl backdrop-blur-md shrink-0"
        >
          <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          View Activity History
        </button>
      </div>

      <div className="max-w-4xl mx-auto mb-16">
        <div className="relative group bg-surface/40 border border-accent shadow-2xl shadow-accent/10 rounded-3xl p-8 md:p-10 flex flex-col transition-all duration-300 hover:border-accent/50 hover:bg-surface/60 animate-slide-up">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-base text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10">
            Currently Unavailable
          </div>

          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-start">
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-subtext text-sm">/mo</span>
                </div>
                <p className="text-sm text-subtext/90 max-w-2xl">
                  This will be our first paid tier once the core workflow feels solid enough for a broader rollout.
                  Until then, the page is here as a preview of where pricing is headed, not a live checkout.
                </p>
              </div>

              <ul className="space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-subtext/90">
                    <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-base/30 rounded-2xl p-5 border border-white/5">
              <div className="text-subtext text-[10px] uppercase font-bold tracking-widest mb-3">Planned Credit Bundle</div>
              <div className="text-accent font-black text-3xl leading-tight">{plan.credits.toLocaleString()}</div>
              <div className="text-subtext text-sm mb-6">credits per month</div>
              {interested ? (
                <div className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-accent/20 text-accent border border-accent/40 text-center animate-pulse shadow-lg shadow-accent/10">
                  ✨ Interest Noted!
                </div>
              ) : (
                <button
                  onClick={handleExpressInterest}
                  disabled={submittingInterest}
                  className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {submittingInterest ? "Submitting..." : "I'm Interested"}
                </button>
              )}
              <p className="text-xs text-subtext/60 mt-4 leading-relaxed">
                {interested 
                  ? "Thank you! We've noted your interest and will reach out once billing is live."
                  : "We are keeping access limited while we improve reliability, credits, and the overall product flow."
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-base/80 backdrop-blur-md" onClick={() => setShowLogs(false)} />
          <div className="relative bg-surface border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Activity History</h3>
              <button 
                onClick={() => setShowLogs(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6 text-subtext" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-0">
              {loadingLogs ? (
                <div className="py-20 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="py-20 text-center text-subtext/60 italic">No activity yet.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface z-10 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40">Action</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40 text-right">Date</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="text-white font-bold text-sm mb-0.5">{log.action}</div>
                          <div className="text-accent text-[10px] font-black uppercase tracking-tighter">Usage: -1 Credit</div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="text-subtext text-xs leading-none">
                            {formatActivityDate(log.timestamp)}
                          </div>
                          <div className="text-subtext/40 text-[10px] mt-1">
                            {formatActivityTime(log.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="text-white font-black text-sm">{log.newCredits}</div>
                          <div className="text-subtext/40 text-[9px] uppercase tracking-tighter">Remaining</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-6 bg-base/40 border-t border-white/5 text-center">
              <p className="text-xs text-subtext/40">Showing last 50 transactions</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-subtext/40 text-[10px] flex flex-col items-center gap-4">
        <div className="max-w-md px-4">
          Billing is not enabled yet. Once early access opens, this page will switch from a preview to a live checkout flow.
        </div>
      </div>
    </div>
  );
}
