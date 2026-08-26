# Pasig Dental AI System

## Tech Stack

### Front End
* **Framework:** React.js (Vite)
* **Style:** Tailwind CSS + Shadcn UI
* **State Management & Data Fetching:** Supabase JS Client + TanStack Query

### Backend
* **Primary Database:** PostgreSQL (Supabase)
* **Authentication & Access Control:** Supabase Auth + Row Level Security (RLS)

### Application & AI Layer
* **AI Microservice Backend:** Python (FastAPI)
* **AI Chatbot Engine:** Groq API (using the `openai/gpt-oss-120b` model)
* **Background Worker:** Asyncio / BackgroundTasks (FastAPI)

## Scope and Limitations

### AI Chatbot API
- **Generative AI Provider:** The chatbot utilizes the Groq API for extremely fast, low-latency conversational AI capabilities. 
- **Context Awareness:** The chatbot includes conversation memory and dynamically injects real-time clinic context (like current fees, available doctors, and patient schedules) directly from Supabase before sending the prompt to Groq.
- **Model Usage:** Currently configured to use an open-source model available via Groq (e.g., `openai/gpt-oss-120b`). Ensure your `GROQ_API_KEY` is properly set in the `.env` file for the backend to function.
- **Production Scalability:** For a commercial deployment, ensure you are on an appropriate Groq API tier to handle production traffic volume, as free tiers may have strict rate limits on requests per minute.
