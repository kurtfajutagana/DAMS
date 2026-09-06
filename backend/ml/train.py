import os
import re
import time
import pandas as pd
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score

def map_teethtalk_intent(category, subcategory, procedure, text=""):
    cat_s = str(category).lower()
    subcat_s = str(subcategory).lower()
    proc_s = str(procedure).lower()
    text_s = str(text).lower()
    
    # Direct Booking & Appointment Intent
    if (any(k in text_s for k in ['magpa-book', 'magpabook', 'magpa-schedule', 'magpaschedule', 'book an appointment', 'set an appointment', 'schedule an appointment', 'reschedule', 'cancel my appointment', 'paano mag-book', 'paano magpa-appointment']) or
        any(k in subcat_s for k in ['appointment', 'scheduling', 'hours']) or
        any(k in proc_s for k in ['booking', 'appointment', 'operating hours', 'walk-in policy', 'walk-in'])):
        return 'appointments'

    # Billing / Prices / HMO
    elif (cat_s in ['pricelist', 'billing & insurance', 'general clinic inquiries'] or 
        any(k in subcat_s for k in ['payment', 'pricing', 'fee', 'insurance', 'consultation fees']) or
        any(k in cat_s for k in ['billing', 'insurance', 'price']) or
        any(k in text_s for k in ['magkano', 'how much', 'price', 'rate', 'presyo', 'hmo', 'downpayment', 'down payment', 'payment option'])):
        return 'billing'
        
    # Post-Operative Care / Aftercare / Emergencies
    elif (any(k in cat_s for k in ['emergency', 'patient care', 'aftercare']) or 
          any(k in subcat_s for k in ['emergency', 'post-extraction', 'medication', 'troubleshooting', 'aftercare']) or
          any(k in proc_s for k in ['aftercare', 'diet', 'medication', 'pain', 'dislodged', 'bleeding']) or
          any(k in text_s for k in ['pagkatapos', 'after extraction', 'after braces', 'dumudugo', 'masakit', 'bleeding', 'swelling', 'painkiller', 'antibiotic'])):
        return 'post_op_care'
        
    # General Clinic Inquiries / Overview / Locations
    else:
        return 'general_inquiry'

def load_dataset(data_dir="data"):
    # Check for possible dataset filenames
    candidates = [
        "teeth_talk_dental_faqs_and_pricelist.csv",
        "teethtalk_dental_faqs_and_pricelists.csv",
        "mock_dataset.csv"
    ]
    
    target_file = None
    for cand in candidates:
        cand_path = os.path.join(data_dir, cand)
        if os.path.exists(cand_path):
            target_file = cand_path
            break
            
    if not target_file:
        print(f"Error: No dataset found in '{data_dir}'. Looked for: {candidates}")
        return None

    print(f"Loading dataset from '{target_file}'...")
    df = pd.read_csv(target_file)
    
    # Check if this is the rich TeethTalk multi-column dataset
    if 'Primary Question (English)' in df.columns:
        print("Detected rich multi-column TeethTalk Dental FAQ & Pricelist format. Parsing samples...")
        records = []
        for _, row in df.iterrows():
            cat = row.get('Category', '')
            subcat = row.get('Subcategory', '')
            proc = row.get('Procedure / Item', '')
            
            # 1. Primary English Question
            q_en = str(row.get('Primary Question (English)', '')).strip()
            if q_en and q_en.lower() != 'nan':
                records.append({'text': q_en, 'intent': map_teethtalk_intent(cat, subcat, proc, q_en)})
                
            # 2. Primary Tagalog Question
            q_tl = str(row.get('Primary Question (Tagalog)', '')).strip()
            if q_tl and q_tl.lower() != 'nan':
                records.append({'text': q_tl, 'intent': map_teethtalk_intent(cat, subcat, proc, q_tl)})
                
            # 3. Question Variations (English)
            v_en = str(row.get('Question Variations (English)', '')).strip()
            if v_en and v_en.lower() != 'nan':
                for item in re.split(r'[;\n\r]+', v_en):
                    clean_item = item.strip().strip('"\'')
                    if len(clean_item) > 3:
                        records.append({'text': clean_item, 'intent': map_teethtalk_intent(cat, subcat, proc, clean_item)})
                        
            # 4. Question Variations (Tagalog)
            v_tl = str(row.get('Question Variations (Tagalog)', '')).strip()
            if v_tl and v_tl.lower() != 'nan':
                for item in re.split(r'[;\n\r]+', v_tl):
                    clean_item = item.strip().strip('"\'')
                    if len(clean_item) > 3:
                        records.append({'text': clean_item, 'intent': map_teethtalk_intent(cat, subcat, proc, clean_item)})
                        
        processed_df = pd.DataFrame(records).drop_duplicates(subset=['text']).reset_index(drop=True)
        print(f"Successfully extracted {len(processed_df)} unique training pairs across English & Tagalog.")
        return processed_df
        
    elif 'text' in df.columns and 'intent' in df.columns:
        print(f"Loaded standard 2-column dataset with {len(df)} samples.")
        return df[['text', 'intent']].dropna()
    else:
        print("Error: Unrecognized CSV format. Expected 'text','intent' or TeethTalk FAQ headers.")
        return None

