// pages/api/send.js
// Receives list of phone numbers + message, sends via WaSender API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipients, message } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients provided' });
  }
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const WASENDER_API_KEY = process.env.WASENDER_API_KEY;
  if (!WASENDER_API_KEY) {
    return res.status(500).json({ error: 'WaSender API key not configured' });
  }

  const results = [];

  for (const recipient of recipients) {
    const { name, phone } = recipient;

    // Normalize phone number — strip spaces, dashes, parentheses
    // WaSender expects international format without + e.g. 923001234567
    const normalizedPhone = '+' + phone.replace(/[^0-9]/g, '');

    try {
      const response = await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WASENDER_API_KEY}`,
        },
        body: JSON.stringify({
          to: normalizedPhone,
          text: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        results.push({ name, phone, status: 'sent' });
      } else {
        console.error(`Failed to send to ${name} (${phone}):`, data);
        results.push({ name, phone, status: 'failed', error: data?.message || 'Unknown error' });
      }
    } catch (err) {
      console.error(`Error sending to ${name}:`, err.message);
      results.push({ name, phone, status: 'failed', error: err.message });
    }

    // Random delay 3-6s between messages to avoid WhatsApp spam detection
    const delay = 3000 + Math.floor(Math.random() * 3000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const successCount = results.filter(r => r.status === 'sent').length;
  const failCount = results.filter(r => r.status === 'failed').length;

  return res.status(200).json({
    summary: { total: recipients.length, sent: successCount, failed: failCount },
    results,
  });
}
