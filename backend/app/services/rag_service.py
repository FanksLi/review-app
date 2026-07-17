"""RAG检索增强生成服务"""

from typing import List, Dict, Any, Optional
import faiss
import numpy as np
from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import SentenceTransformerEmbeddings
import pickle
from pathlib import Path
from openai import OpenAI

from ..config import get_settings
from ..providers.factory import create_provider


class RAGService:
    """RAG服务 - 向量化、检索、生成"""

    def __init__(self):
        self.settings = get_settings()
        self._index = None
        self._embeddings = None
        self._qwen_client = None
        self._documents = []
        self._index_path = Path(self.settings.CHROMA_PERSIST_DIR).parent / "faiss_index.bin"
        self._docs_path = Path(self.settings.CHROMA_PERSIST_DIR).parent / "documents.pkl"

    @property
    def embeddings(self):
        """懒加载Embeddings模型"""
        if self._embeddings is None:
            if self.settings.EMBEDDING_PROVIDER == "openai":
                self._embeddings = OpenAIEmbeddings(
                    model=self.settings.OPENAI_EMBEDDING_MODEL,
                    openai_api_key=self.settings.OPENAI_API_KEY
                )
            elif self.settings.EMBEDDING_PROVIDER == "qwen":
                # 千问embedding - 直接使用OpenAI客户端
                self._qwen_client = OpenAI(
                    api_key=self.settings.QWEN_API_KEY,
                    base_url=self.settings.QWEN_BASE_URL
                )
                self._embeddings = "qwen"  # 标记使用千问
            else:
                # 使用本地模型
                self._embeddings = SentenceTransformerEmbeddings(
                    model_name="all-MiniLM-L6-v2"
                )
        return self._embeddings

    def _load_index(self):
        """加载FAISS索引"""
        if self._index is None:
            if self._index_path.exists():
                self._index = faiss.read_index(str(self._index_path))
                with open(self._docs_path, "rb") as f:
                    self._documents = pickle.load(f)
            else:
                # 创建空索引 (1024维，千问text-embedding-v4)
                self._index = faiss.IndexFlatIP(1024)
                self._documents = []

    def _save_index(self):
        """保存FAISS索引"""
        Path(self.settings.CHROMA_PERSIST_DIR).parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self._index, str(self._index_path))
        with open(self._docs_path, "wb") as f:
            pickle.dump(self._documents, f)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """向量化文本"""
        texts = [str(t) if not isinstance(t, str) else t for t in texts]

        if self.settings.EMBEDDING_PROVIDER == "qwen":
            # 直接调用千问API（批量限制20）
            if self._qwen_client is None:
                from openai import OpenAI
                self._qwen_client = OpenAI(
                    api_key=self.settings.QWEN_API_KEY,
                    base_url=self.settings.QWEN_BASE_URL
                )

            # 分批处理，每批最多20条
            batch_size = 20
            all_embeddings = []

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                response = self._qwen_client.embeddings.create(
                    model=self.settings.QWEN_EMBEDDING_MODEL,
                    input=batch
                )
                all_embeddings.extend([item.embedding for item in response.data])

            return all_embeddings
        else:
            return self.embeddings.embed_documents(texts)

    def add_documents(self, chunks: List[Dict[str, Any]], document_id: int) -> int:
        """添加文档到向量库

        Args:
            chunks: 文档分段列表 [{"text": "...", "metadata": {...}}, ...]
            document_id: 文档ID

        Returns:
            添加的分段数量
        """
        if not chunks:
            return 0

        self._load_index()

        texts = [chunk["text"] for chunk in chunks]
        metadatas = [
            {**chunk["metadata"], "document_id": document_id}
            for chunk in chunks
        ]

        # 向量化
        embeddings = self.embed_texts(texts)
        embeddings_array = np.array(embeddings).astype('float32')

        # FAISS需要归一化以使用余弦相似度
        faiss.normalize_L2(embeddings_array)

        # 添加到索引
        start_id = len(self._documents)
        self._index.add(embeddings_array)

        # 存储文档
        for i, (text, meta) in enumerate(zip(texts, metadatas)):
            self._documents.append({
                "id": start_id + i,
                "text": text,
                "metadata": meta
            })

        self._save_index()

        return len(chunks)

    def delete_documents(self, document_id: int) -> bool:
        """删除文档相关向量"""
        try:
            self._load_index()

            # FAISS不支持直接删除，重建索引
            new_docs = [doc for doc in self._documents if doc["metadata"].get("document_id") != document_id]

            if len(new_docs) < len(self._documents):
                # 重建索引
                self._index = faiss.IndexFlatIP(384)
                self._documents = []

                if new_docs:
                    texts = [doc["text"] for doc in new_docs]
                    embeddings = self.embed_texts(texts)
                    embeddings_array = np.array(embeddings).astype('float32')
                    faiss.normalize_L2(embeddings_array)
                    self._index.add(embeddings_array)
                    self._documents = new_docs

                self._save_index()

            return True
        except Exception as e:
            print(f"删除文档向量失败: {e}")
            return False

    def retrieve(
        self,
        query: str,
        document_ids: Optional[List[int]] = None,
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """检索相关文档片段

        Args:
            query: 查询文本
            document_ids: 限定文档ID列表
            n_results: 返回结果数量

        Returns:
            相关文档片段列表
        """
        self._load_index()

        if len(self._documents) == 0:
            return []

        # 向量化查询
        if self.settings.EMBEDDING_PROVIDER == "qwen":
            # 千问embedding
            if self._qwen_client is None:
                from openai import OpenAI
                self._qwen_client = OpenAI(
                    api_key=self.settings.QWEN_API_KEY,
                    base_url=self.settings.QWEN_BASE_URL
                )
            response = self._qwen_client.embeddings.create(
                model=self.settings.QWEN_EMBEDDING_MODEL,
                input=[query]
            )
            query_embedding = response.data[0].embedding
        else:
            query_embedding = self.embeddings.embed_query(query)

        query_array = np.array([query_embedding]).astype('float32')
        faiss.normalize_L2(query_array)

        # 查询
        k = min(n_results * 3, len(self._documents))  # 多查一些用于过滤
        scores, indices = self._index.search(query_array, k)

        # 格式化结果
        retrieved = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self._documents):
                doc = self._documents[idx]

                # 过滤文档ID
                if document_ids and doc["metadata"].get("document_id") not in document_ids:
                    continue

                retrieved.append({
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "score": float(score)
                })

                if len(retrieved) >= n_results:
                    break

        return retrieved

    def generate_questions(
        self,
        document_ids: List[int],
        question_types: List[str],
        counts: Dict[str, int],
        provider_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """生成测试题目

        Args:
            document_ids: 文档ID列表
            question_types: 题型列表
            counts: 各题型数量
            provider_name: LLM Provider名称

        Returns:
            题目列表
        """
        import random
        import hashlib
        import sqlite3

        # 获取已有题目用于去重
        existing_questions = self._get_existing_questions(document_ids)

        # 检索文档片段 - 随机采样
        chunks = []
        per_doc = max(15, sum(counts.values()) * 2)

        for doc_id in document_ids:
            doc_chunks = self.retrieve(
                query="",  # 空查询获取文档片段
                document_ids=[doc_id],
                n_results=per_doc
            )
            # 随机打乱顺序
            random.shuffle(doc_chunks)
            chunks.extend(doc_chunks)

        # 如果没有内容，返回空
        if not chunks:
            return []

        # 按页码分组，确保覆盖不同章节
        page_groups = {}
        for chunk in chunks:
            page = chunk['metadata'].get('page', 'unknown')
            source = chunk['metadata'].get('source', 'unknown')
            key = f"{source}-{page}"
            if key not in page_groups:
                page_groups[key] = []
            page_groups[key].append(chunk)

        # 从每个页码组中均匀采样
        sampled_chunks = []
        group_keys = list(page_groups.keys())
        random.shuffle(group_keys)

        max_chunks = 25
        for key in group_keys:
            if len(sampled_chunks) >= max_chunks:
                break
            # 每组最多取2个片段
            group_chunks = page_groups[key][:2]
            sampled_chunks.extend(group_chunks)

        # 如果采样不足，补充随机片段
        if len(sampled_chunks) < max_chunks:
            remaining = [c for c in chunks if c not in sampled_chunks]
            random.shuffle(remaining)
            sampled_chunks.extend(remaining[:max_chunks - len(sampled_chunks)])

        # 构建材料文本
        materials = "\n\n---\n\n".join([
            f"[来源: {chunk['metadata'].get('source', '未知')}, "
            f"第{chunk['metadata'].get('page', '?')}页]\n{chunk['text']}"
            for chunk in sampled_chunks
        ])

        # 构建题目要求
        type_names = {
            "single_choice": "单选题",
            "multi_choice": "多选题",
            "true_false": "判断题",
            "short_answer": "简答题"
        }

        requirements = []
        for q_type, count in counts.items():
            if count > 0:
                requirements.append(f"{type_names.get(q_type, q_type)}: {count}道")

        # 构建已有题目文本（用于去重提示）
        existing_hint = ""
        if existing_questions:
            existing_texts = [q[:80] for q in existing_questions[:30]]
            existing_hint = f"""

特别注意 - 以下题目已经出过，请勿重复或出相似题目：
{chr(10).join(f'- {t}' for t in existing_texts)}"""

        # 构建Prompt
        system_prompt = """你是专业的考试出题专家。根据提供的复习材料生成测试题目。

要求：
1. 题目必须基于材料内容，不能编造事实
2. 答案必须有明确的材料依据
3. 每道题标注知识点和材料出处
4. 选择题选项要有迷惑性但不能有歧义
5. 简答题参考答案要全面准确
6. 题目要有创新性，避免使用常见的模板化问法
7. 从不同角度考查知识点，增加题目多样性
8. 严禁与已有题目重复或高度相似，必须从不同知识点、不同角度出题

题目类型必须严格使用：single_choice, multi_choice, true_false, short_answer

返回JSON格式：
{
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "question": "题目内容",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "answer": "A",
      "explanation": "解析说明",
      "source_reference": "文档名-第X页",
      "knowledge_point": "知识点名称"
    }
  ]
}"""

        # 扩展随机提示词池
        random_hints = [
            "请从不同知识点出发设计题目",
            "题目设计要有创新性，避免模板化",
            "注重考查理解和应用能力",
            "题目要有一定的深度和难度",
            "从实际应用场景出发设计题目",
            "重点考查容易混淆的知识点",
            "从反向思维角度出题（如：哪个说法是错误的）",
            "结合多个知识点设计综合性题目",
            "从边界条件和特殊情况出发设计题目",
            "注重考查原理理解而非死记硬背",
            "从对比分析的角度设计题目",
            "设计需要推理才能得出答案的题目",
            "从常见误区和易错点出发设计题目",
            "注重考查知识点之间的关联和区别",
            "从实际项目中的典型问题出发设计题目",
        ]

        # 随机选择2-3个提示词
        selected_hints = random.sample(random_hints, min(3, len(random_hints)))
        # 随机考查角度
        angles = ["记忆", "理解", "应用", "分析", "评价", "创造"]
        selected_angle = random.choice(angles)
        # 随机难度
        difficulties = ["基础", "中等", "较难"]
        selected_difficulty = random.choice(difficulties)

        user_prompt = f"""复习材料：
{materials}

请生成以下题目：
{chr(10).join(requirements)}

出题要求：
- 考查角度：{selected_angle}层次
- 难度级别：{selected_difficulty}
- {'; '.join(selected_hints)}{existing_hint}"""

        # 调用LLM
        provider = create_provider(
            provider_name or self.settings.LLM_PROVIDER,
            api_key=self._get_api_key(provider_name),
            model=self._get_model(provider_name)
        )

        response = provider.generate_json(user_prompt, system_prompt)

        questions = response.get("questions", [])

        # 去重：过滤与已有题目高度相似的
        if existing_questions:
            questions = self._deduplicate_questions(questions, existing_questions)

        # 记录新题目hash
        self._save_question_hashes(questions, document_ids)

        return questions

    def _get_existing_questions(self, document_ids: List[int]) -> List[str]:
        """获取已有题目文本用于去重"""
        db_path = Path(self.settings.CHROMA_PERSIST_DIR).parent / "review.db"
        if not db_path.exists():
            return []

        try:
            conn = sqlite3.connect(str(db_path), timeout=30.0)
            rows = conn.execute("""
                SELECT question_text FROM test_answers
                WHERE session_id IN (
                    SELECT id FROM test_sessions
                    WHERE document_ids IN ({})
                )
            """.format(",".join(["?"] * len(document_ids)).document_ids),
            [json.dumps(document_ids)] * len(document_ids)).fetchall()
            conn.close()
            return [row[0] for row in rows]
        except:
            return []

    def _deduplicate_questions(
        self,
        questions: List[Dict[str, Any]],
        existing_questions: List[str]
    ) -> List[Dict[str, Any]]:
        """去重：过滤与已有题目高度相似的"""
        result = []
        for q in questions:
            q_text = q.get("question", "")
            # 简单相似度检查：如果题目前20个字符完全相同，认为重复
            q_prefix = q_text[:20].strip()
            is_dup = any(
                eq[:20].strip() == q_prefix
                for eq in existing_questions
            )
            if not is_dup:
                result.append(q)
        return result

    def _save_question_hashes(
        self,
        questions: List[Dict[str, Any]],
        document_ids: List[int]
    ):
        """保存题目hash用于去重"""
        db_path = Path(self.settings.CHROMA_PERSIST_DIR).parent / "review.db"
        if not db_path.exists():
            return

        try:
            import hashlib
            conn = sqlite3.connect(str(db_path), timeout=30.0)
            for q in questions:
                q_text = q.get("question", "")
                q_hash = hashlib.md5(q_text.encode()).hexdigest()
                try:
                    conn.execute("""
                        INSERT OR IGNORE INTO question_hashes (question_hash, question_text, document_ids)
                        VALUES (?, ?, ?)
                    """, (q_hash, q_text, json.dumps(document_ids)))
                except:
                    pass
            conn.commit()
            conn.close()
        except:
            pass

    def grade_answer(
        self,
        question: Dict[str, Any],
        user_answer: Any,
        provider_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """评分答案

        Args:
            question: 题目数据
            user_answer: 用户答案
            provider_name: LLM Provider名称

        Returns:
            评分结果
        """
        q_type = question["type"]

        # 选择题和判断题直接比对
        if q_type in ["single_choice", "true_false"]:
            is_correct = str(user_answer) == str(question["answer"])
            return {
                "is_correct": is_correct,
                "score": 1.0 if is_correct else 0.0,
                "feedback": None
            }

        # 多选题部分给分
        if q_type == "multi_choice":
            correct_set = set(question["answer"]) if isinstance(question["answer"], list) else set([question["answer"]])
            user_set = set(user_answer) if isinstance(user_answer, list) else set([user_answer])

            if user_set == correct_set:
                return {"is_correct": True, "score": 2.0, "feedback": None}
            elif user_set & correct_set:
                return {"is_correct": False, "score": 1.0, "feedback": "部分正确"}
            else:
                return {"is_correct": False, "score": 0.0, "feedback": None}

        # 简答题LLM评分
        system_prompt = """你是专业的阅卷老师。根据复习材料判断用户答案的准确性。

评分标准：
- 完全正确: 8-10分
- 基本正确但有小瑕疵: 6-7分
- 部分正确: 4-5分
- 有一定相关性但错误较多: 2-3分
- 完全错误或无关: 0-1分

返回JSON格式：
{
  "score": 8,
  "feedback": "评价说明，指出缺失要点"
}"""

        user_prompt = f"""参考答案：
{question.get('reference_answer', question['answer'])}

材料依据：
{question.get('source_reference', '')}

用户答案：
{user_answer}

请给出评分和评语。评分必须基于材料内容，不能主观臆断。"""

        provider = create_provider(
            provider_name or self.settings.LLM_PROVIDER,
            api_key=self._get_api_key(provider_name),
            model=self._get_model(provider_name)
        )

        response = provider.generate_json(user_prompt, system_prompt)

        return {
            "is_correct": None,
            "score": float(response.get("score", 0)),
            "feedback": response.get("feedback")
        }

    def _get_api_key(self, provider_name: Optional[str]) -> Optional[str]:
        """获取API Key"""
        provider = provider_name or self.settings.LLM_PROVIDER
        key_map = {
            "openai": self.settings.OPENAI_API_KEY,
            "anthropic": self.settings.ANTHROPIC_API_KEY,
            "deepseek": self.settings.DEEPSEEK_API_KEY,
            "zhipu": self.settings.ZHIPU_API_KEY
        }
        return key_map.get(provider)

    def _get_model(self, provider_name: Optional[str]) -> str:
        """获取模型名称"""
        provider = provider_name or self.settings.LLM_PROVIDER
        model_map = {
            "openai": self.settings.OPENAI_MODEL,
            "anthropic": self.settings.ANTHROPIC_MODEL,
            "deepseek": self.settings.DEEPSEEK_MODEL,
            "zhipu": self.settings.ZHIPU_MODEL,
            "ollama": self.settings.OLLAMA_MODEL
        }
        return model_map.get(provider, "gpt-3.5-turbo")