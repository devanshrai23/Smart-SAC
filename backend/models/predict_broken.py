import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

def train_predict_broken_model(data_path=None):
    """
    Trains a model to predict if an equipment is likely to break based on its use cycle.
    Features: total_use_duration_hours, number_of_uses, age_days
    Target: is_broken (1 = broken, 0 = functional)
    """
    if data_path:
        df = pd.read_csv(data_path)
    else:
        # Simulate data based on the Prisma schema concepts
        np.random.seed(42)
        n_samples = 1000
        
        total_use_duration_hours = np.random.uniform(10, 5000, n_samples)
        number_of_uses = np.random.randint(1, 1000, n_samples)
        age_days = np.random.randint(10, 1500, n_samples)
        
        # Simple heuristic: more usage and older equipment -> higher chance of breaking
        break_prob = (total_use_duration_hours / 5000) * 0.5 + (age_days / 1500) * 0.5
        is_broken = (np.random.rand(n_samples) < break_prob).astype(int)
        
        df = pd.DataFrame({
            'total_use_duration_hours': total_use_duration_hours,
            'number_of_uses': number_of_uses,
            'age_days': age_days,
            'is_broken': is_broken
        })
        
    X = df[['total_use_duration_hours', 'number_of_uses', 'age_days']]
    y = df['is_broken']
    
    # Split the dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train the Random Forest Classifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    print("--- Model Evaluation: Predict Broken Status ---")
    print("Accuracy:", accuracy_score(y_test, predictions))
    print(classification_report(y_test, predictions))
    
    # Save the trained model
    joblib.dump(model, 'broken_prediction_model.pkl')
    print("Model saved to 'broken_prediction_model.pkl'\n")

def predict_is_broken(total_use_duration_hours, number_of_uses, age_days):
    """
    Predicts if a specific equipment is at risk of breaking.
    """
    try:
        model = joblib.load('broken_prediction_model.pkl')
        # We suppress sklearn feature name warnings by using values
        features = [[total_use_duration_hours, number_of_uses, age_days]]
        prediction = model.predict(features)
        prob = model.predict_proba(features)
        return {
            "is_broken_prediction": bool(prediction[0]),
            "breakage_probability": round(prob[0][1], 4)
        }
    except FileNotFoundError:
        return {"error": "Model not found. Please train the model first by running the script."}

if __name__ == "__main__":
    # 1. Train the model (simulates data generation if no CSV is provided)
    train_predict_broken_model()
    
    # 2. Example predictions
    print("--- Example Predictions ---")
    new_eq = predict_is_broken(100, 20, 30)
    print(f"New Equipment (low use): {new_eq}")
    
    old_eq = predict_is_broken(4500, 900, 1400)
    print(f"Old Equipment (heavy use): {old_eq}")
