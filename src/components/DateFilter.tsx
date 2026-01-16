interface DateFilterProps {
  dateFilter: { start?: string; end?: string };
  onDateChange: (filter: { start?: string; end?: string }) => void;
  dateRange: { min: string; max: string };
  filteredCount: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function dateToTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

function timestampToDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DateFilter({
  dateFilter,
  onDateChange,
  dateRange,
  filteredCount,
}: DateFilterProps) {
  const minTimestamp = dateToTimestamp(dateRange.min);
  const maxTimestamp = dateToTimestamp(dateRange.max);

  const startValue = dateFilter.start
    ? dateToTimestamp(dateFilter.start)
    : minTimestamp;
  const endValue = dateFilter.end
    ? dateToTimestamp(dateFilter.end)
    : maxTimestamp;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTimestamp = Number(e.target.value);
    // 종료일을 넘지 않도록
    const clampedStart = Math.min(newStartTimestamp, endValue);
    onDateChange({
      ...dateFilter,
      start: timestampToDate(clampedStart),
      end: dateFilter.end || dateRange.max,
    });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndTimestamp = Number(e.target.value);
    // 시작일보다 작아지지 않도록
    const clampedEnd = Math.max(newEndTimestamp, startValue);
    onDateChange({
      ...dateFilter,
      start: dateFilter.start || dateRange.min,
      end: timestampToDate(clampedEnd),
    });
  };

  // 슬라이더 채워진 영역 계산
  const range = maxTimestamp - minTimestamp;
  const leftPercent =
    range > 0 ? ((startValue - minTimestamp) / range) * 100 : 0;
  const rightPercent =
    range > 0 ? ((endValue - minTimestamp) / range) * 100 : 100;

  return (
    <div className="w-80">
      <div className="mb-2">
        <span className="font-medium text-gray-800 text-sm">Date</span>
      </div>

      <div className="relative h-6 mb-1">
        {/* 슬라이더 트랙 */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-300 rounded" />

        {/* 선택된 범위 표시 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded"
          style={{
            left: `${leftPercent}%`,
            width: `${rightPercent - leftPercent}%`,
          }}
        />

        {/* 시작 슬라이더 */}
        <input
          type="range"
          min={minTimestamp}
          max={maxTimestamp}
          value={startValue}
          onChange={handleStartChange}
          className="date-range-slider absolute w-full top-0 h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
        />

        {/* 종료 슬라이더 */}
        <input
          type="range"
          min={minTimestamp}
          max={maxTimestamp}
          value={endValue}
          onChange={handleEndChange}
          className="date-range-slider absolute w-full top-0 h-6 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
        />
      </div>

      {/* 날짜 표시 */}
      <div className="flex justify-between text-xs text-gray-600">
        <span>{formatDate(timestampToDate(startValue))}</span>
        <span>{formatDate(timestampToDate(endValue))}</span>
      </div>

      {/* 필터링된 노트 수 */}
      <div className="mt-2 text-xs text-gray-500">{filteredCount}개 노트</div>
    </div>
  );
}
