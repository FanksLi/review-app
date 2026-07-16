"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏝️</span>
          <span className="font-bold text-xl text-gray-800">复习岛</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/history"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            历史记录
          </Link>
          <Link
            href="/stats"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            统计分析
          </Link>
          <Link
            href="/wrong-book"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            错题本
          </Link>
          <Link
            href="/settings"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        </nav>
      </div>
    </header>
  );
}