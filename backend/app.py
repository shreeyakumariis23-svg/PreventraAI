from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import pickle
import bcrypt
import jwt
import datetime
from functools import wraps
import re

import numpy as np
from dotenv import load_dotenv

try:
    from groq import Groq
except ImportError:
    Groq = None

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── MongoDB ──────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "preventra_secret_key_change_in_prod")

db = None
if MongoClient:
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        client.server_info()
        db = client["preventra"]
    except Exception as e:
        print(f"[MongoDB] Connection failed: {e}")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user_id = data["user_id"]
            request.user_name = data.get("name", "")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Auth: Register ────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    if db is None:
        return jsonify({"error": "Database not connected"}), 503
    d = request.json
    name = d.get("name", "").strip()
    email = d.get("email", "").strip().lower()
    password = d.get("password", "")
    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    result = db.users.insert_one({"name": name, "email": email, "password": hashed, "created_at": datetime.datetime.utcnow()})
    token = jwt.encode({"user_id": str(result.inserted_id), "name": name, "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)}, JWT_SECRET, algorithm="HS256")
    return jsonify({"token": token, "name": name, "email": email}), 201


# ── Auth: Login ───────────────────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    if db is None:
        return jsonify({"error": "Database not connected"}), 503
    d = request.json
    email = d.get("email", "").strip().lower()
    password = d.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    user = db.users.find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode(), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401
    token = jwt.encode({"user_id": str(user["_id"]), "name": user["name"], "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)}, JWT_SECRET, algorithm="HS256")
    return jsonify({"token": token, "name": user["name"], "email": email})

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml")
RISK_LABELS = ["Low", "Medium", "High"]
MODEL_CACHE = {}
groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key) if Groq and groq_api_key else None


def load_model(name):
    if name in MODEL_CACHE:
        return MODEL_CACHE[name]
    path = os.path.join(MODEL_DIR, f"{name}_model.pkl")
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        model = pickle.load(f)
    MODEL_CACHE[name] = model
    return model


def heuristic_risk(features, disease):
    age, bmi, family_history, diet_score, activity_level, sleep_hours = features
    bmi_cutoff = 27 if disease == "diabetes" else 25
    score = (
        int(age >= 45)
        + int(bmi >= bmi_cutoff)
        + int(family_history >= 1)
        + int(diet_score <= 4)
        + int(activity_level <= 1)
        + int(sleep_hours < 6)
    )
    return 2 if score >= 4 else 1 if score >= 2 else 0


def groq_chat(prompt: str, system: str = None, max_tokens: int = 1024) -> str:
    if not groq_client:
        raise RuntimeError("Groq API is not configured. Set GROQ_API_KEY in your environment.")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    res = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.7,
        max_tokens=max_tokens,
    )
    return res.choices[0].message.content


def clean_bullet_line(line):
    cleaned = str(line or "")
    cleaned = cleaned.replace("**", "").replace("__", "")
    cleaned = re.sub(r"`+", "", cleaned)
    cleaned = re.sub(r"^\s*(?:[-*•]+|\d+[.)])\s*", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def split_lines(text):
    return [line.strip() for line in str(text or "").splitlines() if line.strip()]


def parse_sectioned_text(text, sections):
    parsed = {section: [] for section in sections}
    current = None

    for raw_line in split_lines(text):
        line = raw_line.rstrip(":").strip()
        matched = None
        for section in sections:
            if line.lower() == section.lower():
                matched = section
                break
        if matched:
            current = matched
            continue
        if current:
            cleaned = clean_bullet_line(raw_line)
            if cleaned:
                parsed[current].append(cleaned)

    return parsed


def pick_first_sentence(text, fallback):
    source = clean_bullet_line(str(text or "").replace("\n", " "))
    if not source:
        return fallback
    parts = re.split(r"(?<=[.!?])\s+", source)
    sentence = (parts[0] if parts else source).strip()
    return sentence[:180]


def build_feedback_payload(text):
    sections = ["Headline", "Wins", "Focus Areas", "Watchouts", "Tomorrow Plan"]
    parsed = parse_sectioned_text(text, sections)
    lines = [clean_bullet_line(line) for line in split_lines(text)]

    headline = parsed["Headline"][0] if parsed["Headline"] else pick_first_sentence(text, "Your daily report is ready.")
    headline = re.sub(r"^(Headline|Wins|Focus Areas|Watchouts|Tomorrow Plan)\s*[:.-]?\s*", "", headline, flags=re.I).strip()
    wins = parsed["Wins"][:4]
    focus = parsed["Focus Areas"][:4]
    watchouts = parsed["Watchouts"][:3]
    tomorrow = parsed["Tomorrow Plan"][:4]

    if not wins:
        wins = [line for line in lines if any(word in line.lower() for word in ["good", "great", "solid", "well", "keep"])][:3]
    if not focus:
        focus = [line for line in lines if any(word in line.lower() for word in ["try", "aim", "improve", "increase", "reduce"])][:4]
    if not watchouts:
        watchouts = [line for line in lines if any(word in line.lower() for word in ["concerning", "warning", "doctor", "elevated", "unusual"])][:3]
    if not tomorrow:
        tomorrow = focus[:3]

    return {
        "raw": text,
        "headline": headline,
        "wins": wins,
        "focus_areas": focus,
        "watchouts": watchouts,
        "tomorrow_plan": tomorrow,
    }


def build_alerts_payload(text):
    suggestions = [clean_bullet_line(line) for line in split_lines(text)]
    suggestions = [line for line in suggestions if line][:5]
    return {
        "raw": text,
        "headline": pick_first_sentence(text, "Tomorrow's suggestions are ready."),
        "suggestions": suggestions,
    }


def normalize_plan_items(raw_lines, max_items=5):
    items = []
    current = ""

    for raw_line in raw_lines:
        cleaned = clean_bullet_line(re.sub(r"\*\*", "", raw_line))
        if not cleaned:
            continue

        is_new_item = bool(re.match(r"^\s*(?:[-*•]+|\d+[.)])\s*", raw_line)) or not current
        if is_new_item:
            if current:
                items.append(current.strip(" -:"))
            current = cleaned
        else:
            current = f"{current} {cleaned}".strip()

    if current:
        items.append(current.strip(" -:"))

    return [item for item in items if len(item) > 4][:max_items]


def build_recommendations_payload(text):
    sections = ["Calorie Target", "Diet Plan", "Exercise Routine", "Lifestyle Tips"]
    raw_sections = {section: [] for section in sections}
    current = None

    for raw_line in str(text or "").splitlines():
        line = raw_line.strip().rstrip(":").strip()
        matched = next((section for section in sections if line.lower() == section.lower()), None)
        if matched:
            current = matched
            continue
        if current and raw_line.strip():
            raw_sections[current].append(raw_line)

    parsed_sections = []
    for section in sections:
        items = normalize_plan_items(raw_sections[section], max_items=6)
        if not items and section == "Lifestyle Tips":
            items = ["Review progress weekly and consult a doctor if symptoms persist."]
        parsed_sections.append({
            "title": section,
            "items": items,
        })

    return {
        "raw": text,
        "sections": parsed_sections,
    }


def generate_plan_fallback(d):
    activity = int(d.get("activity_level", 0))
    weight = float(d.get("weight", 70) or 70)
    height_m = max(float(d.get("height", 170) or 170) / 100, 1.3)
    age = int(d.get("age", 30) or 30)
    gender = str(d.get("gender", "")).lower()
    activity_multiplier = [1.2, 1.35, 1.5, 1.7][min(max(activity, 0), 3)]
    bmr = 10 * weight + 6.25 * (height_m * 100) - 5 * age + (5 if gender == "male" else -161)
    maintenance_calories = round(bmr * activity_multiplier)
    bmi = float(d.get("bmi", 0) or 0)
    calorie_target = maintenance_calories - 250 if bmi >= 25 else maintenance_calories + 150 if bmi and bmi < 18.5 else maintenance_calories
    diet_score = float(d.get("diet_score", 5))
    carb_note = "reduce sugary drinks and refined carbs" if diet_score <= 6 else "keep portions balanced and protein high"
    workout_mode = "calisthenics-focused home workouts" if activity <= 1 else "gym-based strength sessions with light cardio finishers"
    return (
        "Calorie Target\n"
        f"- Estimated daily calorie target: about {calorie_target} kcal/day based on your age, body size, and activity level.\n"
        f"- Aim for roughly {'a mild calorie deficit for fat loss and metabolic control' if bmi >= 25 else 'maintenance calories with steady protein intake' if bmi >= 18.5 else 'a mild calorie surplus to support healthy weight gain'}.\n"
        "- Prioritize protein in each meal and avoid getting most calories from sugary snacks or drinks.\n\n"
        "Diet Plan\n"
        f"- Breakfast: start with oats, poha, besan chilla, or eggs with fruit and a protein source.\n"
        f"- Lunch: build a plate with dal or lean protein, sabzi, salad, curd, and roti or brown rice.\n"
        f"- Dinner: keep it lighter with paneer, tofu, chicken, dal, soup, and vegetables.\n"
        f"- Snacks: use fruit, roasted chana, sprouts, curd, or nuts in controlled portions.\n"
        f"- {carb_note.capitalize()}.\n\n"
        "Exercise Routine\n"
        f"- Follow {workout_mode} 4-5 days per week.\n"
        "- Gym option: do squats or leg press, chest press or push-ups, rows or lat pulldowns, shoulder press, and 10-15 minutes incline walking.\n"
        "- Calisthenics option: do push-ups, bodyweight squats, lunges, glute bridges, planks, and assisted pull-up or resistance-band rows.\n"
        "- Keep each session around 35-50 minutes and add 5-10 minutes of stretching after training.\n"
        "- Try a 10-minute walk after meals to support glucose control.\n\n"
        "Lifestyle Tips\n"
        f"- Target {d.get('sleep_hours', 7)}-8 hours of sleep on a consistent schedule.\n"
        f"- Drink at least {max(float(d.get('water_litres', 2)), 2):g}L of water daily.\n"
        "- Track stress and use breathing or meditation for 10 minutes a day.\n"
        "- Review progress weekly and consult a doctor if symptoms persist."
    )


def generate_feedback_fallback(d, mood):
    notes = [
        "Headline",
        f"- Your check-in shows a {mood} day with a few clear opportunities to improve tomorrow.",
        "Wins",
        f"- You logged your habits for the day, which is the first step toward better consistency.",
        f"- Diet quality came in at {d['diet_score']}/10, giving us a useful signal to build on.",
        "Focus Areas",
        f"- Steps were {d['steps']}, so aim to move closer to {d.get('recommended_steps', 8000)} tomorrow.",
        f"- Sleep was {d['sleep']} hours, so try to protect a steady 7-8 hour sleep window.",
        f"- Water intake was {d.get('water', 2)}L. Add an extra glass in the morning and evening if energy felt low.",
        "Watchouts",
        f"- Mood was {mood}. If that continues for several days, reduce overload and prioritize recovery.",
        "Tomorrow Plan",
        "- Plan one short walk after a meal.",
        "- Keep meals balanced with protein, fiber, and fewer ultra-processed foods.",
    ]
    if d.get("heart_rate"):
        notes.extend([
            "Watchouts",
            f"- Heart rate was {d['heart_rate']} bpm. Recheck it at rest if it felt unusual.",
        ])
    return "\n".join(notes)


def generate_alerts_fallback(d):
    suggestions = []
    if d["steps"] < 8000:
        suggestions.append("Plan a 15-minute walk after lunch and dinner to raise your step count.")
    if d["sleep"] < 7:
        suggestions.append("Set a fixed bedtime tonight so you can recover with more sleep tomorrow.")
    if d.get("water", 2) < 2.5:
        suggestions.append("Keep a bottle nearby and finish one full glass with each meal.")
    if d["diet_score"] < 6:
        suggestions.append("Prep one simple healthy meal ahead of time to avoid convenience food tomorrow.")
    return "\n".join(f"- {item}" for item in suggestions[:3] or [
        "Repeat today’s routine and focus on consistency across meals, sleep, and movement."
    ])


def generate_chat_fallback(message, profile, risks):
    risk_summary = []
    if risks.get("diabetes_risk"):
        risk_summary.append(f"diabetes risk is {risks['diabetes_risk'].lower()}")
    if risks.get("hypertension_risk"):
        risk_summary.append(f"hypertension risk is {risks['hypertension_risk'].lower()}")
    risk_text = f" Your current assessment suggests your {' and '.join(risk_summary)}." if risk_summary else ""
    name = profile.get("name", "there")
    return (
        f"Hi {name}, I can't reach the AI service right now, but I can still help with general guidance."
        f"{risk_text} Based on your profile, focus on steady movement, balanced meals, good sleep, and stress control."
        " For symptoms, medications, or diagnosis decisions, please speak with a doctor."
        f" Your question was: {message}"
    )


def profile_summary(d):
    activity = ["sedentary", "lightly active", "moderately active", "very active"][int(d.get("activity_level", 0))]
    conditions = ", ".join(d.get("conditions", ["None"])) if d.get("conditions") else "None"
    return (
        f"{d.get('age')}-year-old {d.get('gender', 'person')}, "
        f"BMI {d.get('bmi', 'N/A')}, {activity} lifestyle, "
        f"diet score {d.get('diet_score', 5)}/10, "
        f"sleeps {d.get('sleep_hours', 7)}h, "
        f"drinks {d.get('water_litres', 2)}L water/day, "
        f"stress level {d.get('stress_level', 5)}/10, "
        f"{'smoker' if d.get('smoking') else 'non-smoker'}, "
        f"{'occasional alcohol' if d.get('alcohol') else 'no alcohol'}, "
        f"family history: {'yes' if d.get('family_history') else 'no'}, "
        f"existing conditions: {conditions}"
    )


# ── Predict disease risk ─────────────────────────────────────────────────────
@app.route("/api/predict", methods=["POST"])
def predict():
    d = request.json
    feature_values = [
        float(d["age"]), float(d["bmi"]),
        int(d["family_history"]), float(d["diet_score"]),
        int(d["activity_level"]), float(d["sleep_hours"]),
    ]
    features = np.array([feature_values])
    diabetes_model = load_model("diabetes")
    hypertension_model = load_model("hypertension")
    diabetes_risk = (
        int(diabetes_model.predict(features)[0])
        if diabetes_model is not None else heuristic_risk(feature_values, "diabetes")
    )
    hypertension_risk = (
        int(hypertension_model.predict(features)[0])
        if hypertension_model is not None else heuristic_risk(feature_values, "hypertension")
    )
    return jsonify({
        "diabetes_risk": RISK_LABELS[diabetes_risk],
        "hypertension_risk": RISK_LABELS[hypertension_risk],
    })


# ── Groq: personalized recommendations ──────────────────────────────────────
@app.route("/api/recommendations", methods=["POST"])
def recommendations():
    d = request.json
    system = (
        "You are a certified Indian nutritionist and fitness coach. "
        "Give practical, culturally relevant advice using Indian foods and exercises. "
        "Be specific, not generic. "
        "Use exactly these sections and no others: Calorie Target, Diet Plan, Exercise Routine, Lifestyle Tips. "
        "Do not use markdown bold. Do not use nested bullets. "
        "Keep each bullet to one line and return 3-5 bullets per section."
    )
    prompt = (
        f"Create a personalized health plan for: {profile_summary(d)}\n"
        f"Diabetes risk: {d.get('diabetes_risk', 'Unknown')}, "
        f"Hypertension risk: {d.get('hypertension_risk', 'Unknown')}.\n"
        f"Include:\n"
        f"1. A realistic estimated daily calorie intake target in kcal/day with a one-line reason.\n"
        f"2. A diet plan with breakfast, lunch, dinner, and snack ideas using Indian foods.\n"
        f"3. An exercise routine with both gym and calisthenics/bodyweight options, sets/reps or duration, and weekly frequency.\n"
        f"4. 4-5 lifestyle tips tailored to their conditions and risk profile.\n"
        f"Keep the plan practical for a beginner and avoid vague advice. "
        f"Return short bullets only, not paragraphs."
    )
    try:
        text = groq_chat(prompt, system, max_tokens=1400)
    except RuntimeError:
        text = generate_plan_fallback(d)
    return jsonify({"recommendations": text, "recommendations_parsed": build_recommendations_payload(text)})


# ── Groq: daily feedback ─────────────────────────────────────────────────────
@app.route("/api/feedback", methods=["POST"])
def feedback():
    d = request.json
    mood_labels = {5: "great", 4: "good", 3: "okay", 2: "low", 1: "awful"}
    mood = mood_labels.get(d.get("mood", 3), "okay")
    energy_labels = {5: "very high", 4: "high", 3: "moderate", 2: "low", 1: "very low"}
    energy = energy_labels.get(d.get("energy", 3), "moderate")
    system = (
        "You are a supportive health coach. Give honest, specific, actionable feedback. "
        "Be encouraging but direct. Respond using these exact sections only: "
        "Headline, Wins, Focus Areas, Watchouts, Tomorrow Plan. "
        "Use 1 short bullet in Headline and 2-4 bullets in each other section."
    )
    symptoms = ", ".join(d.get("symptoms", [])) or "none"
    exercise_str = f"{d['exercise_duration']} min of {d['exercise_type']}" if d.get("exercise_type") and d.get("exercise_duration") else "none logged"
    bp_str = f"{d['bp_systolic']}/{d['bp_diastolic']} mmHg" if d.get("bp_systolic") and d.get("bp_diastolic") else "not logged"
    glucose_str = f"{d['blood_glucose']} mg/dL" if d.get("blood_glucose") else "not logged"
    prompt = (
        f"Analyze today's health data and create a concise coaching report:\n"
        f"- Steps: {d['steps']} (goal: {d.get('recommended_steps', 8000)})\n"
        f"- Exercise: {exercise_str}\n"
        f"- Meals: {d['food']}\n"
        f"- Sleep: {d['sleep']}h (recommended: 7-8h)\n"
        f"- Water: {d.get('water', 2)}L (recommended: 2.5-3L)\n"
        f"- Diet quality: {d['diet_score']}/10\n"
        f"- Mood: {mood}, Energy: {energy}\n"
        f"- Symptoms today: {symptoms}\n"
        f"- Blood pressure: {bp_str}\n"
        f"- Blood glucose: {glucose_str}\n"
        f"{'- Heart rate: ' + str(d['heart_rate']) + ' bpm' if d.get('heart_rate') else ''}\n"
        f"- Medication taken: {'yes' if d.get('medication_taken') else 'no'}\n"
        f"Give specific, actionable feedback. Flag any concerning symptoms or vitals."
    )
    try:
        text = groq_chat(prompt, system, max_tokens=1200)
    except RuntimeError:
        text = generate_feedback_fallback(d, mood)
    return jsonify({"feedback": text, "feedback_parsed": build_feedback_payload(text)})


# ── Health score calculation ─────────────────────────────────────────────────
@app.route("/api/health-score", methods=["POST"])
def health_score():
    d = request.json
    steps    = min(d["steps"] / 10000, 1.0) * 30
    diet     = min(d["diet_score"] / 10, 1.0) * 25
    sleep    = min(d["sleep"] / 8, 1.0) * 20
    exercise = min((d.get("exercise_duration", 0) or 0) / 45, 1.0) * 10
    water_bonus   = min(d.get("water", 2) / 3, 1.0) * 5
    mood_bonus    = (d.get("mood", 3) / 5) * 4
    energy_bonus  = (d.get("energy", 3) / 5) * 3
    med_bonus     = 3 if d.get("medication_taken") else 0
    symptom_penalty = len(d.get("symptoms", [])) * 2
    raw = steps + diet + sleep + exercise + water_bonus + mood_bonus + energy_bonus + med_bonus - symptom_penalty
    score = round(min(max(raw, 0), 100))
    return jsonify({"health_score": score})


# ── Groq: smart alerts ───────────────────────────────────────────────────────
@app.route("/api/alerts", methods=["POST"])
def alerts():
    d = request.json
    symptoms = ", ".join(d.get("symptoms", [])) or "none"
    exercise_str = f"{d.get('exercise_duration', 0)} min of {d.get('exercise_type', 'none')}"
    bp_str = f"{d['bp_systolic']}/{d['bp_diastolic']} mmHg" if d.get("bp_systolic") and d.get("bp_diastolic") else "not logged"
    glucose_str = f"{d['blood_glucose']} mg/dL" if d.get("blood_glucose") else "not logged"
    system = (
        "You are a preventive health coach. Give 3-5 very specific, actionable suggestions for tomorrow based on today's data. "
        "Return only short bullet points, one suggestion per line."
    )
    prompt = (
        f"Today's summary — steps: {d['steps']}, exercise: {exercise_str}, "
        f"diet: {d['diet_score']}/10, sleep: {d['sleep']}h, water: {d.get('water', 2)}L, "
        f"mood: {d.get('mood', 3)}/5, energy: {d.get('energy', 3)}/5, "
        f"symptoms: {symptoms}, BP: {bp_str}, glucose: {glucose_str}, "
        f"medication taken: {'yes' if d.get('medication_taken') else 'no'}.\n"
        f"Give 3 short, specific suggestions for tomorrow. Flag anything medically concerning."
    )
    try:
        text = groq_chat(prompt, system, max_tokens=400)
    except RuntimeError:
        text = generate_alerts_fallback(d)
    return jsonify({"alerts": text, "alerts_parsed": build_alerts_payload(text)})


# ── Groq: health chatbot ─────────────────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
def chat():
    d = request.json
    message = d.get("message", "")
    ctx = d.get("context", {})
    profile = ctx.get("profile", {})
    risks = ctx.get("risks", {})

    system = (
        "You are Preventra AI, a knowledgeable and empathetic health assistant. "
        "You have access to the user's health profile and risk assessment. "
        "Give clear, evidence-based answers. Always recommend consulting a doctor for medical decisions. "
        "Keep responses concise (under 150 words)."
    )
    context_str = ""
    if profile:
        context_str = f"User profile: {profile_summary(profile)}\n"
    if risks:
        context_str += f"Risk: Diabetes={risks.get('diabetes_risk')}, Hypertension={risks.get('hypertension_risk')}\n"

    prompt = f"{context_str}\nUser question: {message}"
    try:
        reply = groq_chat(prompt, system, max_tokens=300)
    except RuntimeError:
        reply = generate_chat_fallback(message, profile, risks)
    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(debug=True, port=5001)


# Serve React frontend build (if present) so GET / doesn't 404 in browsers.
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """If a production build of the React app exists in ../frontend/build, serve it.
    Otherwise return a small JSON message so the root path doesn't 404 during development.
    """
    build_dir = os.path.abspath(FRONTEND_BUILD_DIR)
    index_path = os.path.join(build_dir, "index.html")
    # If the frontend has been built, serve static files and index.html for SPA routing.
    if os.path.exists(index_path):
        if path and os.path.exists(os.path.join(build_dir, path)):
            return send_from_directory(build_dir, path)
        return send_from_directory(build_dir, "index.html")

    # No build present — respond with a helpful JSON message instead of 404.
    return jsonify({
        "message": "PreventraAI backend is running. Frontend build not found.",
        "hint": "Run the frontend dev server (npm start) or create a production build with `npm run build` in the frontend directory."
    })
