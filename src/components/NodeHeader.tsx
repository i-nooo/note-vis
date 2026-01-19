import { useNavigate } from "@tanstack/react-router";

export default function NodeHeader() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <button
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={() => navigate({ to: "/" })}
        >
          🥹
        </button>
      </div>
    </div>
  );
}
