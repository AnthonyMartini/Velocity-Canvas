import React, { useState, useEffect } from 'react';
import CoverageDashboard from './CoverageDashboard';
import { PRICING } from './constants';
import {
  formatK,
  getCachedTokens,
  getInputTokens,
  getOutputTokens,
  getThoughtsTokens,
  getTotalTokens,
} from './helpers';

interface AdminPageProps {
  user: any;
}

export default function AdminPage({ user }: AdminPageProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('today');
  const [selectedModel, setSelectedModel] = useState('all');
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<'usage' | 'coverage'>('usage');

  const fetchUsage = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/usage?timeframe=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch usage');
      } else if (data.usageLogs) {
        setLogs(data.usageLogs);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [timeframe, user]);

  const filteredLogs = selectedModel === 'all' ? logs : logs.filter(l => l.modelName === selectedModel);

  let totalInput = 0;
  let totalOutput = 0;
  let totalCached = 0;
  let totalRequests = filteredLogs.length;
  let totalCost = 0;
  let totalCacheSavings = 0;

  filteredLogs.forEach(log => {
    const inputTokens = getInputTokens(log);
    const outputTokens = getOutputTokens(log);
    const cachedTokens = getCachedTokens(log);
    const modelPrice = PRICING[log.modelName] || { input: 0, output: 0, cachedInput: 0 };
    const nonCachedInput = inputTokens - cachedTokens;

    totalInput += inputTokens;
    totalOutput += outputTokens;
    totalCached += cachedTokens;
    totalCost += (nonCachedInput / 1_000_000) * modelPrice.input;
    totalCost += (cachedTokens / 1_000_000) * modelPrice.cachedInput;
    totalCost += (outputTokens / 1_000_000) * modelPrice.output;
    totalCacheSavings += (cachedTokens / 1_000_000) * (modelPrice.input - modelPrice.cachedInput);
  });

  return (
    <div className="flex-1 bg-base min-h-full py-12 px-6 relative overflow-y-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 animate-fade-in px-4 gap-8">
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-black text-text mb-2 tracking-tight">
            Admin <span className="text-accent">Dashboard</span>
          </h2>
          <p className="text-subtext text-lg max-w-xl">
            {activeView === 'usage'
              ? 'Monitor vertex AI API usage and estimated costs.'
              : 'Compare official Power Apps canvas coverage against what Velocity Canvas currently implements.'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 bg-surface/50 border border-overlay/40 rounded-xl p-1 shrink-0">
            {[
              { id: 'usage', label: 'Usage' },
              { id: 'coverage', label: 'Coverage' }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as 'usage' | 'coverage')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                  activeView === view.id
                    ? 'bg-accent text-base shadow-md shadow-accent/30'
                    : 'text-subtext hover:text-text hover:bg-overlay/35'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {activeView === 'usage' && (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-surface/50 border border-overlay/40 rounded-xl px-4 py-2 text-xs font-bold text-text transition-all cursor-pointer outline-none focus:border-accent appearance-none"
                >
                  <option value="all">All Models</option>
                  {Object.keys(PRICING).map(modelKey => (
                    <option key={modelKey} value={modelKey}>{modelKey}</option>
                  ))}
                </select>
                {selectedModel !== 'all' && PRICING[selectedModel] && (
                  <div className="bg-surface/50 border border-overlay/40 rounded-xl px-3 py-2 text-[10px] text-subtext flex items-center gap-2 shadow-sm">
                    <span>In: <b className="text-text">${PRICING[selectedModel].input}</b><span className="text-subtext/50">/1M</span></span>
                    <span>Out: <b className="text-text">${PRICING[selectedModel].output}</b><span className="text-subtext/50">/1M</span></span>
                    <span>Cached: <b className="text-emerald-400">${PRICING[selectedModel].cachedInput}</b><span className="text-subtext/50">/1M</span></span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 bg-surface/50 border border-overlay/40 rounded-xl p-1 shrink-0">
                {[
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: 'all', label: 'All Time' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTimeframe(f.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                      timeframe === f.id
                        ? 'bg-accent text-base shadow-md shadow-accent/30'
                        : 'text-subtext hover:text-text hover:bg-overlay/35'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto mb-8 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center font-bold">
          {error}
        </div>
      )}

      {activeView === 'usage' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto mb-12">
            <div className="bg-surface/40 border border-overlay/30 rounded-3xl p-6 flex flex-col items-center justify-center animate-slide-up" style={{ animationDelay: '0ms' }}>
              <div className="text-subtext text-[10px] uppercase font-black tracking-widest mb-2">Estimated Cost</div>
              <div className="text-accent text-4xl font-black">${totalCost.toFixed(4)}</div>
            </div>
            <div className="bg-surface/40 border border-overlay/30 rounded-3xl p-6 flex flex-col items-center justify-center animate-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="text-subtext text-[10px] uppercase font-black tracking-widest mb-2">Total Requests</div>
              <div className="text-text text-4xl font-black">{formatK(totalRequests)}</div>
            </div>
            <div className="bg-surface/40 border border-overlay/30 rounded-3xl p-6 flex flex-col items-center justify-center animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="text-subtext text-[10px] uppercase font-black tracking-widest mb-2">Input Tokens</div>
              <div className="text-text text-4xl font-black">{formatK(totalInput)}</div>
            </div>
            <div className="bg-surface/40 border border-overlay/30 rounded-3xl p-6 flex flex-col items-center justify-center animate-slide-up" style={{ animationDelay: '150ms' }}>
              <div className="text-subtext text-[10px] uppercase font-black tracking-widest mb-2">Output Tokens</div>
              <div className="text-text text-4xl font-black">{formatK(totalOutput)}</div>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex flex-col items-center justify-center animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="text-emerald-400/80 text-[10px] uppercase font-black tracking-widest mb-1">Cache Savings</div>
              <div className="text-emerald-400 text-4xl font-black">${totalCacheSavings.toFixed(4)}</div>
              {totalCached > 0 && <div className="text-emerald-500/60 text-[10px] mt-1">{formatK(totalCached)} cached tokens</div>}
            </div>
          </div>

          <div className="max-w-6xl mx-auto bg-surface/40 border border-overlay/30 rounded-3xl overflow-hidden shadow-2xl animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface/60">
              <h3 className="text-lg font-bold text-text">Recent Requests</h3>
              <button onClick={fetchUsage} className="text-accent text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="py-20 text-center text-subtext/60 italic">No logs found for this timeframe.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-surface/80">
                    <tr>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40">Timestamp</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40">User ID</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40">Model</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40 text-right">In / Cached / Out</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40 text-right">Total Tokens</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-subtext/40 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const modelPrice = PRICING[log.modelName] || { input: 0, output: 0, cachedInput: 0 };
                      const inputTokens = getInputTokens(log);
                      const outputTokens = getOutputTokens(log);
                      const cachedTokens = getCachedTokens(log);
                      const thoughtsTokens = getThoughtsTokens(log);
                      const nonCachedInput = inputTokens - cachedTokens;
                      const rowCost =
                        ((nonCachedInput / 1_000_000) * modelPrice.input) +
                        ((cachedTokens / 1_000_000) * modelPrice.cachedInput) +
                        ((outputTokens / 1_000_000) * modelPrice.output);

                      return (
                        <tr key={log.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-text text-sm">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-subtext/60 text-[10px]">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-subtext text-xs font-mono max-w-[120px] truncate" title={log.uid}>
                              {log.uid}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-accent text-xs font-bold bg-accent/10 px-2 py-1 rounded inline-block">
                              {log.modelName}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-subtext text-xs">{inputTokens.toLocaleString()}</span>
                            {cachedTokens > 0 && (
                              <>
                                <span className="text-subtext/40 mx-1">/</span>
                                <span className="text-emerald-400 text-xs font-bold" title="Cached tokens">
                                  {cachedTokens.toLocaleString()} cached
                                </span>
                              </>
                            )}
                            <span className="text-subtext/40 mx-1">/</span>
                            <span className="text-subtext text-xs" title={thoughtsTokens > 0 ? `Includes ${thoughtsTokens.toLocaleString()} thoughts tokens` : undefined}>
                              {outputTokens.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-text font-black text-sm">
                            {getTotalTokens(log).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-accent font-black text-sm">
                              ${rowCost.toFixed(4)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <CoverageDashboard />
      )}
    </div>
  );
}
