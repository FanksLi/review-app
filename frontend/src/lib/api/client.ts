/** Python后端API客户端 */

// 生产环境通过 nginx 反向代理，使用相对路径
// 开发环境使用 localhost:8000
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // 浏览器端：生产环境用相对路径，开发环境用 localhost
    return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000';
  }
  // 服务端渲染：使用环境变量或默认值
  return process.env.PYTHON_BACKEND_URL || 'http://backend:8000';
};

const PYTHON_BACKEND_URL = getApiBaseUrl();

export async function callPythonAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PYTHON_BACKEND_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// 文档相关
export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${PYTHON_BACKEND_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

export async function deleteDocument(documentId: number) {
  return callPythonAPI(`/api/documents/${documentId}`, { method: 'DELETE' });
}

// 题目生成
export async function generateQuestions(data: {
  document_ids: number[];
  question_types: string[];
  counts: Record<string, number>;
  provider?: string;
}) {
  return callPythonAPI('/api/questions/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 评分
export async function gradeTest(data: {
  answers: Array<{
    question_id: string;
    user_answer: string | string[] | boolean;
  }>;
  questions: any[];
  provider?: string;
}) {
  return callPythonAPI('/api/tests/grade', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Provider列表
export async function getProviders() {
  return callPythonAPI<{
    providers: Array<{
      name: string;
      label: string;
      models: string[];
    }>;
    default: string;
  }>('/api/providers');
}

// 健康检查
export async function healthCheck() {
  return callPythonAPI('/health');
}