"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2, Play, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";

interface Document {
  id: number;
  filename: string;
  file_type: string;
  chunk_count: number;
  created_at: string;
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      // 从Python后端获取文档列表
      const { callPythonAPI } = await import("@/lib/api/client");
      const data = await callPythonAPI<{documents: Document[]}>('/api/documents');
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Load documents error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除文档',
      content: '确定删除这份文档？相关测试记录将保留。',
      danger: true,
      confirmText: '删除',
      cancelText: '取消'
    });

    if (!confirmed) return;

    try {
      const { deleteDocument } = await import("@/lib/api/client");
      await deleteDocument(id);
      setDocuments(docs => docs.filter(d => d.id !== id));
      toast.success('已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>暂无文档，快上传一份复习资料吧</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        我的文档 <span className="text-gray-400 font-normal">共 {documents.length} 份</span>
      </h2>

      <div className="grid gap-4">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileText className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {doc.chunk_count} 个段落 · {new Date(doc.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/test/create?docs=${doc.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors sm:gap-2"
                  title="开始测试"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">开始测试</span>
                </Link>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}