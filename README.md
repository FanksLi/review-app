# 复习资料测试系统

基于RAG技术的个人复习测试工具。

## 快速启动

### 后端 (Python FastAPI)

```bash
cd backend
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

### 前端 (Next.js)

```bash
cd frontend
npm run dev
```

访问: http://localhost:3000

## 功能

- 文档上传（PDF/Word/文本）
- AI自动生成测试题目
- 答题评分
- 历史记录
- 错题本

## 配置

编辑 `backend/.env` 配置LLM API Key:

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-api-key
```