import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
  syncing: boolean;
  error: string | null;
}

export default function RefreshButton({
  onRefresh,
  syncing,
  error,
}: RefreshButtonProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={onRefresh}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm text-gray-700"
        title="노션에서 노트 새로고침"
      >
        <RefreshCw
          size={16}
          className={syncing ? "animate-spin" : ""}
        />
        {syncing ? "동기화 중..." : "노트 새로고침"}
      </button>
      {error && (
        <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1 max-w-[200px]">
          {error}
        </div>
      )}
    </div>
  );
}
