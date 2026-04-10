import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import './App.css'

type Role = 'user' | 'assistant'

type Message = {
  id: string
  role: Role
  content: string
}

const modelOptions = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    description: 'Best balance of quality and speed',
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    description: 'Fast replies for lightweight chats',
  },
  {
    id: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B',
    description: 'Strong reasoning and structured output',
  },
] as const

const promptIdeas = [
  'Write a concise product description for a smart planner app.',
  'Draft a friendly onboarding message for a customer support bot.',
  'Explain the difference between fine-tuning and prompt engineering.',
  'Turn these notes into a polished roadmap.',
]

const systemPrompt =
  'You are a helpful product-focused assistant that gives crisp, well-structured answers. Keep responses friendly, useful, and easy to scan.'

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Welcome to Nova Chat. Ask anything, and I will answer with Groq-powered speed.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(modelOptions[0].id)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  const submitMessage = async (messageText: string) => {
    const trimmedInput = messageText.trim()
    if (!trimmedInput || isLoading) {
      return
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setIsLoading(true)

    if (!groqApiKey) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'Groq API key not found. Add VITE_GROQ_API_KEY to .env.local, then restart the dev server.',
        },
      ])
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              ...nextMessages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
            ],
          }),
        },
      )

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        throw new Error(
          payload?.error?.message ?? 'Unable to reach the Groq API right now.',
        )
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string
          }
        }>
      }

      const reply =
        payload.choices?.[0]?.message?.content?.trim() ??
        'I did not receive a response body from Groq.'

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
        },
      ])
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while sending your message.'
      setError(message)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'I could not complete that request. Check your API key, model name, and network connection.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitMessage(input)
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitMessage(input)
    }
  }

  const usePrompt = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <main className="app-shell">
      <section className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">G</div>
          <div>
            <p className="eyebrow">Groq assistant</p>
            <h1>Nova Chat</h1>
          </div>
        </div>

        <p className="sidebar-copy">
          A polished conversational interface with model controls, quick prompts,
          and a clean response workspace.
        </p>

        <div className="status-card">
          <span className={`status-dot ${groqApiKey ? 'live' : 'missing'}`} />
          <div>
            <strong>{groqApiKey ? 'Ready to send' : 'API key missing'}</strong>
            <p>
              {groqApiKey
                ? 'Connected through Groq-compatible chat completions.'
                : 'Add VITE_GROQ_API_KEY in .env.local before using the chat.'}
            </p>
          </div>
        </div>

        <div className="model-panel">
          <label htmlFor="model">Model</label>
          <select
            id="model"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p>
            {modelOptions.find((option) => option.id === selectedModel)?.description}
          </p>
        </div>

        <div className="tips-panel">
          <h2>Quick starts</h2>
          <div className="prompt-list">
            {promptIdeas.map((prompt) => (
              <button key={prompt} type="button" onClick={() => usePrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="chat-card">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Live conversation</p>
            <h2>Design-first chat experience</h2>
          </div>
          <div className="header-pill">{isLoading ? 'Thinking…' : 'Idle'}</div>
        </header>

        <div className="chat-viewport" ref={viewportRef}>
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="message-label">
                {message.role === 'user' ? 'You' : 'Groq'}
              </div>
              <p>{message.content}</p>
            </article>
          ))}
          {isLoading ? (
            <article className="message assistant loading">
              <div className="message-label">Groq</div>
              <p>Composing a response with the selected model.</p>
            </article>
          ) : null}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <label className="composer-label" htmlFor="prompt">
            Message
          </label>
          <textarea
            id="prompt"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask for copy, strategy, coding help, summaries, or brainstorm ideas..."
            rows={4}
          />

          <div className="composer-footer">
            <p className="helper-copy">
              Press <span>Enter</span> to send. Use <span>Shift+Enter</span> for a
              new line.
            </p>
            <div className="actions-row">
              {error ? <span className="error-copy">{error}</span> : null}
              <button type="submit" className="send-button" disabled={isLoading}>
                {isLoading ? 'Sending' : 'Send message'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}

export default App
