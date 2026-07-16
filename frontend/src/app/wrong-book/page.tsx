"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import Link from "next/link";

// TODO: 后端API GET /api/stats/wrong-questions 尚未实现
const API_BASE = '';

interface WrongQuestion {
  question_id: string;
  question_type: string;
  question_text: string;
  correct_answer: string;
  wrong_count: number;
}

export default function WrongBookPage() {
  const [questions, setQuestions] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "single_choice" | "multi_choice" | "true_false" | "short_answer">("all");
  const pageSize = 10;

  useEffect(() => {
    const fetchWrongQuestions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/stats/wrong-questions?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setQuestions(data.questions || []);
        }
      } catch (error) {
        console.error('加载错题失败:', error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWrongQuestions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // 筛选逻辑
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = searchQuery === "" ||
      q.question_text.includes(searchQuery) ||
      q.correct_answer.includes(searchQuery);

    const matchesType = typeFilter === "all" || q.question_type === typeFilter;

    return matchesSearch && matchesType;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentQuestions = filteredQuestions.slice(startIndex, endIndex);

  // 重置页码当筛选改变
  const handleFilterChange = (newFilter: typeof typeFilter) => {
    setTypeFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            错题本
          </h1>
          {questions.length > 0 && (
            <span className="text-sm text-gray-500">
              共 {questions.length} 道错题
            </span>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>太棒了！暂无错题</p>
          </div>
        ) : (
          <>
            {/* 搜索和筛选 */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索题目内容或答案..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => handleFilterChange(e.target.value as typeof typeFilter)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">全部类型</option>
                  <option value="single_choice">单选题</option>
                  <option value="multi_choice">多选题</option>
                  <option value="true_false">判断题</option>
                  <option value="short_answer">简答题</option>
                </select>
              </div>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              共 {filteredQuestions.length} 条记录，第 {currentPage} / {totalPages || 1} 页
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>没有找到匹配的错题</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {currentQuestions.map((q, i) => (
                    <div
                      key={q.question_id}
                      className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                              {q.question_type === "single_choice" && "单选"}
                              {q.question_type === "multi_choice" && "多选"}
                              {q.question_type === "true_false" && "判断"}
                              {q.question_type === "short_answer" && "简答"}
                            </span>
                            <span className="text-xs text-red-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              错误 {q.wrong_count} 次
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 mb-3">
                            {startIndex + i + 1}. {q.question_text}
                          </p>
                          <div className="text-sm text-gray-600">
                            正确答案: <span className="text-green-600 font-medium">{q.correct_answer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 分页导航 */}
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded ${
                            currentPage === pageNum
                              ? "bg-red-600 text-white"
                              : "border hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="block w-full py-3 border border-gray-300 rounded-lg text-center hover:bg-gray-50"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}