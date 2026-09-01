"use client";
import { useState } from "react";
import EditableResult from "@/components/EditableResult";

export default function Home() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  async function sendImage(file: File) {
    setLoading(true);
    setError(null);
    setResult("");

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    const formData = new FormData();
    formData.append("file", file);

    const apiUrl = getApiUrl();

    try {
      const res = await fetch(`${apiUrl}/api/recognize`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Backend error (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      setResult(data.unicode_text);
    } catch (err: any) {
      console.error("Recognition error:", err);
      setError(
        err?.message || `Failed to connect to backend at ${apiUrl}. Make sure backend server is running.`
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      sendImage(file);
      e.target.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      sendImage(file);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function clearAll() {
    setImagePreview(null);
    setResult("");
    setError(null);
  }

  // Calculate grapheme length for badge stats
  const charCount = result ? Array.from(new Intl.Segmenter("ne", { granularity: "grapheme" }).segment(result)).length : 0;
  const wordCount = result ? result.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-base tracking-tighter">
              D
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-lg tracking-tight">Draftly</span>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                Devanagari OCR
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="hidden sm:inline-block text-slate-500">Handwritten Nepali to Unicode</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Document Recognition Workspace
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Upload or scan handwritten Devanagari documents to extract digital text. Press and hold any extracted character for 0.5 seconds to correct it using the Scratchpad classifier.
            </p>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Input Controls */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Input Document</h2>
                {imagePreview && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
                  >
                    Clear input
                  </button>
                )}
              </div>

              {/* Upload Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-6 text-center flex flex-col items-center justify-center gap-3 transition-colors ${
                  isDragging
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                }`}
              >
                <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Drag & drop document image here</p>
                  <p className="text-xs text-slate-500 mt-0.5">Supports PNG, JPG, WEBP up to 10MB</p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap gap-2 justify-center w-full mt-2">
                  <label
                    htmlFor="document-upload"
                    className="cursor-pointer px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Browse Files</span>
                  </label>
                  <input
                    id="document-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <label
                    htmlFor="camera-scan"
                    className="cursor-pointer px-4 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Use Camera</span>
                  </label>
                  <input
                    id="camera-scan"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Selected Image Preview Container */}
              {imagePreview && (
                <div className="border border-slate-200 bg-slate-50 rounded-md p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700 border-b border-slate-200 pb-2">
                    <span>Document Preview</span>
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setResult("");
                      }}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex justify-center max-h-56 overflow-hidden rounded bg-white border border-slate-200 p-2">
                    <img src={imagePreview} alt="Document Preview" className="object-contain max-h-52 w-auto" />
                  </div>
                </div>
              )}

              {/* Processing Loader */}
              {loading && (
                <div className="p-4 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span>Segmenting Devanagari characters & running classification models...</span>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-slate-900">Recognition Failure</p>
                    <p className="text-slate-700 mt-0.5">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Extracted Digital Text Output */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col gap-5 min-h-[440px]">
              {/* Output Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Recognized Output</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Editable Devanagari Unicode text representation</p>
                </div>
                
                {result && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded font-mono">
                      {charCount} chars • {wordCount} words
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-blue-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Output Content Area */}
              {result ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs text-slate-600 flex items-center gap-2">
                    <span className="font-semibold text-slate-800">Correction Tool:</span>
                    <span>Press and hold any character for 0.5s to open the Scratchpad canvas and re-classify.</span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-md p-5 min-h-[220px]">
                    <EditableResult text={result} onChange={setResult} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 rounded-md text-center bg-slate-50/50 min-h-[280px]">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">No output generated yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Upload a handwritten document image using the input panel on the left to display extracted Unicode characters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
