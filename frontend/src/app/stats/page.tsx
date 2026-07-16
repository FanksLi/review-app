"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Loader2 } from "lucide-react";

// TODO: 后端API GET /api/stats/overview 尚未实现
const API_BASE = 'http://localhost:8000';

interface Stats {
  totalTests: number;
  avgScore: number;
  totalDocuments: number;
  recentTrend: number[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    avgScore: 0,
    totalDocuments: 0,
    recentTrend: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/stats/overview`);
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalTests: data.totalTests || 0,
            avgScore: data.avgScore || 0,
            totalDocuments: data.totalDocuments || 0,
            recentTrend: data.recentTrend || [],
          });
        }
      } catch (error) {
        console.error('加载统计失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">统计分析</h1>

        {/* 总览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600">总测试次数</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {stats.totalTests}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">平均分数</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {stats.avgScore.toFixed(1)}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-600">文档数量</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {stats.totalDocuments}
            </div>
          </div>
        </div>

        {/* 趋势图 */}
        {stats.recentTrend.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">最近成绩趋势</h2>
            <div className="h-48 flex items-end gap-2">
              {stats.recentTrend.map((score, i) => {
                const maxScore = Math.max(...stats.recentTrend, 100);
                const height = (score / maxScore) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-green-500 to-green-300 rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${score.toFixed(1)} 分`}
                  />
                );
              })}
            </div>
            <div className="mt-2 text-sm text-gray-500 text-center">
              最近 {stats.recentTrend.length} 次测试
            </div>
          </div>
        )}

        {stats.totalTests === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无测试数据</p>
          </div>
        )}
      </div>
    </main>
  );
}