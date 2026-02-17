"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = sessionStorage.getItem("token");
    if (token) {
      router.push("/chat");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 dot-grid">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-500 rounded-md flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-zinc-100">Zap</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 font-medium transition-colors">
                Sign in
              </button>
            </Link>
            <Link href="/signup">
              <button className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-xs font-medium text-rose-300 tracking-wide">
              Real-time messaging
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-zinc-100 leading-[1.1] mb-6">
            Talk fast.
            <br />
            <span className="text-zinc-500">Skip the noise.</span>
          </h1>

          <p className="text-lg text-zinc-500 leading-relaxed mb-10 max-w-lg">
            Instant delivery, read receipts, online presence — the essentials,
            nothing more. Built for conversations that matter.
          </p>

          <div className="flex items-center gap-4 mb-20">
            <Link href="/signup">
              <button className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-lg text-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                Start chatting
              </button>
            </Link>
            <Link href="/login">
              <button className="px-6 py-2.5 bg-white/3 hover:bg-white/6 text-zinc-300 border border-white/6 hover:border-white/10 font-medium rounded-lg text-sm transition-all">
                I have an account
              </button>
            </Link>
          </div>
        </div>

        {/* Terminal-style preview */}
        <div className="rounded-xl border border-white/6 bg-white/2 overflow-hidden mb-20">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
            <span className="ml-3 text-xs text-zinc-600 font-mono">
              zap — conversation
            </span>
          </div>
          <div className="p-6 font-mono text-sm space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-rose-400 shrink-0">alice:</span>
              <span className="text-zinc-400">
                hey, did you push the latest changes?
              </span>
              <span className="text-zinc-700 text-xs ml-auto shrink-0">
                2:41 PM
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 shrink-0">bob:</span>
              <span className="text-zinc-400">yep, just merged to main</span>
              <span className="text-zinc-700 text-xs ml-auto shrink-0">
                2:41 PM
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-rose-400 shrink-0">alice:</span>
              <span className="text-zinc-400">nice, pulling now</span>
              <span className="text-zinc-700 text-xs ml-auto shrink-0">
                2:42 PM
              </span>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-white/5">
              <span className="text-zinc-700">{">"}</span>
              <span className="text-zinc-600 animate-pulse">_</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="group p-6 rounded-xl bg-white/2 border border-white/5 hover:border-rose-500/20 transition-all">
            <div className="text-3xl mb-4">&#9889;</div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-2">
              Instant delivery
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Messages arrive the moment you hit send. No delays, no polling.
            </p>
          </div>

          <div className="group p-6 rounded-xl bg-white/2 border border-white/5 hover:border-rose-500/20 transition-all">
            <div className="text-3xl mb-4">&#128065;</div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-2">
              Read receipts
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Know exactly when your message was seen. Double-tick confirmation.
            </p>
          </div>

          <div className="group p-6 rounded-xl bg-white/2 border border-white/5 hover:border-rose-500/20 transition-all">
            <div className="text-3xl mb-4">&#127760;</div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-2">
              Online presence
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              See who&apos;s available right now. Green dot means ready to talk.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-white/5">
          <p className="text-xs text-zinc-700">
            &copy; 2025 Zap. Simple, fast messaging.
          </p>
        </footer>
      </div>
    </div>
  );
}
