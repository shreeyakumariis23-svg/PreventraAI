"""
Train and save disease risk prediction models.
Run from the project root: python ml/train_model.py
"""
import os, numpy as np, pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

np.random.seed(42)
N = 2000
SAVE_DIR = os.path.dirname(os.path.abspath(__file__))

# Features: [age, bmi, family_history, diet_score, activity_level, sleep_hours]
X = np.column_stack([
    np.random.randint(18, 75, N),       # age
    np.random.uniform(16, 42, N),       # bmi
    np.random.randint(0, 2, N),         # family_history (0/1)
    np.random.uniform(1, 10, N),        # diet_score (1=poor, 10=excellent)
    np.random.randint(0, 4, N),         # activity_level (0=sedentary, 3=very active)
    np.random.uniform(3, 11, N),        # sleep_hours
])

def risk_label(row, offset=0):
    age, bmi, fh, diet, activity, sleep = row
    score = (
        int(bmi + offset > 27) +
        int(age > 45) +
        int(fh == 1) +
        int(diet < 5) +
        int(activity < 2) +
        int(sleep < 6)
    )
    return 2 if score >= 4 else 1 if score >= 2 else 0  # High / Medium / Low

y_diabetes     = np.array([risk_label(x) for x in X])
y_hypertension = np.array([risk_label(x, offset=2) for x in X])  # slightly different threshold

for name, y in [("diabetes", y_diabetes), ("hypertension", y_hypertension)]:
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42)
    clf.fit(X_tr, y_tr)
    acc = clf.score(X_te, y_te)
    path = os.path.join(SAVE_DIR, f"{name}_model.pkl")
    with open(path, "wb") as f:
        pickle.dump(clf, f)
    print(f"[OK] {name}_model.pkl saved  |  test accuracy: {acc:.2%}")
