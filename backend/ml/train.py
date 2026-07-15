import os
import time
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import numpy as np

def train_and_evaluate():
    data_path = "data/mock_dataset.csv"
    model_dir = "models"
    
    # Ensure model directory exists
    os.makedirs(model_dir, exist_ok=True)
    
    print(f"Loading dataset from {data_path}...")
    try:
        df = pd.read_csv(data_path)
    except FileNotFoundError:
        print(f"Error: {data_path} not found. Please run generate_mock_data.py first.")
        return

    # Check if dataset has required columns
    if 'text' not in df.columns or 'intent' not in df.columns:
        print("Error: Dataset must contain 'text' and 'intent' columns.")
        return

    X = df['text']
    y = df['intent']

    # Vectorize the text data
    print("Vectorizing text data using TF-IDF...")
    vectorizer = TfidfVectorizer(lowercase=True)
    X_vec = vectorizer.fit_transform(X)

    # Train-test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(X_vec, y, test_size=0.2, random_state=42)

    # Define models
    models = {
        "KNN": KNeighborsClassifier(n_neighbors=5),
        "Naive Bayes": MultinomialNB(),
        "Logistic Regression": LogisticRegression(max_iter=1000)
    }

    best_model_name = None
    best_model = None
    best_score = -float('inf')

    print("\n--- Rigorous Training and Evaluation ---")
    for name, model in models.items():
        print(f"\nEvaluating {name}...")
        
        # 1. Cross-Validation for Stability Proof
        cv_scores = cross_val_score(model, X_vec, y, cv=5)
        cv_mean = np.mean(cv_scores)
        
        # 2. Train on the 80% split
        train_start = time.time()
        model.fit(X_train, y_train)
        train_time = time.time() - train_start
        
        # 3. Predict on 20% split and measure latency
        predict_start = time.time()
        y_pred = model.predict(X_test)
        predict_time = time.time() - predict_start
        
        # Evaluate
        acc = accuracy_score(y_test, y_pred)
        
        print(f"5-Fold CV Accuracy : {cv_mean:.4f} (+/- {np.std(cv_scores)*2:.4f})")
        print(f"Test Set Accuracy  : {acc:.4f}")
        print(f"Training Time      : {train_time:.5f} sec")
        print(f"Prediction Time    : {predict_time:.5f} sec")
        
        # Scoring mechanism to choose the best model
        # We value Cross-Validation stability and Prediction Speed for chatbots
        # A penalty is applied to prediction time to break accuracy ties
        combined_score = cv_mean - (predict_time * 0.1)
        
        if combined_score > best_score:
            best_score = combined_score
            best_model_name = name
            best_model = model

    print("\n--- Summary & Proof of Selection ---")
    print(f"Best Model Selected: {best_model_name}")
    print("Reasoning: Evaluated using 5-Fold Cross-Validation for statistical stability and prediction latency (critical for chatbot response time).")

    # Save the best model and the vectorizer
    if best_model:
        model_path = os.path.join(model_dir, "best_intent_model.joblib")
        vectorizer_path = os.path.join(model_dir, "tfidf_vectorizer.joblib")
        
        print(f"\nSaving {best_model_name} to {model_path}...")
        joblib.dump(best_model, model_path)
        
        print(f"Saving vectorizer to {vectorizer_path}...")
        joblib.dump(vectorizer, vectorizer_path)
        
        print("Pipeline successfully trained and saved!")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    train_and_evaluate()
