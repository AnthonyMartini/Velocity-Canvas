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
