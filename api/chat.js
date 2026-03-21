// api/chat.js
export default async function handler(req, res) {
  // 1. Strict CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Reject anything that isn't a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('CRITICAL: GEMINI_API_KEY is missing from environment variables.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { messages, system } = req.body || {};
    
    // 2. Payload Validation
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid payload: messages array is required' });
    }

    // Map messages cleanly
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // 3. API Call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          generationConfig: { 
            maxOutputTokens: 800, 
            temperature: 0.7 
          }
        })
      }
    );

    const data = await response.json();
    
    // 4. Graceful Error Forwarding
    if (!response.ok) {
      console.error('Gemini API Error:', data.error);
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API request failed' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    return res.status(500).json({ error: 'Internal server error while processing request' });
  }
}
