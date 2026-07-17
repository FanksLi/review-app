# Error Statistics Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add error trend line chart and error type distribution bar chart to stats page

**Architecture:** Backend adds 2 FastAPI endpoints for error aggregation, frontend adds Recharts components for visualization

**Tech Stack:** FastAPI, SQLite, Next.js, Recharts, TypeScript

---

## File Structure

**Backend:**
- Modify: `backend/app/routers/stats.py` - Add error-trend and error-types endpoints

**Frontend:**
- Create: `frontend/src/components/stats/ErrorTrendChart.tsx` - Line chart for error trend
- Create: `frontend/src/components/stats/ErrorTypesChart.tsx` - Bar chart for error type distribution
- Modify: `frontend/src/app/stats/page.tsx` - Integrate new charts
- Modify: `frontend/package.json` - Add recharts dependency

---

### Task 1: Add error-trend endpoint

**Files:**
- Modify: `backend/app/routers/stats.py`

- [ ] **Step 1: Add error-trend endpoint**

Add to `backend/app/routers/stats.py` after line 51:

```python
@router.get("/error-trend")
async def get_error_trend(days: int = 7):
    """获取错误趋势"""
    conn = get_db()

    rows = conn.execute("""
        SELECT DATE(s.completed_at) as date,
               COUNT(*) as error_count
        FROM test_answers a
        JOIN test_sessions s ON a.session_id = s.id
        WHERE s.completed_at IS NOT NULL
          AND (a.is_correct = 0 OR a.score < a.max_score)
          AND DATE(s.completed_at) >= DATE('now', ?)
        GROUP BY DATE(s.completed_at)
        ORDER BY date DESC
    """, (f'-{days} days',)).fetchall()

    conn.close()

    trend = [{"date": row["date"], "error_count": row["error_count"]} for row in rows]
    return trend
```

- [ ] **Step 2: Commit**

```bash
cd /d/projects/learn/review-app
git add backend/app/routers/stats.py
git commit -m "feat: add /stats/error-trend endpoint"
```

---

### Task 2: Add error-types endpoint

**Files:**
- Modify: `backend/app/routers/stats.py`

- [ ] **Step 1: Add error-types endpoint**

Add to `backend/app/routers/stats.py` after error-trend endpoint:

```python
@router.get("/error-types")
async def get_error_types():
    """获取错误类型分布"""
    conn = get_db()

    rows = conn.execute("""
        SELECT question_type, COUNT(*) as count
        FROM test_answers
        WHERE is_correct = 0 OR score < max_score
        GROUP BY question_type
    """).fetchall()

    conn.close()

    total = sum(row["count"] for row in rows)
    types = [
        {
            "type": row["question_type"],
            "count": row["count"],
            "percentage": round((row["count"] / total * 100), 1) if total > 0 else 0
        }
        for row in rows
    ]
    return types
```

- [ ] **Step 2: Commit**

```bash
cd /d/projects/learn/review-app
git add backend/app/routers/stats.py
git commit -m "feat: add /stats/error-types endpoint"
```

---

### Task 3: Install recharts dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install recharts**

```bash
cd /d/projects/learn/review-app/frontend
npm install recharts
```

- [ ] **Step 2: Commit**

```bash
cd /d/projects/learn/review-app
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add recharts dependency"
```

---

### Task 4: Create ErrorTrendChart component

**Files:**
- Create: `frontend/src/components/stats/ErrorTrendChart.tsx`

- [ ] **Step 1: Create ErrorTrendChart component**

Create file `frontend/src/components/stats/ErrorTrendChart.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { callPythonAPI } from "@/lib/api/client";

interface ErrorTrendData {
  date: string;
  error_count: number;
}

export default function ErrorTrendChart() {
  const [data, setData] = useState<ErrorTrendData[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const result = await callPythonAPI<ErrorTrendData[]>(`/api/stats/error-trend?days=${days}`);
        setData(result);
      } catch (error) {
        console.error('Failed to fetch error trend:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, [days]);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">错误趋势</h2>
        <div className="flex gap-2">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-sm rounded ${
                days === d ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          暂无错误数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="error_count" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/projects/learn/review-app
git add frontend/src/components/stats/ErrorTrendChart.tsx
git commit -m "feat: add ErrorTrendChart component"
```

---

### Task 5: Create ErrorTypesChart component

**Files:**
- Create: `frontend/src/components/stats/ErrorTypesChart.tsx`

- [ ] **Step 1: Create ErrorTypesChart component**

Create file `frontend/src/components/stats/ErrorTypesChart.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { callPythonAPI } from "@/lib/api/client";

interface ErrorTypeData {
  type: string;
  count: number;
  percentage: number;
}

const typeLabels: Record<string, string> = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  short_answer: '简答题'
};

export default function ErrorTypesChart() {
  const [data, setData] = useState<ErrorTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const result = await callPythonAPI<ErrorTypeData[]>('/api/stats/error-types');
        setData(result);
      } catch (error) {
        console.error('Failed to fetch error types:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;

  const chartData = data.map(item => ({
    ...item,
    label: typeLabels[item.type] || item.type
  }));

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="font-semibold mb-4">错误类型分布</h2>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          暂无错误数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="label" type="category" width={80} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'count') return [value, '错误数'];
                return [value, name];
              }}
            />
            <Bar dataKey="count" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/projects/learn/review-app
git add frontend/src/components/stats/ErrorTypesChart.tsx
git commit -m "feat: add ErrorTypesChart component"
```

---

### Task 6: Integrate charts into stats page

**Files:**
- Modify: `frontend/src/app/stats/page.tsx`

- [ ] **Step 1: Import new components**

Add imports at top of `frontend/src/app/stats/page.tsx` after line 4:

```tsx
import ErrorTrendChart from "@/components/stats/ErrorTrendChart";
import ErrorTypesChart from "@/components/stats/ErrorTypesChart";
```

- [ ] **Step 2: Add chart section**

Add before the closing `</div>` at line 115, after the existing trend chart:

```tsx
        {/* 错误统计 */}
        {stats.totalTests > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ErrorTrendChart />
            </div>
            <div className="lg:col-span-1">
              <ErrorTypesChart />
            </div>
          </div>
        )}
```

- [ ] **Step 3: Commit**

```bash
cd /d/projects/learn/review-app
git add frontend/src/app/stats/page.tsx
git commit -m "feat: integrate error charts into stats page"
```

---

### Task 7: Test and verify

- [ ] **Step 1: Start backend**

```bash
cd /d/projects/learn/review-app/backend
uvicorn app.main:app --reload
```

- [ ] **Step 2: Test API endpoints**

```bash
curl http://localhost:8000/api/stats/error-trend?days=7
curl http://localhost:8000/api/stats/error-types
```

Expected: JSON arrays with error data

- [ ] **Step 3: Start frontend**

```bash
cd /d/projects/learn/review-app/frontend
npm run dev
```

- [ ] **Step 4: Verify UI**

Open `http://localhost:3000/stats`

Expected: See error trend chart and error types chart below existing stats

- [ ] **Step 5: Final commit (if needed)**

```bash
cd /d/projects/learn/review-app
git add -A
git commit -m "feat: complete error statistics visualization"
```