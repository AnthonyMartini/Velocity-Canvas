# Antigravity — Power Apps YAML Generator

> **Generate production-ready Power Apps Canvas Studio components from plain English — powered by Gemini 3.1 Flash.**

---

## What Is This?

Antigravity bypasses Microsoft's rigid (and expensive) native AI builder. You describe a UI component in natural language, and the app returns strict `pa.yaml v3.0` code you can paste directly into any Canvas App.

---

## Project Structure

```
powerapps/
├── backend/          # FastAPI + Gemini AI backend
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/         # React + Vite + Tailwind CSS frontend
    ├── src/
    │   ├── App.jsx
    │   └── index.css
    └── ...
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| A Gemini API Key | [Get one here](https://aistudio.google.com/app/apikey) |

---

## 1 — Backend Setup

```powershell
# Navigate to the backend directory
cd powerapps\backend

# Create a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Create your .env file (copy the example and fill in your key)
Copy-Item .env.example .env
notepad .env   # Set GEMINI_API_KEY=your_actual_key_here

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

---

## 2 — Frontend Setup

```powershell
# In a new terminal, navigate to the frontend
cd powerapps\frontend

# Install npm dependencies (if not already done)
npm install

# Start the dev server
npm run dev
```

The UI will be live at **http://localhost:5173**

---

## 3 — Using the App

1. Open **http://localhost:5173** in your browser.
2. Type a plain-English description of the Power Apps component you need.
3. Click **Generate YAML** (or press `Ctrl+Enter`).
4. Click **Copy to Power Apps** to copy the YAML to your clipboard.
5. In **Power Apps Canvas Studio**, press `Ctrl+V` on the canvas to paste.

---

## Critical Power Apps YAML Rules (enforced by the AI)

| Rule | Detail |
|------|--------|
| **Equals prefix** | Every property value must start with `=` (e.g. `Fill: =RGBA(0,0,0,1)`) |
| **Shape Hack** | For rounded containers/cards, use `Button@2.0.1` with `DisplayMode: =DisplayMode.View` and `Text: =""` |
| **Containers** | Use `GroupContainer@1.4.0` with `Variant: ManualLayout` for layouts |
| **Colors** | Always `RGBA()` notation — never hex or CSS color names |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key (required) |
