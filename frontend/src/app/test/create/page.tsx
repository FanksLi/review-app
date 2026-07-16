"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Play, Loader2 } from "lucide-react";
import { generateQuestions } from "@/lib/api/client";

// TODO: 后端API需要补充:
// - POST /api/test-sessions 创建测试会话
// - GET /api/documents 获取文档列表
const API_BASE = '';

function CreateTestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Array<{id: number; filename: string}>>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [questionTypes, setQuestionTypes] = useState({
    single_choice: 1,
    multi_choice: 1,
    true_false: 1,
    short_answer: 1,
  });

  useEffect(() => {
    // 获取文档列表
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/documents`);
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || []);
        }
      } catch (error) {
        console.error('获取文档列表失败:', error);
        setDocuments([]);
      }

      const docId = searchParams.get("docs");
      if (docId) {
        setSelectedDocs([parseInt(docId)]);
      }
    };
    fetchDocuments();
  }, [searchParams]);

  const handleGenerate = async () => {
    const totalQuestions = Object.values(questionTypes).reduce((a, b) => a + b, 0);
    if (selectedDocs.length === 0) {
      alert("请选择至少一份文档");
      return;
    }
    if (totalQuestions === 0) {
      alert("请设置题目数量");
      return;
    }

    setLoading(true);
    try {
      // 创建测试会话
      const sessionResponse = await fetch(`${API_BASE}/api/test-sessions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: selectedDocs,
          question_types: questionTypes,
          provider: 'deepseek',
        }),
      });
      const { session_id } = await sessionResponse.json();

      // 生成题目
      const result = await generateQuestions({
        document_ids: selectedDocs,
        question_types: Object.keys(questionTypes).filter(k => questionTypes[k as keyof typeof questionTypes] > 0),
        counts: questionTypes,
      }) as { questions: Array<unknown> };

      // 保存题目到测试会话
      await fetch(`${API_BASE}/api/test-sessions/${session_id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: result.questions }),
      });

      router.push(`/test/${session_id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">创建测试</h1>

        {/* 选择文档 */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">选择文档</h2>
          <div className="space-y-2">
            {documents.map(doc => (
              <label key={doc.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocs([...selectedDocs, doc.id]);
                    } else {
                      setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <FileText className="w-5 h-5 text-blue-500" />
                <span>{doc.filename}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 题目类型 */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">题目类型</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "single_choice", label: "单选题" },
              { key: "multi_choice", label: "多选题" },
              { key: "true_false", label: "判断题" },
              { key: "short_answer", label: "简答题" },
            ].map(type => (
              <div key={type.key} className="flex flex-col gap-2">
                <label className="font-medium">{type.label}</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={questionTypes[type.key as keyof typeof questionTypes]}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setQuestionTypes({
                      ...questionTypes,
                      [type.key]: value >= 1 ? value : 1,
                    });
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!value || value < 1) {
                      setQuestionTypes({
                        ...questionTypes,
                        [type.key]: 1,
                      });
                    }
                  }}
                  className="border rounded-md px-3 py-2"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              生成测试
            </>
          )}
        </button>
      </div>
    </main>
  );
}

export default function CreateTestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <CreateTestContent />
    </Suspense>
  );
}