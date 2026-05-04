import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { GeminiTtsError, generateGeminiSpeech } from './src/server/geminiTts.js'
import { uploadAudioToCloudinary, deleteAudioFromCloudinary } from './src/server/cloudinaryAudio.js'

async function readJsonBody(req) {
  const rawBody = await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

  return rawBody ? JSON.parse(rawBody) : {}
}

function geminiTtsDevApi() {
  return {
    name: 'gemini-tts-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next()
        }

        try {
          const parsed = await readJsonBody(req)
          const wavBuffer = await generateGeminiSpeech(parsed.text)

          res.statusCode = 200
          res.setHeader('Content-Type', 'audio/wav')
          res.setHeader('Cache-Control', 'no-store')
          res.end(wavBuffer)
        } catch (error) {
          const status = error instanceof GeminiTtsError ? error.status : 500
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: error.message || 'Error interno al generar audio con Gemini.',
            })
          )
        }
      })

      server.middlewares.use('/api/publish-audio', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next()
        }

        try {
          const body = await readJsonBody(req)
          const text = body?.text?.trim() || ''
          const previousPublicId = body?.previousPublicId?.trim() || ''

          if (!text) {
            if (previousPublicId) {
              await deleteAudioFromCloudinary(previousPublicId)
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ audioUrl: '', publicId: '' }))
            return
          }

          const wavBuffer = await generateGeminiSpeech(text)
          const publicId = `raserbets/audio/pronostico-actual-${Date.now()}`
          const uploadResult = await uploadAudioToCloudinary(wavBuffer, publicId)

          if (previousPublicId && previousPublicId !== uploadResult.publicId) {
            try {
              await deleteAudioFromCloudinary(previousPublicId)
            } catch (deleteError) {
              console.error('No se pudo borrar el audio anterior:', deleteError)
            }
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              audioUrl: uploadResult.secureUrl,
              publicId: uploadResult.publicId,
            })
          )
        } catch (error) {
          const status = error instanceof GeminiTtsError ? error.status : 500
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: error.message || 'No se pudo publicar el audio.',
            })
          )
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), geminiTtsDevApi()],
  }
})
