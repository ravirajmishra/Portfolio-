// api/chat.js — Vercel Serverless Function
// Set GEMINI_API_KEY in Vercel → Settings → Environment Variables
// Get free key at: aistudio.google.com/apikey

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_API_KEY;
  if(!key) return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables' });

  const { messages, system } = req.body || {};
  if(!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' });

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system || '' }] },
          contents,
          generationConfig: { maxOutputTokens: 700, temperature: 0.75 }
        })
      }
    );
    const data = await r.json();
    if(!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Gemini API error' });
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ reply });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
