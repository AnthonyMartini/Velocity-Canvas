import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PLANS } from './constants';
import { formatActivityDate, formatActivityTime } from './helpers';
import { useAppShell } from '@/features/app/AppShellProvider';

interface PlansPageProps {
  user: any;
}

function CheckIcon({ faded = false }: { faded?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 ${faded ? 'text-accent/30' : 'text-accent'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PlansPage({ user }: PlansPageProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'success' | 'cancelled' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [plan] = PLANS;

  const { refreshCredits } = useAppShell();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutStatus('success');
      void refreshCredits();
    } else if (params.get('checkout') === 'cancelled') {
      setCheckoutStatus('cancelled');
    }
  }, [refreshCredits]);

  const handleCheckout = async () => {
    if (!user || submittingCheckout) return;
    setSubmittingCheckout(true);
    setCheckoutError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
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
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout session');
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned.');
      }
    } catch (e: any) {
      console.error("Error creating checkout session:", e);
      setCheckoutError(e.message || 'Payment processing is temporarily unavailable.');
      setCheckoutStatus('error');
    } finally {
      setSubmittingCheckout(false);
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
      {checkoutStatus === 'success' && (
        <div className="max-w-4xl mx-auto mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 text-sm flex items-center gap-3 animate-fade-in shadow-xl shadow-emerald-500/5">
          <svg className="w-5 h-5 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53-2.03-2.03a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.14-.1l3.75-5.25Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-bold">Subscription Payment Successful!</p>
            <p className="text-xs text-emerald-300/80">Your monthly Pro credit bundle of 500 credits has been added to your balance.</p>
          </div>
        </div>
      )}
      {checkoutStatus === 'cancelled' && (
        <div className="max-w-4xl mx-auto mb-8 bg-white/5 border border-white/10 rounded-2xl p-4 text-subtext text-sm flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 shrink-0 text-subtext/60" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-bold">Checkout Cancelled</p>
            <p className="text-xs text-subtext/80">No charges were made. You can try upgrading again whenever you are ready.</p>
          </div>
        </div>
      )}
      {checkoutStatus === 'error' && (
        <div className="max-w-4xl mx-auto mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-300 text-sm flex items-center gap-3 animate-fade-in shadow-xl shadow-red-500/5">
          <svg className="w-5 h-5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-bold">Checkout Error</p>
            <p className="text-xs text-red-300/80">{checkoutError}</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-16 animate-fade-in px-4 gap-8">
        <div className="text-center md:text-left">
          <div>
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
              Pricing for <span className="text-accent">Early Access</span>
            </h2>
            <p className="text-subtext text-lg max-w-xl">
              Upgrade to the Pro plan to refill your credits instantly and access advanced AI layout generation.
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
            {submittingCheckout ? "Connecting to Stripe..." : "Upgrade Available"}
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
                  Get full access to Canvas Chat, styling tweaks, and code generation with 500 premium credits refilled every month. Cancel anytime.
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
              
              <button
                onClick={handleCheckout}
                disabled={submittingCheckout}
                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submittingCheckout ? "Redirecting..." : "Subscribe — $10/mo"}
              </button>
              
              <p className="text-xs text-subtext/60 mt-4 leading-relaxed">
                Secured by Stripe. Cancel directly from your billing portal at any time. Credits reset each month.
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
          By subscribing, you agree to our <Link href="/terms" className="underline hover:text-white transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-white transition-colors">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
