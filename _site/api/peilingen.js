// Vercel Serverless Function voor Peilingen
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
        // GET - Haal resultaten op voor een peiling
        if (req.method === 'GET') {
            const { peiling_id } = req.query;

            if (!peiling_id) {
                return res.status(400).json({ error: 'peiling_id is verplicht' });
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/peiling_stemmen?peiling_id=eq.${peiling_id}&select=antwoord`,
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

            const stemmen = await response.json();
            
            // Tel stemmen per antwoord
            const resultaten = {};
            let totaal = 0;
            
            stemmen.forEach(stem => {
                resultaten[stem.antwoord] = (resultaten[stem.antwoord] || 0) + 1;
                totaal++;
            });

            return res.status(200).json({ 
                resultaten, 
                totaal 
            });
        }

        // POST - Nieuwe stem toevoegen
        if (req.method === 'POST') {
            const { peiling_id, antwoord } = req.body;

            if (!peiling_id || !antwoord) {
                return res.status(400).json({ error: 'peiling_id en antwoord zijn verplicht' });
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/peiling_stemmen`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        peiling_id: peiling_id.substring(0, 50),
                        antwoord: antwoord.substring(0, 100)
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.error('Supabase error:', error);
                throw new Error('Database error');
            }

            return res.status(201).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ 
            error: 'Er is een fout opgetreden' 
        });
    }
}

