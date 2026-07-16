"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { uploadDocument } from "@/lib/api/client";

export function DocumentUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

    if (!allowedTypes.includes(file.type)) {
      alert("仅支持 PDF、Word、文本文件");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("文件大小不能超过 20MB");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      console.log("Upload result:", result);
      alert("上传成功！");
      window.location.reload();
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragActive
          ? "border-green-500 bg-green-50"
          : "border-gray-300 hover:border-green-400 hover:bg-green-50/50"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        {isUploading ? (
          <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        ) : (
          <div className="flex gap-4">
            <FileText className="w-12 h-12 text-gray-400" />
            <Upload className="w-12 h-12 text-gray-400" />
          </div>
        )}

        <div>
          <p className="text-lg font-medium text-gray-700 mb-1">
            {isUploading ? "正在上传..." : "拖拽文件到此处或点击上传"}
          </p>
          <p className="text-sm text-gray-500">
            支持 PDF、Word、文本文件，最大 20MB
          </p>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? "处理中..." : "选择文件"}
        </button>
      </div>
    </div>
  );
}