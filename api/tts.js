import { GeminiTtsError, generateGeminiSpeech } from '../src/server/geminiTts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  try {
    const text = typeof req.body === 'string' ? JSON.parse(req.body).text : req.body?.text;
    const wavBuffer = await generateGeminiSpeech(text);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(wavBuffer);
  } catch (error) {
    const status = error instanceof GeminiTtsError ? error.status : 500;
    return res.status(status).json({
      error: error.message || 'Error interno al generar audio con Gemini.',
    });
  }
}
