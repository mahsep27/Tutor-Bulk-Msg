export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Tutors';

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    // Exact field names from Airtable: "Name", "Phone Number", "tutor ID", "Profile Status"
    const formula = encodeURIComponent(`{Profile Status} = "Profile Approved"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?fields[]=Name&fields[]=Phone Number&fields[]=tutor ID&fields[]=Profile Status&filterByFormula=${formula}&sort[0][field]=Name&sort[0][direction]=asc`;

    let allRecords = [];
    let offset = null;

    do {
      const paginatedUrl = offset ? `${url}&offset=${offset}` : url;
      const response = await fetch(paginatedUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Airtable error', details: data });
      }

      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    const tutors = allRecords
      .filter(r => r.fields?.Name && r.fields?.['Phone Number'])
      .map(r => ({
        id: r.id,
        name: r.fields.Name,
        phone: r.fields['Phone Number'],
        tutorId: r.fields['tutor ID'] || '—',
      }));

    return res.status(200).json({ tutors });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
