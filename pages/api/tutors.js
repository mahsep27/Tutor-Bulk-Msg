// pages/api/tutors.js
// Fetches all tutors from Airtable and returns name + phone number

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Tutors';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return res.status(500).json({ error: 'Airtable credentials not configured' });
    }

    // Use Airtable REST API directly (no extra package needed beyond fetch)
    // Only fetch approved tutors using Airtable filterByFormula
    const formula = encodeURIComponent(`{Profile Status} = "Profile Approved"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?fields[]=Name&fields[]=Phone Number&fields[]=Tutor ID&filterByFormula=${formula}&sort[0][field]=Name&sort[0][direction]=asc`;

    let allRecords = [];
    let offset = null;

    // Handle pagination — Airtable returns max 100 records per page
    do {
      const paginatedUrl = offset ? `${url}&offset=${offset}` : url;
      const response = await fetch(paginatedUrl, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Airtable error:', errorData);
        return res.status(response.status).json({ error: 'Failed to fetch from Airtable', details: errorData });
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    // Map to clean tutor objects, skip records missing name or phone
    const tutors = allRecords
      .filter(record => record.fields?.Name && record.fields?.['Phone Number'])
      .map(record => ({
        id: record.id,
        name: record.fields.Name,
        phone: record.fields['Phone Number'],
        tutorId: record.fields['Tutor ID'] || '—',
      }));

    return res.status(200).json({ tutors });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
