# Error Statistics Visualization Design

**Date**: 2026-07-17
**Status**: Approved

## Overview

Add error trend visualization to the stats page with:
- Error count trend line chart (by date)
- Error type distribution bar chart (by question type)

## Architecture

**Backend**: 2 new FastAPI endpoints in `backend/app/routers/stats.py`
**Frontend**: 2 new chart components using Recharts
**Data Source**: SQLite aggregation queries on `test_answers` table

## Data Models

### ErrorTrend
```typescript
interface ErrorTrend {
  date: string        // "2026-07-17"
  error_count: number // count of errors on that date
}
```

### ErrorType
```typescript
interface ErrorType {
  type: string        // "single_choice", "multi_choice", etc.
  count: number       // error count for this type
  percentage: number  // percentage of total errors (e.g., 11.8)
}
```

## API Endpoints

### GET `/stats/error-trend?days=7`

Query parameters:
- `days`: number (default: 7) - number of days to look back

SQL query:
```sql
SELECT DATE(s.completed_at) as date,
       COUNT(*) as error_count
FROM test_answers a
JOIN test_sessions s ON a.session_id = s.id
WHERE s.completed_at IS NOT NULL
  AND (a.is_correct = 0 OR a.score < a.max_score)
  AND DATE(s.completed_at) >= DATE('now', '-N days')
GROUP BY DATE(s.completed_at)
ORDER BY date DESC
```

Error criteria: `is_correct = 0 OR score < max_score`

Response:
```json
[
  {"date": "2026-07-17", "error_count": 8},
  {"date": "2026-07-15", "error_count": 9}
]
```

### GET `/stats/error-types`

SQL query:
```sql
SELECT question_type,
       COUNT(*) as count
FROM test_answers
WHERE is_correct = 0 OR score < max_score
GROUP BY question_type
```

Response:
```json
[
  {"type": "single_choice", "count": 2, "percentage": 11.8},
  {"type": "multi_choice", "count": 3, "percentage": 17.6},
  {"type": "true_false", "count": 6, "percentage": 35.3},
  {"type": "short_answer", "count": 6, "percentage": 35.3}
]
```

## Frontend Components

### New Dependencies

Install `recharts`:
```bash
npm install recharts
```

### ErrorTrendChart Component

- Line chart showing error count over time
- Time range selector (7 days / 30 days / all)
- Hover tooltip showing exact count
- Responsive width

### ErrorTypesChart Component

- Bar chart showing error distribution by question type
- X-axis: question type
- Y-axis: error count
- Hover tooltip showing count and percentage

### Layout Integration

Location: `frontend/src/app/stats/page.tsx`

Layout structure:
```
[Existing overview cards: totalTests, avgScore, totalDocuments]
[Existing trend chart: recent scores]

[NEW ROW]
┌─────────────────────────┬─────────────────┐
│  Error Trend (2/3)      │  Error Types    │
│  Line chart             │  Bar chart      │
│  7d/30d/all toggle      │                 │
└─────────────────────────┴─────────────────┘
```

Mobile: Stack vertically (full width each)

## Error Handling

- API failure: Show error message, keep other stats visible
- No data: Show empty chart with "No error data" message
- Loading: Reuse existing `Loader2` spinner

## Testing & Verification

1. Verify SQL queries return correct aggregation
2. Test date range parameter works correctly
3. Verify percentage calculation sums to 100%
4. Test responsive layout (desktop/mobile)
5. Verify chart tooltips and interactions

## Implementation Order

1. Backend: Add `/stats/error-trend` endpoint
2. Backend: Add `/stats/error-types` endpoint
3. Frontend: Install recharts dependency
4. Frontend: Create ErrorTrendChart component
5. Frontend: Create ErrorTypesChart component
6. Frontend: Integrate into stats page layout
7. Test full flow end-to-end