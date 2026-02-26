// Schedules all messages via QStash — browser can close after this returns
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { recipients, message } = req.body;

  if (!recipients?.length) return res.status(400).json({ error: 'No recipients' });
  if (!message?.trim()) return res.status(400).json({ error: 'No message' });

  const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
  if (!QSTASH_TOKEN) return res.status(500).json({ error: 'QSTASH_TOKEN not configured' });

  // The public URL of your send-one endpoint
  const SITE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.SITE_URL;

  if (!SITE_URL) return res.status(500).json({ error: 'SITE_URL not configured' });

  const DELAY_BETWEEN = 5; // seconds between each message (fixed, QStash uses seconds)

  try {
    const scheduled = [];

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const delaySeconds = i * DELAY_BETWEEN;

      const response = await fetch(`https://qstash.upstash.io/v2/publish/${SITE_URL}/api/send-one`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${QSTASH_TOKEN}`,
          'Content-Type': 'application/json',
          'Upstash-Delay': `${delaySeconds}s`,
          'Upstash-Retries': '2',
        },
        body: JSON.stringify({
          name: r.name,
          phone: r.phone,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error(`Failed to queue ${r.name}:`, err);
        scheduled.push({ name: r.name, queued: false, error: err?.error || 'Queue failed' });
      } else {
        scheduled.push({ name: r.name, queued: true, estimatedSendAt: `~${Math.round(delaySeconds / 60)} min` });
      }
    }

    const queuedCount = scheduled.filter(s => s.queued).length;
    const totalDuration = Math.ceil((recipients.length - 1) * DELAY_BETWEEN / 60);

    return res.status(200).json({
      success: true,
      queued: queuedCount,
      total: recipients.length,
      estimatedCompletion: `~${totalDuration} minute${totalDuration !== 1 ? 's' : ''}`,
      scheduled,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
