"use client";
import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/api/recognize", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setResult(data.unicode_text);
    setLoading(false);
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Draftly</h1>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {loading && <p>Processing...</p>}
      {result && <p className="mt-4 text-xl">{result}</p>}
    </main>
  );
}
