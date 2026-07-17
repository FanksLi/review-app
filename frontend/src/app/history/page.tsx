"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Calendar, Trash2, ChevronLeft, ChevronRight, Search, Filter, ArrowUp } from "lucide-react";
import Link from "next/link";
import { callPythonAPI } from "@/lib/api/client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";

interface TestSession {
  id: number;
  document_ids: string;
  total_questions: number;
  total_score: number | null;
  created_at: string;
  completed_at: string | null;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const pageSize = 10;
  const confirm = useConfirm();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await callPythonAPI<{sessions: TestSession[]}>('/api/test-sessions/');
        setSessions(data.sessions || []);
      } catch (error) {
        console.error('加载历史记录失败:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDelete = async (sessionId: number) => {
    const confirmed = await confirm({
      title: '删除测试',
      content: `确定要删除测试 #${sessionId} 吗？此操作不可恢复。`,
      danger: true,
      confirmText: '删除',
      cancelText: '取消'
    });

    if (!confirmed) return;

    setDeleting(sessionId);
    try {
      await callPythonAPI(`/api/test-sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success('已删除');
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // 筛选逻辑
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = searchQuery === "" ||
      session.id.toString().includes(searchQuery) ||
      new Date(session.created_at).toLocaleString("zh-CN").includes(searchQuery);

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "completed" && session.completed_at !== null) ||
      (statusFilter === "incomplete" && session.completed_at === null);

    return matchesSearch && matchesStatus;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentSessions = filteredSessions.slice(startIndex, endIndex);

  // 重置页码当筛选改变
  const handleFilterChange = (newFilter: typeof statusFilter) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">历史记录</h1>

        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无测试记录</p>
          </div>
        ) : (
          <>
            {/* 搜索和筛选 */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索测试编号或时间..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value as typeof statusFilter)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">全部状态</option>
                  <option value="completed">已完成</option>
                  <option value="incomplete">未完成</option>
                </select>
              </div>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              共 {filteredSessions.length} 条记录，第 {currentPage} / {totalPages || 1} 页
            </div>

            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>没有找到匹配的记录</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {currentSessions.map(session => {
                    const docIds = JSON.parse(session.document_ids || "[]");
                    const isCompleted = session.completed_at !== null;
                    const score = session.total_score;
                    const totalQuestions = session.total_questions;
                    const isDeleting = deleting === session.id;

                    return (
                      <div
                        key={session.id}
                        className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                测试 #{session.id}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {totalQuestions} 道题目 · {docIds.length} 份文档
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(session.created_at).toLocaleString("zh-CN", {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                }).replace(/\//g, '-')}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {isCompleted ? (
                              <div>
                                <div className="text-2xl font-bold text-gray-800">
                                  {score?.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500">分数</div>
                              </div>
                            ) : (
                              <div className="text-sm text-yellow-600">未完成</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          {isCompleted && (
                            <Link
                              href={`/test/${session.id}/result`}
                              className="flex-1 py-2 text-center text-sm border rounded hover:bg-gray-50"
                            >
                              查看结果
                            </Link>
                          )}
                          {!isCompleted && (
                            <Link
                              href={`/test/${session.id}`}
                              className="flex-1 py-2 text-center text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              继续答题
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(session.id)}
                            disabled={isDeleting}
                            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                                ? "bg-green-600 text-white"
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
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="回到顶部"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </main>
  );
}