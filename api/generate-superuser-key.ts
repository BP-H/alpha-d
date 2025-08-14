import { randomBytes } from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const key = randomBytes(16).toString('hex');
  res.status(200).json({ ok: true, key });
}
