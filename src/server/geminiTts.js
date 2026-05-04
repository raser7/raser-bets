const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';
const MAX_CHARS_PER_CHUNK = 3200;
const MAX_TOTAL_CHARS = 24000;

export class GeminiTtsError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'GeminiTtsError';
    this.status = status;
  }
}

function buildWavHeader(dataLength, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

function pcmToWavBuffer(pcmBuffer) {
  const header = buildWavHeader(pcmBuffer.length);
  return Buffer.concat([header, pcmBuffer]);
}

function splitTextIntoChunks(text, maxChars = MAX_CHARS_PER_CHUNK) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = '';

  const pushChunk = () => {
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  };

  const addPiece = (piece) => {
    if (!piece) return;

    if (!currentChunk) {
      currentChunk = piece;
      return;
    }

    const candidate = `${currentChunk}\n\n${piece}`;
    if (candidate.length <= maxChars) {
      currentChunk = candidate;
    } else {
      pushChunk();
      currentChunk = piece;
    }
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      addPiece(paragraph);
      continue;
    }

    const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
    let sentenceBlock = '';

    for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
      if (sentence.length > maxChars) {
        if (sentenceBlock) {
          addPiece(sentenceBlock.trim());
          sentenceBlock = '';
        }

        for (let i = 0; i < sentence.length; i += maxChars) {
          addPiece(sentence.slice(i, i + maxChars).trim());
        }
        continue;
      }

      const candidate = sentenceBlock ? `${sentenceBlock} ${sentence}` : sentence;
      if (candidate.length <= maxChars) {
        sentenceBlock = candidate;
      } else {
        addPiece(sentenceBlock.trim());
        sentenceBlock = sentence;
      }
    }

    if (sentenceBlock) {
      addPiece(sentenceBlock.trim());
    }
  }

  pushChunk();
  return chunks;
}

async function synthesizeChunk(text) {
  const prompt = [
    'Read the following report in Spanish.',
    'Keep the exact meaning.',
    'Use a clear, natural, confident, premium tone for VIP sports betting clients.',
    'Do not add any introduction or conclusion.',
    '',
    text,
  ].join('\n');

  const response = await fetch(
    `${GEMINI_API_URL}/${DEFAULT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: DEFAULT_VOICE,
              },
            },
          },
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new GeminiTtsError(
      data?.error?.message || 'Gemini no pudo generar el audio en este momento.',
      response.status
    );
  }

  const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioBase64) {
    throw new GeminiTtsError('Gemini respondió sin audio utilizable.', 502);
  }

  return Buffer.from(audioBase64, 'base64');
}

export async function generateGeminiSpeech(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new GeminiTtsError('Falta configurar GEMINI_API_KEY.', 503);
  }

  const normalizedText = text?.trim();

  if (!normalizedText) {
    throw new GeminiTtsError('No se recibió texto para convertir a voz.', 400);
  }

  if (normalizedText.length > MAX_TOTAL_CHARS) {
    throw new GeminiTtsError('El informe es demasiado largo incluso para la versión extendida. Recórtalo un poco.', 400);
  }

  const chunks = splitTextIntoChunks(normalizedText);
  const pcmChunks = [];

  for (const chunk of chunks) {
    const pcmChunk = await synthesizeChunk(chunk);
    pcmChunks.push(pcmChunk);
  }

  const pcmBuffer = Buffer.concat(pcmChunks);
  return pcmToWavBuffer(pcmBuffer);
}
