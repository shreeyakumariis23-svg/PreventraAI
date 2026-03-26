from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, os, numpy as np
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml")
RISK_LABELS = ["Low", "Medium", "High"]


def load_model(name):
    with open(os.path.join(MODEL_DIR, f"{name}_model.pkl"), "rb") as f:
        return pickle.load(f)


def groq_chat(prompt: str, system: str = None, max_tokens: int = 1024) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    res = groq_client.chat.completions.create(
        model="llama3-70b-8192",
        messages=messages,
        temperature=0.7,
        max_tokens=max_tokens,
    )
    return res.choices[0].message.content


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
    features = np.array([[
        float(d["age"]), float(d["bmi"]),
        int(d["family_history"]), float(d["diet_score"]),
        int(d["activity_level"]), float(d["sleep_hours"]),
    ]])
    return jsonify({
        "diabetes_risk":     RISK_LABELS[load_model("diabetes").predict(features)[0]],
        "hypertension_risk": RISK_LABELS[load_model("hypertension").predict(features)[0]],
    })


# ── Groq: personalized recommendations ──────────────────────────────────────
@app.route("/api/recommendations", methods=["POST"])
def recommendations():
    d = request.json
    system = (
        "You are a certified Indian nutritionist and fitness coach. "
        "Give practical, culturally relevant advice using Indian foods and exercises. "
        "Be specific, not generic. Use sections: Diet Plan, Exercise Routine, Lifestyle Tips."
    )
    prompt = (
        f"Create a personalized health plan for: {profile_summary(d)}\n"
        f"Diabetes risk: {d.get('diabetes_risk', 'Unknown')}, "
        f"Hypertension risk: {d.get('hypertension_risk', 'Unknown')}.\n"
        f"Include specific Indian meal suggestions (breakfast, lunch, dinner), "
        f"a weekly exercise schedule, and 4-5 lifestyle tips tailored to their risk profile."
    )
    return jsonify({"recommendations": groq_chat(prompt, system, max_tokens=1200)})


# ── Groq: daily feedback ─────────────────────────────────────────────────────
@app.route("/api/feedback", methods=["POST"])
def feedback():
    d = request.json
    mood_labels = {5: "great", 4: "good", 3: "okay", 2: "low", 1: "awful"}
    mood = mood_labels.get(d.get("mood", 3), "okay")
    system = "You are a supportive health coach. Give honest, specific, actionable feedback. Be encouraging but direct."
    prompt = (
        f"Analyze today's health data and give 4-5 bullet point feedback:\n"
        f"- Steps: {d['steps']} (goal: {d.get('recommended_steps', 8000)})\n"
        f"- Meals: {d['food']}\n"
        f"- Sleep: {d['sleep']}h (recommended: 7-8h)\n"
        f"- Water: {d.get('water', 2)}L (recommended: 2.5-3L)\n"
        f"- Diet quality: {d['diet_score']}/10\n"
        f"- Mood: {mood}\n"
        f"{'- Heart rate: ' + str(d['heart_rate']) + ' bpm' if d.get('heart_rate') else ''}\n"
        f"Compare against goals and give specific, actionable feedback for each metric."
    )
    return jsonify({"feedback": groq_chat(prompt, system)})


# ── Health score calculation ─────────────────────────────────────────────────
@app.route("/api/health-score", methods=["POST"])
def health_score():
    d = request.json
    steps = min(d["steps"] / 10000, 1.0) * 40
    diet  = min(d["diet_score"] / 10, 1.0) * 40
    sleep = min(d["sleep"] / 8, 1.0) * 20
    # Bonus points for water and mood (up to 5 each, deducted from base)
    water_bonus = min(d.get("water", 2) / 3, 1.0) * 5
    mood_bonus  = (d.get("mood", 3) / 5) * 5
    raw = steps + diet + sleep
    # Scale to 100 with bonuses as tie-breakers (max still 100)
    score = round(min(raw * 0.9 + water_bonus + mood_bonus, 100))
    return jsonify({"health_score": score})


# ── Groq: smart alerts ───────────────────────────────────────────────────────
@app.route("/api/alerts", methods=["POST"])
def alerts():
    d = request.json
    system = "You are a preventive health coach. Give 2-3 very specific, actionable suggestions for tomorrow."
    prompt = (
        f"Today's summary — steps: {d['steps']}, diet: {d['diet_score']}/10, "
        f"sleep: {d['sleep']}h, water: {d.get('water', 2)}L, mood: {d.get('mood', 3)}/5.\n"
        f"Give 2-3 short, specific suggestions for tomorrow to improve health score."
    )
    return jsonify({"alerts": groq_chat(prompt, system, max_tokens=300)})


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
    return jsonify({"reply": groq_chat(prompt, system, max_tokens=300)})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
