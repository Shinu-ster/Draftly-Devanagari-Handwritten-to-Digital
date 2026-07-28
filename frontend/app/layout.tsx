import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draftly",
  description: "Handwritten Nepali to Unicode text converter",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0f172a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
