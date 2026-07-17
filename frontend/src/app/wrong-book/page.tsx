"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Search, Filter, Trash2, ArrowUp } from "lucide-react";
import Link from "next/link";
import { callPythonAPI } from "@/lib/api/client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";

interface WrongQuestion {
  question_id: string;
  question_type: string;
  question_text: string;
  options?: string[];
  user_answer: string;
  correct_answer: string;
  source_reference?: string;
  wrong_count: number;
}

export default function WrongBookPage() {
  const [questions, setQuestions] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "single_choice" | "multi_choice" | "true_false" | "short_answer">("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const pageSize = 10;
  const confirm = useConfirm();

  useEffect(() => {
    const fetchWrongQuestions = async () => {
      try {
        const data = await callPythonAPI<{questions: WrongQuestion[]}>(`/api/stats/wrong-questions?t=${Date.now()}`);
        setQuestions(data.questions || []);
      } catch (error) {
        console.error('加载错题失败:', error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWrongQuestions();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (questionId: string) => {
    const confirmed = await confirm({
      title: '移除错题',
      content: '确定从错题本移除这道题？',
      danger: true,
      confirmText: '移除',
      cancelText: '取消'
    });

    if (!confirmed) return;

    const [sessionId, qId] = questionId.split('-');
    setDeleting(questionId);
    try {
      await callPythonAPI(`/api/stats/wrong-questions/${sessionId}/${qId}`, { method: 'DELETE' });
      setQuestions(questions.filter(q => q.question_id !== questionId));
      toast.success('已移除');
    } catch (error) {
      toast.error('移除失败');
    } finally {
      setDeleting(null);
    }
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
                          {q.options && q.options.length > 0 && (
                            <div className="mb-3 pl-4 space-y-1">
                              {q.options.map((opt, idx) => {
                                const optionLetter = opt[0];
                                const isUserChoice = q.user_answer.includes(optionLetter);
                                const isCorrectChoice = q.correct_answer.includes(optionLetter);

                                let bgColor = '';
                                if (isCorrectChoice && isUserChoice) {
                                  bgColor = 'bg-green-100 border-green-300';
                                } else if (isCorrectChoice) {
                                  bgColor = 'bg-green-50 border-green-200';
                                } else if (isUserChoice) {
                                  bgColor = 'bg-red-50 border-red-200';
                                }

                                return (
                                  <div key={idx} className={`text-sm px-3 py-2 rounded border ${bgColor || 'bg-gray-50 border-gray-200'}`}>
                                    <span className="font-medium">{opt}</span>
                                    {isCorrectChoice && !isUserChoice && <span className="ml-2 text-green-600 text-xs">(正确答案)</span>}
                                    {isUserChoice && !isCorrectChoice && <span className="ml-2 text-red-600 text-xs">(你的选择)</span>}
                                    {isCorrectChoice && isUserChoice && <span className="ml-2 text-green-600 text-xs">✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="text-sm text-gray-600">
                            你的答案: <span className="text-red-600 font-medium">{q.user_answer}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            正确答案: <span className="text-green-600 font-medium">{q.correct_answer}</span>
                          </div>
                          {q.source_reference && (
                            <div className="text-xs text-gray-400 mt-2">
                              来源: {q.source_reference}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(q.question_id)}
                          disabled={deleting === q.question_id}
                          className="ml-4 px-3 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {deleting === q.question_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          移除
                        </button>
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

        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            aria-label="回到顶部"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </main>
  );
}