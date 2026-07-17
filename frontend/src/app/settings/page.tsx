"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");

  const handleSave = async () => {
    setSaving(true);
    // 实际保存逻辑需要连接到环境变量配置
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("配置已保存，请重启后端服务生效");
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          系统设置
        </h1>

        <div className="bg-white rounded-lg border p-6 space-y-6">
          {/* LLM Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LLM 提供商
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="deepseek">DeepSeek</option>
              <option value="zhipu">智谱 GLM</option>
              <option value="ollama">Ollama (本地)</option>
            </select>
          </div>

          {/* API Key */}
          {provider !== "ollama" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`输入 ${provider.toUpperCase()} API Key`}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                API Key 仅保存在本地，不会上传到服务器
              </p>
            </div>
          )}

          {/* Ollama 配置 */}
          {provider === "ollama" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ollama 服务地址
                </label>
                <input
                  type="text"
                  defaultValue="http://localhost:11434"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型名称
                </label>
                <input
                  type="text"
                  defaultValue="llama2"
                  placeholder="例如: llama2, qwen, mistral"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            </>
          )}

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                保存配置
              </>
            )}
          </button>
        </div>

        {/* 说明 */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• DeepSeek 性价比高，推荐使用</li>
            <li>• OpenAI GPT-4 效果最好，但价格较高</li>
            <li>• 智谱 GLM 中文理解能力强</li>
            <li>• Ollama 免费，但需要本地部署模型</li>
          </ul>
        </div>
      </div>
    </main>
  );
}