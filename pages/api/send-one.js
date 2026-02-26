// Called by QStash for each individual message
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone, message } = req.body;

  if (!phone || !message) return res.status(400).json({ error: 'Missing phone or message' });

  const WASENDER_API_KEY = process.env.WASENDER_API_KEY;
  if (!WASENDER_API_KEY) return res.status(500).json({ error: 'WaSender API key not configured' });

  const normalizedPhone = '+' + phone.replace(/[^0-9]/g, '');

  try {
    const response = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WASENDER_API_KEY}`,
      },
      body: JSON.stringify({ to: normalizedPhone, text: message.trim() }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✓ Sent to ${name} (${normalizedPhone})`);
      return res.status(200).json({ status: 'sent', name, phone: normalizedPhone });
    } else {
      console.error(`✗ Failed to send to ${name}:`, data);
      // Return 500 so QStash retries
      return res.status(500).json({ status: 'failed', name, error: data?.message || 'Unknown error' });
    }
  } catch (err) {
    console.error(`✗ Error sending to ${name}:`, err.message);
    return res.status(500).json({ status: 'failed', name, error: err.message });
  }
}
