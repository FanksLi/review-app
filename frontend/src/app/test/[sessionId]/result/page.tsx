"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { callPythonAPI } from "@/lib/api/client";

interface TestResult {
  total_score: number;
  total_max_score: number;
  questions: Array<{
    question_id: string;
    question_type: string;
    question_text: string;
    options?: string[];
    user_answer: string;
    correct_answer: string;
    is_correct: boolean | null;
    score: number;
    max_score: number;
    llm_feedback: string | null;
    source_reference: string;
  }>;
}

export default function ResultPage() {
  const params = useParams();
  const sessionId = parseInt(params.sessionId as string);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await callPythonAPI<TestResult>(`/api/test-sessions/${sessionId}/result`);
        setResult(data);
      } catch (error) {
        console.error('加载结果失败:', error);
        setResult(null);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>测试结果不存在</p>
      </div>
    );
  }

  const percentage = (result.total_score / result.total_max_score) * 100;
  const correctCount = result.questions.filter(q => q.is_correct === true).length;
  const wrongQuestions = result.questions.filter(
    q => q.is_correct === false || (q.score !== null && q.score < q.max_score * 0.6)
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* 成绩卡片 */}
        <div className="bg-white rounded-lg border p-8 text-center mb-6">
          <div className="text-6xl mb-4">
            {percentage >= 80 ? "🎉" : percentage >= 60 ? "👍" : "💪"}
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {result.total_score.toFixed(1)} 分
          </h1>
          <p className="text-gray-600">
            正确 {correctCount} / {result.questions.length} 题
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {percentage >= 80 && <span className="text-yellow-500 text-2xl">★★★☆☆</span>}
            {percentage >= 60 && percentage < 80 && <span className="text-yellow-500 text-2xl">★★☆☆☆</span>}
            {percentage < 60 && <span className="text-yellow-500 text-2xl">★☆☆☆☆</span>}
          </div>
        </div>

        {/* 题目统计 */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="font-semibold mb-4">题目统计</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: "single_choice", label: "单选题" },
              { type: "multi_choice", label: "多选题" },
              { type: "true_false", label: "判断题" },
              { type: "short_answer", label: "简答题" },
            ].map(({ type, label }) => {
              const typeQuestions = result.questions.filter(
                q => q.question_type === type
              );
              const correct = typeQuestions.filter(q => q.is_correct === true).length;
              if (typeQuestions.length === 0) return null;
              return (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">{label}</div>
                  <div className="text-lg font-semibold">
                    {correct}/{typeQuestions.length} 正确
                  </div>
                  <div className="text-xs">
                    {correct === typeQuestions.length ? (
                      <span className="text-green-600">✓</span>
                    ) : correct > typeQuestions.length / 2 ? (
                      <span className="text-yellow-600">△</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 错题解析 */}
        {wrongQuestions.length > 0 && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              错题解析 ({wrongQuestions.length})
            </h2>
            <div className="space-y-4">
              {wrongQuestions.map((q, i) => (
                <div key={q.question_id} className="p-4 bg-red-50 rounded-lg">
                  <div className="font-medium mb-2">
                    {i + 1}. [{q.question_type === "single_choice" && "单选"}
                    {q.question_type === "multi_choice" && "多选"}
                    {q.question_type === "true_false" && "判断"}
                    {q.question_type === "short_answer" && "简答"}]
                    {q.question_text}
                  </div>
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
                  <div className="text-sm space-y-1">
                    <div className="text-gray-600">
                      你的答案: <span className="text-red-600">{q.user_answer}</span>
                    </div>
                    <div className="text-gray-600">
                      正确答案: <span className="text-green-600">{q.correct_answer}</span>
                    </div>
                    {q.llm_feedback && (
                      <div className="text-gray-500 mt-2 italic">
                        评语: {q.llm_feedback}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      来源: {q.source_reference}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <Link
            href="/wrong-book"
            className="flex-1 py-3 border border-gray-300 rounded-lg text-center hover:bg-gray-50"
          >
            查看错题本
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 bg-green-600 text-white rounded-lg text-center hover:bg-green-700"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}