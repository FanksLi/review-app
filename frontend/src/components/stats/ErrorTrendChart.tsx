"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { callPythonAPI } from "@/lib/api/client";

interface ErrorTrendData {
  date: string;
  error_count: number;
}

export default function ErrorTrendChart() {
  const [data, setData] = useState<ErrorTrendData[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const result = await callPythonAPI<ErrorTrendData[]>(`/api/stats/error-trend?days=${days}`);
        setData(result);
      } catch (error) {
        console.error('Failed to fetch error trend:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, [days]);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">错误趋势</h2>
        <div className="flex gap-2">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-sm rounded ${
                days === d ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          暂无错误数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="error_count" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}