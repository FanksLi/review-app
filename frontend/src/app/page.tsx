import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentList } from "@/components/documents/DocumentList";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏝️ 复习岛
          </h1>
          <p className="text-gray-600">
            上传复习资料，AI自动生成测试题目
          </p>
        </div>

        <DocumentUploader />
        <DocumentList />
      </div>
    </main>
  );
}
