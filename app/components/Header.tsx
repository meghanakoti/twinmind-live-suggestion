type Props = {
  isRecording: boolean;
  onToggleRecording: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
  secondsUntilRefresh: number;
  isRefreshDisabled?: boolean; // ← added
};

export default function Header({
  isRecording,
  onToggleRecording,
  onRefresh,
  onExport,
  onOpenSettings,
  secondsUntilRefresh,
  isRefreshDisabled, // ← added
}: Props) {
  return (
    <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleRecording}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            isRecording
              ? "bg-red-600 hover:bg-red-500"
              : "bg-green-600 hover:bg-green-500"
          }`}
        >
          {isRecording ? "Stop Mic" : "Start Mic"}
        </button>
      </div>

      <h1 className="font-semibold">TwinMind Copilot</h1>

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 mr-1">
          Refreshes in {secondsUntilRefresh}s
        </span>
        <button
          onClick={onRefresh}
          disabled={isRefreshDisabled} // ← added
          className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg text-sm transition"
        >
          Refresh
        </button>
        <button
          onClick={onExport}
          className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm text-zinc-300 transition"
        >
          Export
        </button>
        <button
          onClick={onOpenSettings}
          className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-3 py-2 rounded-lg text-sm text-zinc-300 transition"
        >
          Settings
        </button>
      </div>
    </header>
  );
}