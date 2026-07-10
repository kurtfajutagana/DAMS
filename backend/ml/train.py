import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

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
    best_accuracy = 0.0

    print("\n--- Training and Evaluation ---")
    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train, y_train)
        
        # Predict on test set
        y_pred = model.predict(X_test)
        
        # Evaluate
        acc = accuracy_score(y_test, y_pred)
        print(f"{name} Accuracy: {acc:.4f}")
        print(classification_report(y_test, y_pred, zero_division=0))
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model_name = name
            best_model = model

    print("\n--- Summary ---")
    print(f"Best Model: {best_model_name} with Accuracy: {best_accuracy:.4f}")

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
    # Ensure working directory is the ml folder when this script is run
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    train_and_evaluate()
