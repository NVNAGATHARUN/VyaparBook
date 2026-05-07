import { useState } from 'react'
import { detectIntent } from '../../services/agentBrain'
import { executeQuery } from '../../services/queryEngine'

export default function QueryBar({ userId, onResult }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQuery = async () => {
    if (!query.trim() || loading) return
    setLoading(true)

    try {
      const intent = await detectIntent(query)
      const result = await executeQuery(intent, userId, null)
      onResult(result)
      setQuery('')
    } catch (err) {
      console.error('Query failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 mb-4">
      <div className="
        flex items-center gap-2
        bg-white border-2 border-gray-200
        rounded-2xl px-4 py-3
        focus-within:border-green-500
        shadow-sm transition-all
      ">
        <span className="text-xl">🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuery()}
          placeholder="Anything ask cheyyandi..."
          className="
            flex-1 outline-none text-gray-700
            text-base bg-transparent
          "
        />
        <button
          onClick={handleQuery}
          disabled={!query.trim() || loading}
          className="
            bg-green-600 text-white
            rounded-xl px-3 py-1 text-sm
            font-medium disabled:opacity-50
          "
        >
          {loading ? '⏳' : 'Ask'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 px-1">
        Try: "Ravi pending?" or "Today business?"
      </p>
    </div>
  )
}
