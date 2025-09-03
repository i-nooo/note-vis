import { useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onClear?: () => void
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder,
}: Props) {
  const [q, setQ] = useState(value)
  useEffect(() => setQ(value), [value])

  return (
    <div className="flex gap-2 w-full h-9 bg-white">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          onChange(e.target.value)
        }}
        placeholder={placeholder ?? '노트 제목, id, 태그 검색'}
        className="flex-1 px-2 rounded-lg border border-gray-200 text-sm"
      />
      {q && (
        <button
          onClick={() => {
            setQ('')
            onChange('')
            onClear?.()
          }}
          className="px-2 rounded-lg border border-gray-200"
        >
          Clear
        </button>
      )}
    </div>
  )
}
