"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

// TODO: 后端API需要补充:
// - GET /api/test-sessions/:id/questions 获取测试题目
// - PUT /api/test-sessions/:id/submit 提交测试
const API_BASE = '';

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
}

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = parseInt(params.sessionId as string);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/test-sessions/${sessionId}/questions`);
        const data = await response.json();
        setQuestions(data.questions || []);
      } catch (error) {
        console.error('加载题目失败:', error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [sessionId]);

  const handleSubmit = async () => {
    // 检查是否所有题目都已作答
    const unanswered = questions.filter(q => {
      const answer = answers[q.id];
      if (answer === null || answer === undefined || answer === "") return true;
      if (Array.isArray(answer) && answer.length === 0) return true;
      return false;
    });

    if (unanswered.length > 0) {
      alert(`还有 ${unanswered.length} 道题目未作答，请完成所有题目后提交`);
      return;
    }

    if (!confirm("确定提交测试？")) return;

    try {
      // 构建答案列表
      const answerList = Object.entries(answers).map(([qId, answer]) => ({
        question_id: qId,
        user_answer: answer,
      }));

      // 提交答案到后端
      const response = await fetch(`${API_BASE}/api/test-sessions/${sessionId}/submit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerList }),
      });

      if (response.ok) {
        router.push(`/test/${sessionId}/result`);
      } else {
        alert('提交失败');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "提交失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>题目加载失败</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* 进度条 */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">测试进行中</span>
            <span className="text-sm text-gray-600">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 题目 */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-500 uppercase">
              {currentQuestion.type === "single_choice" && "单选题"}
              {currentQuestion.type === "multi_choice" && "多选题"}
              {currentQuestion.type === "true_false" && "判断题"}
              {currentQuestion.type === "short_answer" && "简答题"}
            </span>
            <h2 className="text-xl font-medium mt-2">
              {currentQuestion.question}
            </h2>
          </div>

          {/* 选项 */}
          {currentQuestion.type === "single_choice" && (
            <div className="space-y-3">
              {currentQuestion.options?.map((opt, i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={opt[0]}
                    checked={answers[currentQuestion.id] === opt[0]}
                    onChange={() => setAnswers({
                      ...answers,
                      [currentQuestion.id]: opt[0],
                    })}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === "multi_choice" && (
            <div className="space-y-3">
              {currentQuestion.options?.map((opt, i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    value={opt[0]}
                    checked={(answers[currentQuestion.id] || []).includes(opt[0])}
                    onChange={(e) => {
                      const current = answers[currentQuestion.id] || [];
                      if (e.target.checked) {
                        setAnswers({
                          ...answers,
                          [currentQuestion.id]: [...current, opt[0]],
                        });
                      } else {
                        setAnswers({
                          ...answers,
                          [currentQuestion.id]: current.filter((c: string) => c !== opt[0]),
                        });
                      }
                    }}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === "true_false" && (
            <div className="space-y-3">
              {["正确", "错误"].map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={opt}
                    checked={answers[currentQuestion.id] === opt}
                    onChange={() => setAnswers({
                      ...answers,
                      [currentQuestion.id]: opt,
                    })}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === "short_answer" && (
            <textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => setAnswers({
                ...answers,
                [currentQuestion.id]: e.target.value,
              })}
              className="w-full h-32 border rounded-lg p-3 resize-none"
              placeholder="请输入答案..."
            />
          )}
        </div>

        {/* 导航 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
            上一题
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              下一题
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              提交测试
            </button>
          )}
        </div>

        {/* 题目导航 */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                i === currentIndex
                  ? "bg-green-600 text-white"
                  : answers[questions[i].id]
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}