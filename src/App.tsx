import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import './App.css'

type Role = 'user' | 'assistant'

type Message = {
  id: string
  role: Role
  content: string
}

type Bookmark = {
  id: string
  content: string
}

type Subject = 'general' | 'math' | 'science' | 'english' | 'history'

const subjects: Array<{ id: Subject; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'english', label: 'English' },
  { id: 'history', label: 'History' },
]

const quickPrompts = [
  'Explain this like I am 12 years old.',
  'Help me study this topic with bullet points.',
  'Give me 3 practice questions.',
]

const welcomeMessage =
  'Hi, I am your classroom helper. Ask me a question and I will explain it in a simple, friendly way.'

const defaultMessages: Message[] = [
  {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: welcomeMessage,
  },
]

const messageStorageKey = 'classroom-assist-messages'
const densityStorageKey = 'classroom-assist-compact-mode'
const subjectStorageKey = 'classroom-assist-subject'
const bookmarksStorageKey = 'classroom-assist-bookmarks'

function App() {
  const [showLogoFallback, setShowLogoFallback] = useState(false)
  const [isCompact] = useState<boolean>(() => {
    const savedDensity = localStorage.getItem(densityStorageKey)
    return savedDensity === 'true'
  })
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem(messageStorageKey)
      if (!savedMessages) {
        return defaultMessages
      }

      const parsedMessages = JSON.parse(savedMessages) as Message[]
      if (!Array.isArray(parsedMessages) || parsedMessages.length === 0) {
        return defaultMessages
      }

      return parsedMessages
    } catch {
      return defaultMessages
    }
  })
  const [input, setInput] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<Subject>(() => {
    const savedSubject = localStorage.getItem(subjectStorageKey) as Subject | null
    if (!savedSubject) {
      return 'general'
    }

    return subjects.some((subject) => subject.id === savedSubject)
      ? savedSubject
      : 'general'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const savedBookmarks = localStorage.getItem(bookmarksStorageKey)
      if (!savedBookmarks) {
        return []
      }

      const parsedBookmarks = JSON.parse(savedBookmarks) as Bookmark[]
      if (!Array.isArray(parsedBookmarks)) {
        return []
      }

      return parsedBookmarks.filter(
        (bookmark) =>
          typeof bookmark?.id === 'string' &&
          typeof bookmark?.content === 'string' &&
          bookmark.content.trim().length > 0,
      )
    } catch {
      return []
    }
  })
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  useEffect(() => {
    localStorage.setItem(messageStorageKey, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(subjectStorageKey, selectedSubject)
  }, [selectedSubject])

  useEffect(() => {
    localStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarks))
  }, [bookmarks])

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: selectedSubject,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        throw new Error(
          payload?.error?.message ?? 'Unable to reach the classroom assistant.',
        )
      }

      const payload = (await response.json()) as {
        reply?: string
      }

      const reply = payload.reply?.trim() ?? 'I did not receive a response.'

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
          content: 'I could not complete that request. Please try again in a moment.',
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

  const copyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedMessageId(message.id)
      window.setTimeout(() => setCopiedMessageId(null), 1200)
    } catch {
      setError('Unable to copy right now.')
    }
  }

  const isBookmarked = (messageId: string) =>
    bookmarks.some((bookmark) => bookmark.id === messageId)

  const toggleBookmark = (message: Message) => {
    if (message.role !== 'assistant') {
      return
    }

    setBookmarks((current) => {
      if (current.some((bookmark) => bookmark.id === message.id)) {
        return current.filter((bookmark) => bookmark.id !== message.id)
      }

      return [...current, { id: message.id, content: message.content }]
    })
  }

  const currentSubjectLabel =
    subjects.find((subject) => subject.id === selectedSubject)?.label ?? 'General'

  return (
    <main className="app-shell">
      <section className={`chat-shell ${isCompact ? 'compact' : 'spacious'}`}>
        <header className="topbar">
          <div className="school-logo" aria-hidden="true">
            {showLogoFallback ? (
              <span className="logo-fallback">AAMU</span>
            ) : (
              <img
                src="/aamu-logo.png"
                alt=""
                onError={() => setShowLogoFallback(true)}
              />
            )}
          </div>
          <div className="topbar-copy">
            <h1 className="title-row">
              <span className="title-dot" aria-hidden="true" />
              Classroom Assist
            </h1>
            <p className="subtitle">
              Alabama A&M student helper for class questions and study support.
            </p>
          </div>
          <span className="status-pill">AAMU Online</span>
        </header>

        <section className="chat-card">
          <div className="chat-layout">
            <div className="chat-main">
              <div className="chat-main-header">
                <div>
                  <h2>Conversation</h2>
                  <p>{Math.max(messages.length - 1, 0)} student messages</p>
                </div>
                <span className="subject-badge">Mode: {currentSubjectLabel}</span>
              </div>

              <div className="chat-viewport" ref={viewportRef}>
                {messages.map((message) => (
                  <article key={message.id} className={`message ${message.role}`}>
                    <div className="message-head">
                      <div className="message-label">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </div>
                      {message.role === 'assistant' ? (
                        <div className="message-actions">
                          <button
                            type="button"
                            className="copy-button"
                            onClick={() => void copyMessage(message)}
                          >
                            {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            className={`bookmark-button ${isBookmarked(message.id) ? 'active' : ''}`}
                            onClick={() => toggleBookmark(message)}
                          >
                            {isBookmarked(message.id) ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p>{message.content}</p>
                  </article>
                ))}
                {isLoading ? (
                  <article className="message assistant loading">
                    <div className="message-label">Assistant</div>
                    <p className="thinking-row">
                      Thinking
                      <span className="typing-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    </p>
                  </article>
                ) : null}
              </div>

              <form className="composer" onSubmit={handleSubmit}>
                <textarea
                  id="prompt"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Type your question..."
                  rows={4}
                />

                <div className="composer-footer">
                  <p className="hint-text">Enter to send, Shift+Enter for a new line.</p>
                  {error ? <span className="error-copy">{error}</span> : null}
                  <button type="submit" className="send-button" disabled={isLoading}>
                    {isLoading ? 'Sending' : 'Send'}
                  </button>
                </div>
              </form>
            </div>

            <aside className="study-rail">
              <section className="rail-panel" aria-label="Subject mode">
                <h2>Subject</h2>
                <div className="subject-switch">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      className={selectedSubject === subject.id ? 'active' : ''}
                      onClick={() => setSelectedSubject(subject.id)}
                    >
                      {subject.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rail-panel" aria-label="Quick prompt suggestions">
                <h2>Quick prompts</h2>
                <div className="quick-prompts">
                  {quickPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => usePrompt(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>

              <section className="bookmarks-panel" aria-label="Saved responses">
                <h2>Saved responses</h2>
                {bookmarks.length === 0 ? (
                  <p className="empty-bookmarks">
                    Save helpful assistant replies to keep a quick study list.
                  </p>
                ) : (
                  <div className="bookmark-list">
                    {bookmarks.map((bookmark) => (
                      <button
                        key={bookmark.id}
                        type="button"
                        className="bookmark-item"
                        onClick={() => setInput(bookmark.content)}
                      >
                        {bookmark.content}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
