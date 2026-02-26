export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  try {
    const formula = encodeURIComponent("OR({Status} = "Approved", {Status} = "Engaged")");
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Tuitions?fields[]=Custom ID&fields[]=Tuition Ad (Bulk Tutor Msg)&fields[]=Status&filterByFormula=${formula}&sort[0][field]=Custom ID&sort[0][direction]=asc`;

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
      .filter(r => r.fields?.['Custom ID'] && r.fields?.['Tuition Ad (Bulk Tutor Msg)'])
      .map(r => ({
        id: r.id,
        tuitionId: r.fields['Custom ID'],
        message: r.fields['Tuition Ad (Bulk Tutor Msg)'],
      }));

    return res.status(200).json({ tuitions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
