"use client";
import { useRef, useState, useEffect } from "react";

type Zone = "main" | "upper1" | "upper2" | "lower" | "half" | "digit" | "final";

const ZONES: { key: Zone; label: string; example: string }[] = [
  { key: "main", label: "Main Consonant / Vowel", example: "क, ख, ग, अ, इ" },
  { key: "upper1", label: "Upper Modifier (Matra)", example: "े, ै, र्, ँ" },
  { key: "upper2", label: "Upper Matra Tier 2", example: "ो, ौ" },
  { key: "lower", label: "Lower Modifier (Matra)", example: "ु, ू, ्, ृ" },
  { key: "half", label: "Half-Form Consonant", example: "क्, ख्, च्" },
  { key: "digit", label: "Devanagari Digit", example: "०, १, २, ३" },
  { key: "final", label: "Full Stop / Punctuation", example: "।, ?" },
];

export default function Scratchpad({
  currentChar,
  onSubmit,
  onClose,
}: {
  currentChar?: string;
  onSubmit: (character: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [zone, setZone] = useState<Zone>("main");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function getApiUrl(): string {
    if (typeof window !== "undefined") {
      const envUrl = process.env.NEXT_PUBLIC_API_URL;
      if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        return envUrl;
      }
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:8000`;
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000000"; // black bg matches backend model pre-processing
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvas.width,
      y: ((point.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.strokeStyle = "#ffffff"; // white stroke matches training set
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    drawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPrediction(null);
    setConfidence(null);
    setError(null);
  }

  async function handlePredict() {
    const canvas = canvasRef.current!;
    setLoading(true);
    setError(null);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", blob, "scratchpad.png");
      formData.append("zone", zone);

      const apiUrl = getApiUrl();

      try {
        const res = await fetch(`${apiUrl}/api/reclassify`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Reclassify error (${res.status})`);
        }

        const data = await res.json();
        setPrediction(data.character);
        if (data.confidence !== undefined) {
          setConfidence(Math.round(data.confidence * 100));
        }
      } catch (err: any) {
        console.error("Reclassify error:", err);
        setError("Failed to predict. Ensure backend is reachable.");
      } finally {
        setLoading(false);
      }
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-lg text-white">Character Scratchpad</h3>
            {currentChar && (
              <p className="text-xs text-slate-400">
                Correcting: <span className="font-devanagari font-bold text-indigo-400 text-base">{currentChar}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative rounded-xl border-2 border-indigo-500/40 p-1 bg-black shadow-inner">
            <canvas
              ref={canvasRef}
              width={220}
              height={220}
              className="touch-none rounded-lg cursor-crosshair block bg-black"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span>Draw with finger or mouse</span>
            <button
              onClick={clearCanvas}
              className="text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded hover:bg-indigo-950/50 transition-all"
            >
              Clear Canvas
            </button>
          </div>
        </div>

        {/* Zone Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Select Character Category (Zone)
          </label>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value as Zone)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {ZONES.map((z) => (
              <option key={z.key} value={z.key} className="bg-slate-900 text-slate-100">
                {z.label} ({z.example})
              </option>
            ))}
          </select>
        </div>

        {/* Prediction Box */}
        {prediction && (
          <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-indigo-300">Model Prediction:</span>
              <div className="text-2xl font-black font-devanagari text-white">{prediction}</div>
            </div>
            {confidence !== null && (
              <span className="text-xs font-medium px-2 py-1 bg-indigo-900/80 rounded-md text-indigo-200 border border-indigo-700/50">
                {confidence}% Confidence
              </span>
            )}
          </div>
        )}

        {/* Manual Keyboard Input Alternative */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs text-slate-400 mb-1">Or type character manually:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="e.g. क or ु"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white font-devanagari outline-none focus:border-indigo-500"
            />
            {manualInput && (
              <button
                onClick={() => onSubmit(manualInput)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Use Typed
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-all"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePredict}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Predict"}
            </button>
            {prediction && (
              <button
                onClick={() => onSubmit(prediction)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/30"
              >
                Replace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
