import { useNavigate } from '@tanstack/react-router'
import type { NoteNode } from '@/types'

interface Props {
  breadcrumbPath: Array<NoteNode>
  onNodeClick: (id: string) => void
}

export default function NodeHeader({ breadcrumbPath, onNodeClick }: Props) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <button
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={() => navigate({ to: '/' })}
        >
          🥹
        </button>

        {breadcrumbPath.length > 0 && (
          <nav className="flex items-center text-sm">
            {breadcrumbPath.map((node, index) => (
              <span key={node.id} className="flex items-center">
                {index > 0 && <span className="text-gray-400 mx-2">/</span>}
                {index === breadcrumbPath.length - 1 ? (
                  <span className="font-semibold text-gray-900">
                    {node.title}
                  </span>
                ) : (
                  <button
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={() => onNodeClick(node.id)}
                  >
                    {node.title}
                  </button>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
