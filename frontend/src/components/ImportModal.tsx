import { useRef, useState } from "react";
import { api } from "../api/client";

interface Props {
  onImported: (added: string[]) => void;
  onClose: () => void;
}

export default function ImportModal({ onImported, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: string[]; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.importCsv(file);
      setResult(r);
      onImported(r.added);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          CSV must have a <code className="bg-slate-100 px-1 rounded">ticker</code> column.
          Optional <code className="bg-slate-100 px-1 rounded">notes</code> column supported.
        </p>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <p className="text-sm text-slate-500">
            {loading ? "Uploading…" : "Drop CSV here or click to browse"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {result && (
          <div className="mt-3 text-sm">
            <p className="text-emerald-700">Added: {result.added.join(", ") || "none"}</p>
            {result.skipped.length > 0 && (
              <p className="text-slate-500">Already in watchlist: {result.skipped.join(", ")}</p>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            {result ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
