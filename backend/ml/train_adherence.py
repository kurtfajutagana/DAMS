import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import joblib

def generate_mock_adherence_data(n_samples=500):
    np.random.seed(42)
    # Features:
    # missed_reminders: 0 to 20
    # days_since_last_visit: 0 to 365
    # chatbot_inquiries: 0 to 50
    missed_reminders = np.random.poisson(lam=2.0, size=n_samples)
    days_since_last_visit = np.random.randint(5, 180, size=n_samples)
    chatbot_inquiries = np.random.poisson(lam=5.0, size=n_samples)
    
    # We define High Risk (1) if missed_reminders is high, or days_since_last_visit is high
    # We add some noise to make it realistic
    risk_prob = 1 / (1 + np.exp(-(0.8 * missed_reminders + 0.02 * days_since_last_visit - 0.1 * chatbot_inquiries - 3)))
    labels = (risk_prob > 0.5).astype(int)
    
    df = pd.DataFrame({
        'missed_reminders': missed_reminders,
        'days_since_last_visit': days_since_last_visit,
        'chatbot_inquiries': chatbot_inquiries,
        'high_risk': labels
    })
    return df

def train_adherence_model():
    print("Generating mock adherence data...")
    df = generate_mock_adherence_data()
    
    X = df[['missed_reminders', 'days_since_last_visit', 'chatbot_inquiries']]
    y = df['high_risk']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Logistic Regression Model for Adherence Risk...")
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Test Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred))
    
    # Save the model
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "best_adherence_model.joblib")
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    train_adherence_model()