def train_and_evaluate():
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    
    df = load_dataset()
    if df is None or len(df) == 0:
        return

    print("\nDataset Intent Distribution:")
    print(df['intent'].value_counts())

    X = df['text']
    y = df['intent']

    # Vectorize using TF-IDF (unigrams + bigrams for rich context)
    print("\nVectorizing text data using TF-IDF (ngram_range=(1,2))...")
    vectorizer = TfidfVectorizer(lowercase=True, ngram_range=(1, 2), sublinear_tf=True, max_features=5000)
    X_vec = vectorizer.fit_transform(X)

    # Train-test split (80% train, 20% test, stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X_vec, y, test_size=0.2, random_state=42, stratify=y
    )

    # Candidate classification models as specified in Capstone Methodology
    models = {
        "K-Nearest Neighbors (KNN)": KNeighborsClassifier(n_neighbors=5, weights='distance'),
        "Multinomial Naive Bayes (MNB)": MultinomialNB(alpha=0.1),
        "Logistic Regression (LR)": LogisticRegression(max_iter=1000, C=5.0, class_weight='balanced')
    }

    fitted_models = {}

    print("\n" + "="*70)
    print("      RIGOROUS ALGORITHM EVALUATION & SELECTION PIPELINE")
    print("="*70)
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for name, model in models.items():
        print(f"\nEvaluating Algorithm: {name}")
        print("-" * 50)
        
        # 1. 5-Fold Stratified Cross-Validation
        cv_scores = cross_val_score(model, X_vec, y, cv=cv, scoring='f1_weighted')
        cv_mean = np.mean(cv_scores)
        cv_std = np.std(cv_scores)
        
        # 2. Train on 80% Split
        train_start = time.time()
        model.fit(X_train, y_train)
        train_time = time.time() - train_start
        
        # 3. Predict on 20% Test Split
        predict_start = time.time()
        y_pred = model.predict(X_test)
        predict_time = time.time() - predict_start
        
        # 4. Comprehensive Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        
        print(f"  * 5-Fold CV Weighted F1-Score       : {cv_mean:.4f} (+/- {cv_std*2:.4f})")
        print(f"  * Test Set Accuracy                 : {acc:.4f} ({acc*100:.2f}%)")
        print(f"  * Weighted Precision               : {prec:.4f}")
        print(f"  * Weighted Recall                  : {rec:.4f}")
        print(f"  * Weighted F1-Score                : {f1:.4f}")
        print(f"  * Training Latency                 : {train_time*1000:.2f} ms")
        print(f"  * Prediction Latency               : {predict_time*1000:.2f} ms")
        
        # Detailed report
        print("\n  Classification Breakdown:")
        print(classification_report(y_test, y_pred, zero_division=0))
        
        # Store fitted model
        fitted_models[name] = model

    # Formal selection per Capstone Manuscript (Pages 18, 44-47):
    # Logistic Regression was formally selected because of its ability to process numerical TF-IDF text vectors
    # without assuming feature independence (unlike Naive Bayes) and providing exact Sigmoid probability scoring.
    selected_name = "Logistic Regression (LR)"
    selected_model = fitted_models[selected_name]

    print("="*70)
    print(f">> FORMALLY SELECTED ARCHITECTURE: {selected_name}")
    print("="*70)
    print("Selection Justification (Manuscript Pages 18 & 44-47):")
    print("  1. Unlike Multinomial Naive Bayes, Logistic Regression does NOT assume feature independence,")
    print("     enabling it to capture nuanced multi-word clinical phrases and pricing combinations.")
    print("  2. Unlike KNN, Logistic Regression avoids high-dimensional computational overhead and latency.")
    print("  3. Employs mathematically calibrated Sigmoid/Softmax activation for exact probability scoring.")

    # Save the Logistic Regression model and TF-IDF vectorizer
    model_path = os.path.join(model_dir, "best_intent_model.joblib")
    vectorizer_path = os.path.join(model_dir, "tfidf_vectorizer.joblib")
    
    print(f"\nExporting trained {selected_name} to '{model_path}'...")
    joblib.dump(selected_model, model_path)
    
    print(f"Exporting TF-IDF Vectorizer to '{vectorizer_path}'...")
    joblib.dump(vectorizer, vectorizer_path)
    
    print("\n[SUCCESS] Successfully retrained and exported Logistic Regression intent model!")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    train_and_evaluate()
