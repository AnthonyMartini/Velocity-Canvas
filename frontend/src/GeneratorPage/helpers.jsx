import { createFromSpec } from '../RendererPage/index.jsx'



/**
 * Calls the /renderer-chat endpoint and returns a shaped component tree.
 * Throws on network or server errors so the caller can handle state.
 *
 * @param {string} prompt   - User's plain-English description
 * @returns {Array}         - Array of component tree nodes
 */
export async function fetchComponents(prompt) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/renderer-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: prompt.trim(),
      canvas_width: 1366,
      canvas_height: 768,
      canvas_components: [],
    }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.detail || `Server error: ${response.status}`)
  }

  const data = await response.json()
  return (data.components_to_add || []).map(createFromSpec).filter(Boolean)
}
