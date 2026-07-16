import { NextApiRequest, NextApiResponse } from 'next';
import getDB from '@/lib/db/client';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getDB();

  try {
    const documents = db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
    res.status(200).json({ documents });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
}