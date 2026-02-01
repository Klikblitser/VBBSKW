// Vercel Serverless Function voor Leden
// Gebruikt Supabase voor data opslag

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
        // GET - Haal alle leden op
        if (req.method === 'GET') {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/leden?select=*&order=created_at.desc`,
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

            const leden = await response.json();
            return res.status(200).json(leden);
        }

        // POST - Nieuw lid toevoegen
        if (req.method === 'POST') {
            const { naam, foto, vraag1, vraag2, vraag3, vraag4 } = req.body;

            if (!naam || naam.trim().length === 0) {
                return res.status(400).json({ error: 'Naam is verplicht' });
            }

            // Beperk foto grootte (max 500KB base64)
            if (foto && foto.length > 700000) {
                return res.status(400).json({ error: 'Foto te groot (max 500KB)' });
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/leden`,
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
                        foto: foto || null,
                        vraag1: vraag1?.trim().substring(0, 500) || null,
                        vraag2: vraag2?.trim().substring(0, 500) || null,
                        vraag3: vraag3?.trim().substring(0, 1000) || null,
                        vraag4: vraag4?.trim().substring(0, 1000) || null
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.error('Supabase error:', error);
                throw new Error('Database error');
            }

            const newLid = await response.json();
            return res.status(201).json(newLid[0]);
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ 
            error: 'Er is een fout opgetreden' 
        });
    }
}

