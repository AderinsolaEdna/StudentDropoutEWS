import os
import joblib
import numpy as np
import pandas as pd
from django.conf import settings

MODEL_DIR = os.path.join(settings.BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, "ews_best_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "ews_scaler.pkl")
FEAT_NAMES_PATH = os.path.join(MODEL_DIR, "ews_feature_names.pkl")
TOP_FEAT_PATH = os.path.join(MODEL_DIR, "ews_top_features.pkl")
FEAT_IMPS_PATH = os.path.join(MODEL_DIR, "ews_feature_importances.pkl")

_model = None
_scaler = None
_feature_names = None
_top_features = None
_feature_importances = None

# Numeric columns list that need scaling (must match train_ews.py exactly)
NUMERIC_COLS = [
    "CGPA_5point_Scale",
    "GPA_Semester_1_5pt",
    "GPA_Semester_2_5pt",
    "GPA_Change",
    "UTME_PostUME_Score",
    "Secondary_School_Exit_Grade",
    "Age_at_Matriculation",
    "Units_Registered_Semester_1", "Units_Passed_Semester_1",
    "Assessments_Sat_Semester_1",  "Units_No_Assessment_Semester_1",
    "Pass_Rate_Semester_1",
    "Units_Registered_Semester_2", "Units_Passed_Semester_2",
    "Assessments_Sat_Semester_2",  "Units_No_Assessment_Semester_2",
    "Pass_Rate_Semester_2",
]


def load_assets():
    """Load serialized assets from models directory."""
    global _model, _scaler, _feature_names, _top_features, _feature_importances
    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            _feature_names = joblib.load(FEAT_NAMES_PATH)
            _top_features = joblib.load(TOP_FEAT_PATH)
            _feature_importances = joblib.load(FEAT_IMPS_PATH)
            return True
        except Exception as e:
            print(f"[-] Error loading joblib assets: {e}")
            return False
    return False


# Rule-based intervention engine configuration
INTERVENTION_RULES = [
    {
        "domain": "Financial (Arrears/Fees)",
        "features": {"Fee_Arrears_Status", "School_Fees_Payment_Status"},
        "tier": "High Risk",
        "intervention": "Immediate referral to Bursary Office for fee deferral or bursary application; notify Dean of Student Affairs"
    },
    {
        "domain": "Financial (Arrears/Fees)",
        "features": {"Fee_Arrears_Status", "School_Fees_Payment_Status"},
        "tier": "Medium Risk",
        "intervention": "Advisory notification on bursary and financial aid options; scheduled welfare officer meeting"
    },
    {
        "domain": "Academic (CGPA/GPA)",
        "features": {"CGPA_5point_Scale", "GPA_Semester_1_5pt", "GPA_Semester_2_5pt", "GPA_Change"},
        "tier": "High Risk",
        "intervention": "Referral to academic adviser for urgent improvement plan; consideration for supplementary examination access"
    },
    {
        "domain": "Academic (CGPA/GPA)",
        "features": {"CGPA_5point_Scale", "GPA_Semester_1_5pt", "GPA_Semester_2_5pt", "GPA_Change"},
        "tier": "Medium Risk",
        "intervention": "Recommendation for peer tutoring; adviser check-in within two weeks"
    },
    {
        "domain": "Academic (Course Load/Progress)",
        "features": {"Units_Passed_Semester_1", "Units_Passed_Semester_2"},
        "tier": "High Risk",
        "intervention": "Academic review with Head of Department; assessment of course load and repeat options"
    },
    {
        "domain": "Social (First Gen)",
        "features": {"First_Generation_Student"},
        "tier": "any",
        "intervention": "Referral to mentorship programme; connection with senior peer students"
    },
    {
        "domain": "Welfare (Housing)",
        "features": {"Hostel_Residency", "Non_Resident_Student"},
        "tier": "Medium Risk",
        "intervention": "Welfare check on off-campus living conditions; hostel allocation information"
    }
]

MULTI_FLAG_INTERVENTION = "Multi-agency intervention (adviser, welfare officer, bursary); case flagged for Dean of Students review"


def resolve_intervention(top_drivers: list, risk_tier: str) -> str:
    """Map driver features and risk tier to recommended intervention (pure function)."""
    driver_set = set(top_drivers)
    matched_interventions = []
    matched_domains = set()

    for rule in INTERVENTION_RULES:
        overlap = driver_set & rule["features"]
        if overlap and (rule["tier"] == risk_tier or rule["tier"] == "any"):
            matched_interventions.append(rule["intervention"])
            matched_domains.add(rule["domain"])

    # If drivers span 2 or more distinct domains at high risk, trigger multi-agency response
    if len(matched_domains) >= 2 and risk_tier == "High Risk":
        return MULTI_FLAG_INTERVENTION
    elif len(matched_interventions) == 1:
        return matched_interventions[0]
    elif len(matched_interventions) > 1:
        # Return the first matching recommendation in order
        return matched_interventions[0]

    # Fallback default intervention
    return "General welfare monitoring recommended. Schedule academic adviser check-in."


def calculate_student_drivers(student_row_dict: dict) -> list:
    """Calculate the top 2 features driving the student's risk using global importances and local signals."""
    global _top_features, _feature_importances
    if _top_features is None:
        load_assets()

    driver_scores = {}
    for feat in _top_features:
        if feat not in student_row_dict:
            continue

        val = student_row_dict[feat]
        signal = 0.0

        # Financial
        if feat == "Fee_Arrears_Status":
            signal = float(val)
        elif feat == "School_Fees_Payment_Status":
            signal = 1.0 - float(val)
        elif feat == "Bursary_Scholarship_Status":
            signal = 1.0 - float(val)

        # Academic scores (low scores mean high risk)
        elif feat in ["CGPA_5point_Scale", "GPA_Semester_1_5pt", "GPA_Semester_2_5pt"]:
            signal = max(0.0, (5.0 - float(val)) / 5.0)
        elif feat == "GPA_Change":
            signal = max(0.0, -float(val))  # Negative values are risky
        elif feat in ["Pass_Rate_Semester_1", "Pass_Rate_Semester_2"]:
            signal = 1.0 - float(val)

        # Semester unit counts
        elif feat in ["Units_Passed_Semester_1", "Units_Passed_Semester_2"]:
            reg_feat = feat.replace("Passed", "Registered")
            if reg_feat in student_row_dict and student_row_dict[reg_feat] > 0:
                signal = 1.0 - (float(val) / float(student_row_dict[reg_feat]))
            else:
                signal = max(0.0, (10.0 - float(val)) / 10.0)
        elif feat in ["Units_No_Assessment_Semester_1", "Units_No_Assessment_Semester_2"]:
            signal = min(1.0, float(val) / 5.0)

        # General background
        elif feat == "First_Generation_Student":
            signal = float(val)
        elif feat == "Non_Resident_Student":
            signal = float(val)
        elif feat == "Hostel_Residency":
            signal = 1.0 - float(val)
        elif feat == "Marital_Status_Binary":
            signal = float(val)
        else:
            signal = 0.5

        # Multiply student signal by model feature importance
        global_weight = _feature_importances.get(feat, 0.05) if _feature_importances else 0.05
        driver_scores[feat] = signal * global_weight

    # Sort drivers in descending order and select top 2
    top_2 = sorted(driver_scores, key=driver_scores.get, reverse=True)[:2]

    # Pad to ensure exactly 2 drivers are returned
    if len(top_2) < 2:
        for f in _top_features:
            if f not in top_2 and f in student_row_dict:
                top_2.append(f)
            if len(top_2) == 2:
                break

    return top_2


def predict_dropout_risk(student_row_dict: dict) -> dict:
    """Predicts dropout probability, risk tier, top drivers, and recommended intervention for a single student."""
    global _model, _scaler, _feature_names, _top_features, _feature_importances

    # Ensure assets are loaded
    if _model is None:
        if not load_assets():
            return {
                "error": "Model assets not loaded. Please run the training pipeline first."
            }

    # Step A: Convert input to DataFrame
    raw_df = pd.DataFrame([student_row_dict])

    # Drop target and macro variables if present
    TARGET = "Dropout_Status"
    DROP_COLS = ["Unemployment rate", "Inflation rate", "GDP", "Nationality", "International"]
    if TARGET in raw_df.columns:
        raw_df.drop(columns=[TARGET], inplace=True)
    raw_df.drop(columns=[c for c in DROP_COLS if c in raw_df.columns], inplace=True, errors="ignore")

    # Step B: Categorical One-Hot Encoding Alignment
    if "Faculty" in raw_df.columns:
        raw_df = pd.get_dummies(raw_df, columns=["Faculty"], drop_first=True, dtype=int)

    # Reconstruct/align all features from training layout
    for col in _feature_names:
        if col not in raw_df.columns:
            raw_df[col] = 0

    # Keep only the columns present in feature names and in that exact order
    raw_df = raw_df[_feature_names]

    # Step C: Feature Scaling
    scaled_df = raw_df.copy()
    scale_cols_present = [c for c in NUMERIC_COLS if c in scaled_df.columns]
    scaled_df[scale_cols_present] = _scaler.transform(raw_df[scale_cols_present])

    # Step D: Inference Probability
    X_infer = np.array(scaled_df)
    prob = float(_model.predict_proba(X_infer)[0, 1])
    if prob > 0.995:
        prob = 0.995

    # Step E: Determine Risk Tier (User Specified Thresholds)
    if prob >= 0.70:
        risk_tier = "High Risk"
    elif prob >= 0.40:
        risk_tier = "Medium Risk"
    else:
        risk_tier = "Low Risk"

    # Step F: Calculate Student-Specific Top Drivers
    top_2 = calculate_student_drivers(student_row_dict)

    # Step G: Resolve Table 3.3 Intervention
    intervention = resolve_intervention(top_2, risk_tier)

    return {
        "probability": round(prob, 4),
        "risk_tier": risk_tier,
        "top_drivers": top_2,
        "actionable_intervention": intervention
    }


def predict_dropout_risk_batch(df_raw: pd.DataFrame) -> list:
    """Predicts dropout risk for a batch of student records (vectorized inference)."""
    global _model, _scaler, _feature_names, _top_features, _feature_importances

    # Ensure assets are loaded
    if _model is None:
        if not load_assets():
            raise RuntimeError("Model assets not loaded.")

    # Step A: Preprocess batch DataFrame
    raw_df = df_raw.copy()

    # Drop target and macro variables if present
    TARGET = "Dropout_Status"
    DROP_COLS = ["Unemployment rate", "Inflation rate", "GDP", "Nationality", "International"]
    if TARGET in raw_df.columns:
        raw_df.drop(columns=[TARGET], inplace=True)
    raw_df.drop(columns=[c for c in DROP_COLS if c in raw_df.columns], inplace=True, errors="ignore")

    # Step B: Categorical One-Hot Encoding Alignment
    if "Faculty" in raw_df.columns:
        raw_df = pd.get_dummies(raw_df, columns=["Faculty"], drop_first=True, dtype=int)

    # Reconstruct/align all features from training layout
    for col in _feature_names:
        if col not in raw_df.columns:
            raw_df[col] = 0

    # Keep only the columns present in feature names and in that exact order
    raw_df = raw_df[_feature_names]

    # Step C: Feature Scaling
    scaled_df = raw_df.copy()
    scale_cols_present = [c for c in NUMERIC_COLS if c in scaled_df.columns]
    scaled_df[scale_cols_present] = _scaler.transform(raw_df[scale_cols_present])

    # Step D: Inference Probability (Batch)
    X_infer = np.array(scaled_df)
    probs = _model.predict_proba(X_infer)[:, 1]
    probs = np.minimum(probs, 0.995)

    # Step E: Resolve Drivers and Interventions per Student
    results = []
    records = df_raw.to_dict(orient='records')

    for i, student_row_dict in enumerate(records):
        prob = float(probs[i])

        if prob >= 0.70:
            risk_tier = "High Risk"
        elif prob >= 0.40:
            risk_tier = "Medium Risk"
        else:
            risk_tier = "Low Risk"

        top_2 = calculate_student_drivers(student_row_dict)
        intervention = resolve_intervention(top_2, risk_tier)

        results.append({
            "probability": round(prob, 4),
            "risk_tier": risk_tier,
            "top_drivers": top_2,
            "actionable_intervention": intervention
        })

    return results
