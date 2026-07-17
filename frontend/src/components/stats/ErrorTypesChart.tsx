"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { callPythonAPI } from "@/lib/api/client";

interface ErrorTypeData {
  type: string;
  count: number;
  percentage: number;
}

const typeLabels: Record<string, string> = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  short_answer: '简答题'
};

export default function ErrorTypesChart() {
  const [data, setData] = useState<ErrorTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const result = await callPythonAPI<ErrorTypeData[]>('/api/stats/error-types');
        setData(result);
      } catch (error) {
        console.error('Failed to fetch error types:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;

  const chartData = data.map(item => ({
    ...item,
    label: typeLabels[item.type] || item.type
  }));

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="font-semibold mb-4">错误类型分布</h2>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          暂无错误数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="label" type="category" width={80} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'count') return [value, '错误数'];
                return [value, name];
              }}
            />
            <Bar dataKey="count" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}