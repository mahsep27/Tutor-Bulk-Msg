export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Tutors';

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Missing env vars', hasKey: !!AIRTABLE_API_KEY, hasBase: !!AIRTABLE_BASE_ID });
  }

  try {
    // Step 1: fetch WITHOUT any filter or field restrictions to see raw data
    const rawUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?maxRecords=1`;
    const rawRes = await fetch(rawUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const rawData = await rawRes.json();

    if (!rawRes.ok) {
      return res.status(rawRes.status).json({ step: 'raw_fetch', error: rawData });
    }

    // Return the field names from the first record so we can see exact column names
    const firstRecord = rawData.records?.[0];
    const fieldNames = firstRecord ? Object.keys(firstRecord.fields) : [];

    return res.status(200).json({
      debug: true,
      tableName: AIRTABLE_TABLE_NAME,
      totalReturned: rawData.records?.length,
      fieldNamesInFirstRecord: fieldNames,
      firstRecordSample: firstRecord?.fields,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
