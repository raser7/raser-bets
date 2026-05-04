import { uploadAudioToCloudinary, deleteAudioFromCloudinary } from '../src/server/cloudinaryAudio.js';
import { GeminiTtsError, generateGeminiSpeech } from '../src/server/geminiTts.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const text = body?.text?.trim() || '';
    const previousPublicId = body?.previousPublicId?.trim() || '';

    if (!text) {
      if (previousPublicId) {
        await deleteAudioFromCloudinary(previousPublicId);
      }

      return res.status(200).json({
        audioUrl: '',
        publicId: '',
      });
    }

    const wavBuffer = await generateGeminiSpeech(text);
    const publicId = `raserbets/audio/pronostico-actual-${Date.now()}`;
    const uploadResult = await uploadAudioToCloudinary(wavBuffer, publicId);

    if (previousPublicId && previousPublicId !== uploadResult.publicId) {
      try {
        await deleteAudioFromCloudinary(previousPublicId);
      } catch (deleteError) {
        console.error('No se pudo borrar el audio anterior:', deleteError);
      }
    }

    return res.status(200).json({
      audioUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    });
  } catch (error) {
    const status = error instanceof GeminiTtsError ? error.status : 500;
    return res.status(status).json({
      error: error.message || 'No se pudo publicar el audio.',
    });
  }
}
