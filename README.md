# Preventra AI 🩺
> AI-powered preventive healthcare assistant — predicts disease risk, generates personalized plans, and tracks daily lifestyle.

## Tech Stack
- **Frontend**: React 19 + Tailwind CSS v4 + Recharts
- **Backend**: Flask + Groq API (llama3-70b)
- **ML**: Scikit-learn Random Forest
- **AI**: Groq API

---

## 🚀 Setup & Run

### 1. Train the ML Models
```bash
cd PreventraAI
pip install scikit-learn numpy
python ml/train_model.py
```
This saves `diabetes_model.pkl` and `hypertension_model.pkl` inside `ml/`.

---

### 2. Start the Backend
```bash
cd backend
pip install -r requirements.txt
```

Add your Groq API key to `backend/.env`:
```
GROQ_API_KEY=your_actual_groq_api_key
```

Then run:
```bash
python app.py
```
Backend runs at **http://localhost:5000**

---

### 3. Start the Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at **http://localhost:3000**

---

## 📱 App Flow

| Step | Screen | Description |
|------|--------|-------------|
| 1 | Profile Setup | Enter age, weight, height, lifestyle habits |
| 2 | Risk Results | ML predicts Diabetes & Hypertension risk |
| 3 | AI Plan | Groq generates personalized Indian diet + exercise plan |
| 4 | Daily Tracker | Log steps, food, sleep each day |
| 5 | AI Feedback | Groq analyzes your day vs recommended plan |
| 6 | Health Score | Steps(40%) + Diet(40%) + Sleep(20%) = Daily score |
| 7 | Dashboard | Weekly trends, charts, latest feedback |

---

## 🔑 Get a Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up and create an API key
3. Paste it in `backend/.env`

---

## 📁 Project Structure
```
PreventraAI/
├── ml/
│   ├── train_model.py          # Train & save ML models
│   ├── diabetes_model.pkl      # Generated after training
│   └── hypertension_model.pkl  # Generated after training
├── backend/
│   ├── app.py                  # Flask API (5 endpoints)
│   ├── requirements.txt
│   └── .env                    # GROQ_API_KEY goes here
└── frontend/
    └── src/
        ├── App.js              # Main app + routing
        ├── ProfileSetup.jsx    # Step 1: User input
        ├── RiskResults.jsx     # Step 2+3: Prediction + AI plan
        ├── DailyTracker.jsx    # Step 4+5+6: Tracking + feedback
        ├── Dashboard.jsx       # Step 7: Progress charts
        ├── NavBar.jsx          # Bottom navigation
        └── api.js              # Axios API calls
```
