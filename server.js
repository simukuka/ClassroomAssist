import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import Groq from 'groq-sdk'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3001)
const groqApiKey = process.env.GROQ_API_KEY
const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
const systemPrompt =
  'You are a friendly classroom assistance chatbot for students. Help them learn by explaining concepts clearly, breaking down problems step by step, and encouraging understanding instead of just giving answers. Keep responses warm, age-appropriate, and easy to scan.'

const subjectPrompts = {
  general: 'Use practical examples and keep explanations broadly helpful for everyday classroom learning.',
  math: 'For math, show the steps clearly and check understanding with a brief follow-up prompt.',
  science: 'For science, explain concepts with simple cause-and-effect reasoning and short real-world examples.',
  english: 'For English, support writing clarity, grammar, and structure with concise examples.',
  history: 'For history, provide clear context, timeline cues, and balanced factual summaries.',
}

if (!groqApiKey) {
  console.warn('GROQ_API_KEY is not set. Add it to your .env file before starting the server.')
}

const groq = new Groq({ apiKey: groqApiKey })

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/chat', async (request, response) => {
  try {
    if (!groqApiKey) {
      response.status(500).json({ error: { message: 'GROQ_API_KEY is missing on the server.' } })
      return
    }

    const messages = Array.isArray(request.body?.messages) ? request.body.messages : []
    const requestedSubject = typeof request.body?.subject === 'string' ? request.body.subject : 'general'
    const subject = Object.hasOwn(subjectPrompts, requestedSubject)
      ? requestedSubject
      : 'general'
    const subjectPrompt = subjectPrompts[subject]

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.6,
      messages: [
        { role: 'system', content: `${systemPrompt} ${subjectPrompt}` },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    })

    const reply = completion.choices[0]?.message?.content?.trim() || 'I did not receive a response.'

    response.json({ reply })
  } catch (error) {
    console.error('Chat request failed:', error)
    response.status(500).json({
      error: {
        message: 'The classroom assistant could not respond right now.',
      },
    })
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
