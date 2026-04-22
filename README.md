# Classroom Assist

Classroom Assist is a Groq-powered school chatbot for Alabama A&M students.

It includes a polished chat UI, subject-aware tutoring modes, local chat persistence, and PDF export for study sheets.

## Tech Stack

- React + Vite + TypeScript (frontend)
- Express + Groq SDK (backend API)
- jsPDF (export chat to PDF)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Set your Groq key in `.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

4. Start app (frontend + backend):

```bash
npm run dev
```

Frontend runs on Vite (default `http://localhost:5173`).
Backend runs on `http://localhost:3001`.
Vite proxies `/api/*` to the backend.

## Scripts

- `npm run dev` runs client and server together.
- `npm run dev:client` runs only the frontend.
- `npm run dev:server` runs only the backend.
- `npm run build` runs TypeScript build + Vite production build.
- `npm run preview` previews production frontend build.

## Features

### Chat Experience

- Student-friendly chat UI with Alabama A&M styling.
- Enter to send, Shift+Enter for newline.
- Animated assistant "thinking" state.
- Copy button on assistant responses.
- Clear chat button.

### Study Tools

- Subject modes:
	- General
	- Math
	- Science
	- English
	- History
- Quick prompt chips for fast starts.
- Export current conversation to PDF study sheet.
- Save assistant responses to a bookmarks panel for quick review.

### Persistence

- Chat history saved in `localStorage`.
- Selected subject saved in `localStorage`.
- Compact/Spacious UI mode preference saved in `localStorage`.
- Saved response bookmarks stored in `localStorage`.

### Branding

- Header supports optional custom logo file:
	- `public/aamu-logo.png`
- If missing, it falls back to an `AAMU` text badge.

## Backend API

### `GET /api/health`

Returns basic health status.

### `POST /api/chat`

Request body:

```json
{
	"subject": "general",
	"messages": [
		{ "role": "user", "content": "Explain this concept." }
	]
}
```

The backend injects a subject-specific system prompt and sends the request to Groq chat completions.

## Notes

- Keep `.env` private and never commit real API keys.
- If you change environment values, restart `npm run dev`.
