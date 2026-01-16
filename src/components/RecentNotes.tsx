import { useState } from 'react'
import type { NoteNode } from '../types'

interface RecentNotesProps {
  notes: Array<NoteNode & { sortDate: string }>
}

export default function RecentNotes({ notes }: RecentNotesProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleNoteClick = (noteId: string) => {
    window.location.href = `/node/${noteId}`
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <h3 className="m-0 text-base font-semibold">
          최신 글 {notes.length > 0 && `(${notes.length})`}
        </h3>
        <span className="text-gray-500 transition-transform duration-200"
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4">
          {notes.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              날짜가 있는 노트가 없습니다
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleNoteClick(note.id)}
                  className="p-3 border border-gray-200 rounded-md cursor-pointer transition-all bg-gray-50 hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="font-medium mb-1 text-sm text-gray-800">
                    {note.title}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {note.dateUpdated ? (
                      <span>{note.dateUpdated}</span>
                    ) : (
                      <span>{note.dateCreated}</span>
                    )}
                  </div>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {note.tags.map((tag) => (
                        <span key={tag} className="text-xs text-gray-600 px-1 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
