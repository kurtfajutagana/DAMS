import os
# Force reload 2
import joblib
from services.chatbot import generate_response
# Paths to the saved models
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "best_intent_model.joblib")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib")

# Load models lazily
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
            print("Successfully loaded ML intent model and vectorizer.")
        else:
            print("Warning: ML models not found. Please run the training script.")
    except Exception as e:
        print(f"Error loading models: {e}")
    finally:
        models_loaded = True

# Predefined templates for each intent
INTENT_TEMPLATES = {
    "billing": "For billing inquiries, such as braces costs, fees, or insurance questions, please contact our front desk at (02) 8123-4567. We offer various payment methods including cash, credit cards, and installments for major procedures.",
    "appointments": "To schedule, cancel, or reschedule an appointment, please call us directly or use the booking tab on your dashboard. We are open Monday to Saturday from 9:00 AM to 5:00 PM. We do accept walk-ins depending on dentist availability.",
    "post_op_care": "For post-operative care: Avoid eating solid foods until the anesthesia wears off. If you experience severe bleeding, swelling, or worsening pain that isn't managed by prescribed painkillers, please contact us immediately or visit the nearest emergency room.",
    "general_inquiry": "Welcome to Teethtalk Dental Clinic Pasig! We offer a full range of services including pediatric dentistry, aligners, teeth whitening, and general checkups. If you have a specific inquiry, please let our staff know and we'll be happy to assist you!"
}

def generate_hybrid_response(prompt: str, history: list = None) -> str:
    """
    Classifies the user's prompt using the trained ML model. If confidence is high and it's not a general inquiry, returns a predefined response. Otherwise, falls back to Gemini.
    """
    load_models_if_needed()
    
    if not model or not vectorizer:
        return "Our AI system is currently undergoing maintenance. Please contact the clinic directly for assistance."
    
    try:
        # Vectorize the input
        X_vec = vectorizer.transform([prompt])
        
        # Predict intent probabilities
        if hasattr(model, 'predict_proba'):
            probs = model.predict_proba(X_vec)[0]
            max_prob = max(probs)
            intent = model.classes_[probs.argmax()]
        else:
            intent = model.predict(X_vec)[0]
            max_prob = 1.0
            
        # Safeguard for overconfident small ML models: check for intent keywords
        intent_keywords = {
            "billing": ["cost", "price", "pay", "fee", "insurance", "card", "cash", "installment", "bill"],
            "appointments": ["schedule", "book", "cancel", "reschedule", "appointment", "visit", "open", "close", "time", "hours"],
            "post_op_care": ["pain", "bleeding", "swelling", "after", "care", "hurt", "eat", "drink", "anesthesia", "recovery", "surgery"]
        }
        
        has_keyword = False
        if intent in intent_keywords:
            has_keyword = any(kw in prompt.lower() for kw in intent_keywords[intent])
        
        # Hybrid routing logic: We let Gemini handle "billing" so it can dynamically quote the real database fees.
        if max_prob >= 0.65 and intent not in ["general_inquiry", "billing"] and has_keyword:
            # High confidence, specific operational intent AND keyword matches -> ML Fast-Path
            response = INTENT_TEMPLATES.get(intent, "I'm not exactly sure how to answer that. Could you please call our clinic for more details?")
            return response
        else:
            # Low confidence, general inquiry, OR false positive -> Gemini Fallback
            return generate_response(prompt, history=history)
    except Exception as e:
        print(f"Error classifying intent: {e}")
        return "I'm sorry, I'm having trouble understanding right now. Please try again later."
