import React, { useState } from 'react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$9',
    credits: 1000,
    features: ['1,000 AI Credits', 'Standard Generation Speed', 'Email Support'],
    color: 'emerald',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    credits: 5000,
    features: ['5,000 AI Credits', 'Priority Generation', 'Advanced Components', 'Priority Support'],
    color: 'accent',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    credits: 20000,
    features: ['20,000 AI Credits', 'Ultra-fast Generation', 'Custom Component Training', '24/7 Dedicated Support'],
    color: 'indigo',
    popular: false,
  },
];

interface PlansPageProps {
  user: any;
}

export default function PlansPage({ user, onRefreshCredits }: PlansPageProps & { onRefreshCredits?: () => void }) {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  const addDevCredits = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/user/credits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        if (onRefreshCredits) onRefreshCredits();
        alert('Added 100 dev credits!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 bg-base min-h-full py-12 px-6 relative overflow-y-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-16 animate-fade-in px-4 gap-8">
        <div className="text-center md:text-left flex items-start gap-4">
          <div>
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
              Supercharge Your <span className="text-accent">Workflow</span>
            </h2>
            <p className="text-subtext text-lg max-w-xl">
              Choose a plan that fits your needs. Get more credits to build complex apps.
            </p>
          </div>
          {/* Dev Button */}
          <button 
            onClick={addDevCredits}
            className="mt-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black text-red-500 uppercase tracking-widest transition-all cursor-pointer"
          >
            Dev: +100 Credits
          </button>
        </div>
        
        <button 
          onClick={openLogs}
          className="flex items-center gap-2 bg-overlay/20 hover:bg-overlay/40 border border-white/5 px-5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all duration-200 cursor-pointer shadow-xl backdrop-blur-md shrink-0"
        >
          <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          View Activity History
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
        {PLANS.map((plan) => (
          <div 
            key={plan.id}
            className={`relative group bg-surface/40 border ${plan.popular ? 'border-accent shadow-2xl shadow-accent/10 md:scale-105' : 'border-overlay/30'} rounded-3xl p-8 flex flex-col transition-all duration-300 hover:border-accent/50 hover:bg-surface/60 animate-slide-up`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-base text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{plan.price}</span>
                <span className="text-subtext text-sm">/mo</span>
              </div>
            </div>

            <div className="bg-base/30 rounded-2xl p-4 mb-8 border border-white/5">
              <div className="text-accent font-black text-2xl leading-tight">{plan.credits.toLocaleString()}</div>
              <div className="text-subtext text-[10px] uppercase font-bold tracking-widest">Credits per month</div>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-subtext/90">
                  <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 cursor-pointer ${
              plan.popular 
                ? 'bg-accent text-base shadow-lg shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
            }`}>
              Get {plan.name}
            </button>
          </div>
        ))}
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
                            {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-subtext/40 text-[10px] mt-1">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          Payments are handled securely via Stripe. Credits are applied instantly to your account upon successful transaction. Need a custom plan? Contact our sales team.
        </div>
        <div className="flex items-center gap-6 grayscale opacity-40 px-4 flex-wrap justify-center">
          <span className="font-bold tracking-widest uppercase">Stripe</span>
          <span className="font-bold tracking-widest uppercase">Visa</span>
          <span className="font-bold tracking-widest uppercase">Mastercard</span>
        </div>
      </div>
    </div>
  );
}
