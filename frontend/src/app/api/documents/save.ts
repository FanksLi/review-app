import { NextApiRequest, NextApiResponse } from 'next';
import getDB from '@/lib/db/client';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getDB();

  try {
    const { documentId, filename, fileType, chunkCount, pythonDocId } = req.body;

    const stmt = db.prepare(`
      INSERT INTO documents (id, filename, file_type, chunk_count, python_doc_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(documentId, filename, fileType, chunkCount, pythonDocId);

    res.status(200).json({ success: true, documentId });
  } catch (error) {
    console.error('Save document error:', error);
    res.status(500).json({ error: 'Failed to save document' });
  }
}