// Vercel Serverless Function voor Ideeën
// Gebruikt Supabase voor data opslag

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'Database niet geconfigureerd' });
    }

    try {
        // GET - Haal alle ideeën op
        if (req.method === 'GET') {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/ideeen?select=*&order=created_at.desc`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Database error');
            }

            const ideeen = await response.json();
            return res.status(200).json(ideeen);
        }

        // POST - Nieuw idee toevoegen
        if (req.method === 'POST') {
            const { naam, inhoud } = req.body;

            if (!naam || naam.trim().length === 0) {
                return res.status(400).json({ error: 'Naam is verplicht' });
            }

            if (!inhoud || inhoud.trim().length === 0) {
                return res.status(400).json({ error: 'Inhoud is verplicht' });
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/ideeen`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        naam: naam.trim().substring(0, 100),
                        inhoud: inhoud.trim().substring(0, 2000),
                        upvotes: 0,
                        downvotes: 0
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.error('Supabase error:', error);
                throw new Error('Database error');
            }

            const newIdee = await response.json();
            return res.status(201).json(newIdee[0]);
        }

        // PATCH - Vote op een idee
        if (req.method === 'PATCH') {
            const { id, vote } = req.body;

            if (!id || !vote || !['up', 'down'].includes(vote)) {
                return res.status(400).json({ error: 'Ongeldige vote' });
            }

            // Eerst huidige waarde ophalen
            const getResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/ideeen?id=eq.${id}&select=upvotes,downvotes`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            if (!getResponse.ok) {
                throw new Error('Database error');
            }

            const current = await getResponse.json();
            if (current.length === 0) {
                return res.status(404).json({ error: 'Idee niet gevonden' });
            }

            const updateField = vote === 'up' ? 'upvotes' : 'downvotes';
            const newValue = (current[0][updateField] || 0) + 1;

            // Update de vote
            const updateResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/ideeen?id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        [updateField]: newValue
                    })
                }
            );

            if (!updateResponse.ok) {
                throw new Error('Database error');
            }

            const updated = await updateResponse.json();
            return res.status(200).json(updated[0]);
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ 
            error: 'Er is een fout opgetreden' 
        });
    }
}

