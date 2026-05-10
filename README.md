# 🌾 VyaparBook — Aapka Digital Khata & AI Agent

> **Enterprise-grade PWA & WhatsApp AI Bot for Indian grain traders.**  
> Speak in Telugu/Tenglish → AI handles the accounting, payments, and reporting automatically!

---

## 📱 What is VyaparBook?

VyaparBook is a high-performance **Progressive Web App (PWA)** integrated with a **WhatsApp AI Agent**, designed specifically for Indian grain traders (Rice, Paddy, Wheat). It replaces traditional physical ledgers (Roznamcha) with a voice-first, AI-driven experience that handles transactions, stock, and debts autonomously.

**Example:**
> 🗣️ *"Ravi degara 5 lorry paddy 2350 rate ki konna"*  
> ✅ AI saves: Purchase from Ravi — 5 Lorry Paddy @ ₹2350 — Total ₹11,750
> 🤖 WhatsApp: *"Ravi ki multiple deals unnyi. Edi 'cut' cheyali?"*

---

## ✨ Key Features (v2.0 Elite)

### 🤖 Smart WhatsApp AI Agent
- **Autonomous Multi-Step Flows**: The bot confirms deals, asks for missing info, and proactively suggests adding notes or photo receipts.
- **Smart Payment Allocation**: If a party has multiple pending deals, the bot asks you exactly which one to "cut" the payment from, ensuring your ledger is perfectly organized.
- **Tenglish Voice Support**: Send voice notes in Telugu/English; the bot transcribes and parses them instantly.

### 📔 Digital Day Book (Roznamcha)
- **Chronological Business Log**: A minute-by-minute view of every Sale, Purchase, Payment, and Expense.
- **Daily Cash Flow Summary**: Instantly see your total "Cash In" vs. "Outflow" for any selected date.

### 🕙 Automated Nightly 10 PM Reports
- **Proactive Summary**: Every night at 10:00 PM IST, you get a WhatsApp message summarizing today's work.
- **Global Balances**: See exactly how much you need to **Collect (Receive)** and how much you need to **Pay** across your entire business.

### 🧾 Professional Party Statements
- **One-Click Share**: Generate detailed transaction summaries formatted for WhatsApp in one tap.
- **Ledger Clarity**: Breakdown of Total Business, Total Paid, and Outstanding balances for every farmer/miller.

### 📊 Advanced Business Intelligence
- **Profit Trends**: 6-month visual area charts showing your Net Profit growth.
- **Stock Management**: Real-time inventory levels that update automatically on every sale or purchase.
- **Expense Tracking**: Category-wise overhead management (Labor, Rent, Fuel, etc.).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite (PWA) |
| **Styling** | Vanilla CSS (Premium Custom Design) |
| **Database** | Supabase (PostgreSQL) |
| **Edge Functions** | Deno (for WhatsApp Webhooks & Cron) |
| **AI Brain** | Groq Llama 3.1 & Whisper V3 (Ultra-Fast) |
| **Scheduling** | Supabase `pg_cron` & `pg_net` |

---

## 🚀 Setup & Installation

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd vyaparbook
npm install
```

### 2. Configure Environment Variables
Create a `.env` file for the frontend:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_KEY=your_anon_key
VITE_GROQ_API_KEY=your_groq_key
```

### 3. Deploy Edge Functions
Use the Supabase CLI to deploy the "Brains" of the bot:
```bash
npx supabase link --project-ref your_project_id
npx supabase functions deploy whatsapp-incoming
npx supabase functions deploy daily-report
```

### 4. Set Production Secrets
```bash
npx supabase secrets set GROQ_API_KEY=...
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=...
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=...
```

### 5. Enable Cron (Nightly Report)
Run this SQL in your Supabase Editor to enable the 10 PM summary:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

select cron.schedule(
  'daily-vyapar-summary',
  '30 16 * * *', -- 10:00 PM IST
  $$ select net.http_post(
       url:='https://your-id.supabase.co/functions/v1/daily-report',
       headers:='{"Authorization": "Bearer YOUR_ROLE_KEY"}'::jsonb
     ) $$
);
```

---

## 📂 Project Structure (Highlights)
- `src/pages/DayBook.jsx`: The digital daily log.
- `src/pages/Reports.jsx`: Advanced P&L analytics.
- `src/pages/Settings.jsx`: Business profile management.
- `supabase/functions/whatsapp-incoming`: The central AI orchestrator.
- `supabase/functions/daily-report`: The nightly summary engine.

---

## 👨‍💻 Built with ❤️ for the Trading Community
VyaparBook is designed to empower local Indian traders with enterprise-grade AI. It respects local business logic, local language, and the need for high-speed operation.

*Version 2.0.0 — Stable Release — May 2026*
