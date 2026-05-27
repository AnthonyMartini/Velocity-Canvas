import PropTypes from 'prop-types'
import Link from 'next/link'

function formatResponseDuration(responseMs) {
  if (typeof responseMs !== 'number' || Number.isNaN(responseMs) || responseMs < 0) return null
  if (responseMs < 1000) return `${Math.round(responseMs)} ms`
  const seconds = responseMs / 1000
  return seconds >= 10 ? `${seconds.toFixed(1)}s` : `${seconds.toFixed(2)}s`
}

function CreditsEmptyCard() {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[88%] rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed">
        <p className="font-semibold text-amber-300 mb-1.5">⚠️ You&apos;re out of credits</p>
        <p className="text-subtext/80 mb-2.5">
          Upgrade to Pro for 500 credits/month and keep building.
        </p>
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black transition-all hover:bg-amber-400 active:scale-95"
        >
          Upgrade — $10/mo
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M16.72 7.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 1 1-1.06-1.06l2.47-2.47H3a.75.75 0 0 1 0-1.5h16.19l-2.47-2.47a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

export default function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  const responseDuration = !isUser ? formatResponseDuration(msg.responseMs) : null

  if (!isUser && msg.content === '__CREDITS_EMPTY__') {
    return <CreditsEmptyCard />
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-2 ${isUser ? 'max-w-[80%]' : 'max-w-[88%]'}`}>
        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed
          ${isUser ? 'bg-accent/20 text-text border border-accent/20' : 'bg-surface border border-overlay/40 text-text'}`}>
          {msg.image && (
            <div className="mb-2 w-full flex justify-end">
              <img src={msg.image} alt="User upload" className="max-h-32 rounded-lg border border-overlay/30 object-contain bg-base/50 shadow-sm" />
            </div>
          )}
          {msg.content}
          <div className="flex gap-2 mt-1">
            {msg.added > 0 && (
              <span className="text-[10px] text-green/80 font-medium tracking-wide">
                +{msg.added} added
              </span>
            )}
            {msg.mods > 0 && (
              <span className="text-[10px] text-blue-400 font-medium tracking-wide">
                ~{msg.mods} modified
              </span>
            )}
          </div>
          {msg.usage && (
            <div className="flex flex-col gap-0.5 mt-1 opacity-50 text-[9px] font-mono tracking-tight uppercase">
              <div className="flex gap-2">
                <span>In: {msg.usage.prompt_token_count}</span>
                <span className="opacity-30">|</span>
                <span>Out: {msg.usage.candidates_token_count}</span>
              </div>
              <div className="text-accent/80 font-bold">
                Cost: ${((msg.usage.prompt_token_count * 0.25 / 1000000) + (msg.usage.candidates_token_count * 1.50 / 1000000)).toFixed(5)}
              </div>
            </div>
          )}
        </div>
        {responseDuration && (
          <div className="pt-2 text-[10px] text-subtext/55 tracking-wide whitespace-nowrap">
            {responseDuration}
          </div>
        )}
      </div>
    </div>
  )
}

ChatMessage.propTypes = {
  msg: PropTypes.shape({
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    added: PropTypes.number,
    mods: PropTypes.number,
    image: PropTypes.string,
    responseMs: PropTypes.number,
  }).isRequired,
}

