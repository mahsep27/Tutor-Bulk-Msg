export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Tuitions?fields[]=Tuition ID&fields[]=Tuition ads&sort[0][field]=Tuition ID&sort[0][direction]=asc`;

    let allRecords = [];
    let offset = null;

    do {
      const paginatedUrl = offset ? `${url}&offset=${offset}` : url;
      const response = await fetch(paginatedUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: 'Airtable error', details: data });
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    const tuitions = allRecords
      .filter(r => r.fields?.['Tuition ID'] && r.fields?.['Tuition ads'])
      .map(r => ({
        id: r.id,
        tuitionId: r.fields['Tuition ID'],
        message: r.fields['Tuition ads'],
      }));

    return res.status(200).json({ tuitions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
