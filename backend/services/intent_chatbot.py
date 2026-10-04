import os
import joblib
from services.chatbot import generate_response

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "best_intent_model.joblib")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib")

model = None
vectorizer = None
models_loaded = False

def load_models_if_needed():
    global model, vectorizer, models_loaded
    if models_loaded:
        return
        
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
            model = joblib.load(MODEL_PATH)
            vectorizer = joblib.load(VECTORIZER_PATH)
    except Exception as e:
        print(f"Error loading models: {e}")
    finally:
        models_loaded = True

INTENT_TEMPLATES = {
    "post_op_care": "For post-operative care: Avoid eating solid foods until the anesthesia wears off. If you experience severe bleeding, swelling, or worsening pain that isn't managed by prescribed painkillers, please contact us immediately or visit the nearest emergency room."
}

def generate_hybrid_response(prompt: str, history: list = None, patient_id: str = None) -> str:
    """Classifies user inquiry intent and returns matched protocol response or conversational fallback."""
    load_models_if_needed()
    
    if not model or not vectorizer:
        return "Our clinical inquiry system is currently undergoing maintenance. Please contact the clinic directly for assistance."
    
    try:
        X_vec = vectorizer.transform([prompt])
        
        if hasattr(model, 'predict_proba'):
            probs = model.predict_proba(X_vec)[0]
            max_prob = max(probs)
            intent = model.classes_[probs.argmax()]
        else:
            intent = model.predict(X_vec)[0]
            max_prob = 1.0
            
        intent_keywords = {
            "post_op_care": ["pain", "bleeding", "swelling", "after", "care", "hurt", "eat", "drink", "anesthesia", "recovery", "surgery"]
        }
        
        has_keyword = False
        if intent in intent_keywords:
            has_keyword = any(kw in prompt.lower() for kw in intent_keywords[intent])
        
        if max_prob >= 0.65 and intent not in ["general_inquiry", "billing", "appointments"] and has_keyword:
            return INTENT_TEMPLATES.get(intent, "I'm not exactly sure how to answer that. Could you please call our clinic for more details?")
        else:
            return generate_response(prompt, history=history, patient_id=patient_id)
    except Exception as e:
        print(f"Error classifying intent: {e}")
        return "I'm sorry, I'm having trouble understanding right now. Please try again later."
