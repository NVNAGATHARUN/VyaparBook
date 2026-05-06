# 🌾 VyaparBook — Aapka Digital Khata

> **Voice-first PWA accounting app for Indian grain traders**  
> Speak in Telugu/English → AI parses it → Saves to your digital Khata automatically!

---

## 📱 What is VyaparBook?

VyaparBook is a **Progressive Web App (PWA)** built specifically for Indian grain traders (rice, paddy, wheat). Instead of maintaining physical ledgers (Khata), traders can simply **speak** their transactions in Telugu or Tenglish (Telugu + English), and the AI automatically records the deal in the database.

**Example:**
> 🗣️ *"Ravi degara 5 lorry paddy 2350 rate ki konna"*  
> ✅ AI saves: Purchase from Ravi — 5 Lorry Paddy @ ₹2350 — Total ₹11,750

---

## ✨ Key Features

### 🎙️ Voice-First Workflow
- **One tap to record** — Speak in Telugu, English, or Tenglish
- **Groq Whisper STT** — Ultra-fast, accurate speech-to-text
- **Gemini AI parsing** — Extracts party, commodity, quantity, rate, total automatically
- **Smart fallback** — If primary AI model is busy, automatically tries backup models

### 🧠 Smart Missing Field Detection
- If you forget to mention the **rate**, the app asks: *"Oka lorry ki enta rate?"*
- Live auto-calculation shows the total as you type
- Works for commodity, rate, and total amount fields

### ✏️ Fully Editable Confirmation Card
- Every field is editable before saving
- **Live auto-calculations**: Change Qty or Rate → Total updates instantly
- Change Total → Pending updates instantly

### 👥 New Party Detection
- If the AI finds a name not in your contact list, it pauses and asks you to categorize them
- Choose: Farmer, Miller, Dealer, Broker, or Other
- Party is saved first, then the deal is recorded seamlessly

### 🧾 Payment Proofs & Receipts *(New!)*
- Select **Payment Mode**: Hand Cash 💵 | PhonePe/GPay 📱 | Bank Transfer 🏦 | Cheque 📝
- Enter **Transaction ID / Cheque Number** (optional)
- **Upload receipt screenshot** as proof (optional, stored in Supabase Storage)
- Proofs are linked directly to the payment record in the database

### 📊 Business Dashboard
- **To Pay** / **To Receive** summary cards
- Today's total business volume
- Recent 8 transactions at a glance

### 📋 Full Business Module
- **Parties** — Manage buyers, sellers, farmers, millers
- **Deals** — All purchase and sale records
- **Payments** — Full payment history with proof links
- **Stock** — Auto-updated inventory (increases on purchase, decreases on sale)
- **Reports** — Business analytics

### 📶 Offline Support
- Full PWA with service worker — works offline
- Offline banner alerts when connection is lost
- Installable on Android/iOS as a home screen app

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Speech-to-Text | Groq Whisper API |
| AI Parsing | Google Gemini 2.5 Flash |
| PWA | vite-plugin-pwa |
| Routing | React Router v6 |

---

## 🚀 Setup & Installation

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd vyaparbook
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

**Get your API keys:**
- Supabase: [supabase.com](https://supabase.com) → Create project → Settings → API
- Groq: [console.groq.com](https://console.groq.com) → API Keys → Create
- Gemini: [aistudio.google.com](https://aistudio.google.com) → Get API Key

### 3. Setup Database
Run these SQL scripts **in order** in your Supabase SQL Editor:

1. `supabase_setup.sql` — Creates tables, views, and RLS policies
2. `supabase_fix.sql` — Fixes any view conflicts
3. `payment_proofs_setup.sql` — Adds payment proof columns and storage bucket *(Required for receipt uploads)*

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

### 5. Build for Production
```bash
npm run build
```

---

## 📂 Project Structure

```
vyaparbook/
├── public/
│   ├── icons/
│   │   ├── icon-192.png          # PWA Icon
│   │   └── icon-512.png          # PWA Icon
│   └── manifest.json             # PWA Manifest
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── AmountCard.jsx    # ₹ Display card
│   │   │   ├── BottomNav.jsx     # Navigation bar
│   │   │   └── LoadingSpinner.jsx
│   │   └── voice/
│   │       ├── VoiceButton.jsx       # Mic record button
│   │       ├── VoiceRecorder.jsx     # Voice flow orchestrator
│   │       ├── FollowUpCard.jsx      # Smart missing field prompts
│   │       ├── ConfirmationCard.jsx  # Editable deal review card
│   │       └── NewPartyCard.jsx      # New party detection card
│   ├── hooks/
│   │   ├── useVoice.js           # Voice recording state machine
│   │   ├── useDeals.js           # Deal CRUD hook
│   │   └── useParties.js         # Party CRUD hook
│   ├── pages/
│   │   ├── Home.jsx              # Dashboard + Voice entry point
│   │   ├── Login.jsx             # Phone number login
│   │   ├── Parties.jsx           # Party list
│   │   ├── PartyDetail.jsx       # Individual party ledger
│   │   ├── Deals.jsx             # All deals
│   │   ├── AddDeal.jsx           # Manual deal entry form
│   │   ├── AddPayment.jsx        # Manual payment entry form
│   │   ├── Stock.jsx             # Inventory view
│   │   └── Reports.jsx           # Business reports
│   ├── services/
│   │   ├── supabase.js           # All DB + Storage operations
│   │   ├── gemini.js             # AI transaction parsing
│   │   └── groq.js               # Speech-to-text
│   └── utils/
│       ├── formatAmount.js       # Indian number formatting (₹1.5L)
│       └── formatDate.js         # Relative date formatting
├── supabase_setup.sql            # Step 1: Database setup
├── supabase_fix.sql              # Step 2: Fix RLS issues
└── payment_proofs_setup.sql      # Step 3: Payment proof storage
```

---

## 🔄 Voice Flow Architecture

```
Tap Mic → Record Audio
    ↓
Groq Whisper → Transcribe to Text
    ↓
Gemini AI → Parse to JSON (Party, Type, Commodity, Qty, Rate, Total)
    ↓
Missing Fields? → FollowUpCard (Ask specific questions)
    ↓
New Party? → NewPartyCard (Categorize before saving)
    ↓
ConfirmationCard → Editable review with live calculations
    ↓ 
Payment Mode + Proof Upload (for payments)
    ↓
Save: Deal → Payment → Stock → VoiceLog → Dashboard Refresh ✅
```

---

## 🌐 Gemini API Quota Notes

VyaparBook uses Google Gemini AI for parsing. On the **Free Tier**:
- `gemini-2.5-flash`: 20 requests/day
- `gemini-1.5-flash`: 15 requests/min

The app automatically **falls back** through multiple models if one is rate-limited. For production use, add billing to your Google AI Studio account to increase limits significantly.

---

## 📝 Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Trader profiles (phone-based login) |
| `parties` | Buyers, sellers, farmers, millers |
| `deals` | All purchase/sale transactions |
| `payments` | Payment records with mode, txn ID, proof URL |
| `stock` | Current inventory per commodity |
| `voice_logs` | Raw voice + parsed data audit trail |

---

## 👨‍💻 Built With ❤️ for Indian Traders

VyaparBook is designed to replace the traditional physical Khata book that millions of Indian grain traders use daily. The app respects the local language (Telugu), local units (lorry, bags, quintals), and local payment methods (cash, PhonePe, cheque).

---

*Version 1.0.0 — May 2026*
