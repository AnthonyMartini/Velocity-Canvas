import { createFromSpec } from '../RendererPage/helpers'



/**
 * Calls the /api/generate endpoint and returns a shaped component tree.
 */
export async function fetchComponents(prompt, user) {
  const idToken = await user.getIdToken()
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      prompt: prompt.trim(),
    }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error || `Server error: ${response.status}`)
  }

  const data = await response.json()
  
  // Adapter: Convert { RootNodes: [ { Name, Control, Properties, Children } ] }
  // to [ { id, type, name, children, ...props } ]
  if (!data.json_data || !data.json_data.RootNodes || data.json_data.RootNodes.length === 0) {
    throw new Error("No components were generated. The AI may not have understood your request. Please try rephrasing.")
  }

  const adaptNode = (node: any) => {
    // Extract type from "Label@2.5.1" -> "Label"
    const type = node.Control.split('@')[0].split('/').pop() || 'Label'
    
    const props = { ...(node.Properties || {}), ...(node.Properties.AdditionalProps || {}) }
    delete props.AdditionalProps

    const children = (node.Children || []).map(adaptNode)

    // Use createFromSpec to get default properties and unique IDs
    return createFromSpec({
      type,
      ...props,
      name: node.Name,
      children
    })
  }

  const tree = (data.json_data.RootNodes || []).map(adaptNode).filter(Boolean)
  return { tree, yaml: data.yaml_code }
}
