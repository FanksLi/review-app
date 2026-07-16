"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, BarChart3, BookOpen, Settings, Menu, X } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "首页", icon: Home },
    { href: "/history", label: "历史记录", icon: History },
    { href: "/stats", label: "统计分析", icon: BarChart3 },
    { href: "/wrong-book", label: "错题本", icon: BookOpen },
  ];

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏝️</span>
            <span className="text-xl font-bold text-gray-800">复习岛</span>
          </Link>

          {/* 桌面端导航 */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </Link>
          </div>

          {/* 手机端汉堡按钮 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* 手机端下拉菜单 */}
        {isOpen && (
          <div className="md:hidden absolute left-0 right-0 top-16 bg-white border-b shadow-lg py-4">
            <div className="container mx-auto px-4">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-green-100 text-green-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">设置</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
