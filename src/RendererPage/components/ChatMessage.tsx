import PropTypes from 'prop-types'

export default function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
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
  }).isRequired,
}
