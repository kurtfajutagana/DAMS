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
* **AI Chatbot Engine:** Google AI
* **Background Worker & Task Scheduler:** Celery + Redis

### Third-Party Integration
* **SMS Gateway:** Twilio API
* **Email Gateway:** SendGrid or Nodemailer

## Scope and Limitations

### AI Chatbot API Limitations
- **Generative AI Quotas:** The chatbot utilizes the Google Gemini API (Free Tier) as a generative fallback for complex or highly nuanced patient inquiries. Due to strict Google Cloud Free Tier policies for accounts without linked billing, the generative AI is strictly hard-capped at **20 Requests Per Day (RPD)**.
- **Fallback Mechanism:** To mitigate this limitation, the system implements a **Hybrid Architecture**. A local, offline Machine Learning model handles common operational intents (e.g., *Billing*, *Appointments*, *Post-Op Care*). This local model is completely free and handles the majority of standard inquiries without consuming the 20 RPD Gemini quota.
- **Memory Context Size:** The chatbot includes conversation memory, injecting the previous 15 interactions into each Gemini request. While this increases the per-request input size, the generous 250,000 Tokens-Per-Minute limit easily accommodates this. The true bottleneck remains the 20 Requests Per Day limit, not token consumption. 
- **Prototype Key Rotation Workaround:** To facilitate prototype testing and live demonstration within the constraints of zero-budget academic research, the system implements an API key-rotation failover mechanism across multiple free-tier accounts. The backend dynamically switches API keys when a `429 Quota Exceeded` error is encountered.
- **Production Scalability:** For a commercial, production deployment, this 5-key workaround must be replaced by a single, standard-billed Google Cloud account to lift the 20 RPD restriction and natively handle traffic.
