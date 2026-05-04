import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

def train_occupied_status_model(data_path=None):
    """
    Trains a model to predict the occupied status (in-use vs available) 
    of an equipment based on its use time (hour, day).
    Target: is_occupied (1 = occupied, 0 = available)
    """
    if data_path:
        df = pd.read_csv(data_path)
    else:
        # Simulate time-series usage data
        np.random.seed(42)
        n_samples = 1500
        
        hour_of_day = np.random.randint(0, 24, n_samples)
        day_of_week = np.random.randint(0, 7, n_samples) # 0=Monday, 6=Sunday
        
        # Usage logic: peak hours usually 14:00-22:00, less usage on weekends
        occupancy_prob = np.where((hour_of_day >= 14) & (hour_of_day <= 22), 0.75, 0.15)
        occupancy_prob = np.where(day_of_week >= 5, occupancy_prob * 0.4, occupancy_prob) 
        
        is_occupied = (np.random.rand(n_samples) < occupancy_prob).astype(int)
        
        df = pd.DataFrame({
            'hour_of_day': hour_of_day,
            'day_of_week': day_of_week,
            'is_occupied': is_occupied
        })
        
    X = df[['hour_of_day', 'day_of_week']]
    y = df['is_occupied']
    
    # Split the dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train the Random Forest Classifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    print("--- Model Evaluation: Predict Occupied Status ---")
    print("Accuracy:", accuracy_score(y_test, predictions))
    print(classification_report(y_test, predictions))
    
    # Save the trained model
    joblib.dump(model, 'occupied_prediction_model.pkl')
    print("Model saved to 'occupied_prediction_model.pkl'\n")

def predict_occupancy(hour_of_day, day_of_week):
    """
    Predicts if the equipment is likely to be occupied at a given time.
    """
    try:
        model = joblib.load('occupied_prediction_model.pkl')
        features = [[hour_of_day, day_of_week]]
        prediction = model.predict(features)
        prob = model.predict_proba(features)
        return {
            "is_occupied_prediction": bool(prediction[0]),
            "occupancy_probability": round(prob[0][1], 4)
        }
    except FileNotFoundError:
        return {"error": "Model not found. Please train the model first by running the script."}

if __name__ == "__main__":
    # 1. Train the model
    train_occupied_status_model()
    
    # 2. Example predictions
    print("--- Example Predictions ---")
    # Peak hour on a weekday (e.g., Wednesday 6 PM / 18:00)
    peak_time = predict_occupancy(18, 2)
    print(f"Wednesday 18:00: {peak_time}")
    
    # Off-peak hour on a weekend (e.g., Sunday 8 AM / 08:00)
    off_peak_time = predict_occupancy(8, 6)
    print(f"Sunday 08:00: {off_peak_time}")
