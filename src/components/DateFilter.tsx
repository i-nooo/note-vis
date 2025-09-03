interface DateFilterProps {
  dateFilter: { start?: string; end?: string }
  onDateChange: (filter: { start?: string; end?: string }) => void
}

export default function DateFilter({
  dateFilter,
  onDateChange,
}: DateFilterProps) {
  const updateDateFilter = (key: 'start' | 'end', value: string) => {
    onDateChange({
      ...dateFilter,
      [key]: value || undefined,
    })
  }

  const clearDateFilter = () => onDateChange({})

  return (
    <div>
      <div className="font-medium  text-gray-800 text-sm">
        Date{(dateFilter.start || dateFilter.end) && '(활성)'}
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">시작일:</label>
          <input
            type="date"
            value={dateFilter.start || ''}
            onChange={(e) => updateDateFilter('start', e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">종료일:</label>
          <input
            type="date"
            value={dateFilter.end || ''}
            onChange={(e) => updateDateFilter('end', e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
          />
        </div>
        {(dateFilter.start || dateFilter.end) && (
          <button
            onClick={clearDateFilter}
            className="px-2 py-1 text-xs border border-red-500 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            날짜 초기화
          </button>
        )}
      </div>
    </div>
  )
}
