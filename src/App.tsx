import { useMemo, useState } from 'react'
import sample from './data/notes.json'
import Legend from './components/Legend'
import NetworkGraph from './components/NetworkGraph'
import SearchBar from './components/SearchBar'
import Header from './components/Header'
import type { GraphData, NoteNode } from './types'

function App() {
  const [query, setQuery] = useState('')
  const [data] = useState<GraphData>(sample as GraphData)

  const repoBase = 'https://github.com/<org>/<repo>/blob/main/notes/'

  const graphWithUrls = useMemo(() => {
    const nodes = data.nodes.map((n) =>
      n.url
        ? n
        : {
            ...n,
            url: n.id.startsWith('tag:') ? undefined : `${repoBase}${n.id}.md`,
          },
    )
    return { ...data, nodes }
  }, [data])

  const onNavigate = (n: NoteNode) => {
    if (n.url) window.open(n.url, '_blank', 'noopener')
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Header />
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Markdown Graph (Network)</h3>
        <Legend />
      </div>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="노트 제목, id, 태그 검색"
      />
      <div style={{ border: '1px solid #eee', borderRadius: 8 }}>
        <NetworkGraph
          data={graphWithUrls}
          query={query}
          onNavigate={onNavigate}
          height={640}
        />
      </div>
    </div>
  )
}

export default App
