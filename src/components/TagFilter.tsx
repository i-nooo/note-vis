import { useState } from 'react'

interface TagFilterProps {
  allTags: Array<string>
  selectedTags: Set<string>
  onToggleTag: (tag: string) => void
  onClearAll: () => void
}

export default function TagFilter({
  allTags,
  selectedTags,
  onToggleTag,
  onClearAll,
}: TagFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const displayTags = isExpanded ? allTags : allTags.slice(0, 10)

  return (
    <div className="">
      <div className="font-medium mb-2 text-gray-800 flex items-center justify-between">
        <span className="text-sm">
          Tags {selectedTags.size > 0 && `(${selectedTags.size}개 선택)`}
        </span>
        {allTags.length > 10 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '접기' : `펼치기 (+${allTags.length - 10}개)`}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {displayTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`px-2 rounded-lg border border-gray-200 text-xs p-1 transition-colors ${
              selectedTags.has(tag)
                ? 'bg-blue-400 text-white'
                : 'bg-white text-gray-800 hover:border-blue-400 hover:text-blue-500'
            }`}
          >
            #{tag}
          </button>
        ))}
        {selectedTags.size > 0 && (
          <button
            onClick={onClearAll}
            className="px-2 rounded-lg border border-red-400 text-xs p-1 bg-red-400 text-white hover:bg-red-500"
          >
            전체 초기화
          </button>
        )}
      </div>
    </div>
  )
}
