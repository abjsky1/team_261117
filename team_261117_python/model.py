from pathlib import Path

import joblib
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split


# Load the dataset relative to this script, regardless of the working directory.
BASE_DIR = Path(__file__).resolve().parent
df = pd.read_csv(BASE_DIR / 'Clean_Dataset.csv')

feature_cols = [
    'airline', 'flight', 'source_city', 'departure_time', 'stops',
    'arrival_time', 'destination_city', 'class', 'duration', 'days_left',
]
categorical_cols = [
    'airline', 'flight', 'source_city', 'departure_time', 'stops',
    'arrival_time', 'destination_city', 'class',
]

X = df[feature_cols].copy()
y = df['price']
X[categorical_cols] = X[categorical_cols].astype('category')

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Best parameters from the completed Optuna search.
final_model = LGBMRegressor(
    learning_rate=0.08661245028149314,
    num_leaves=60,
    max_depth=9,
    min_child_samples=65,
    subsample=0.9767501076607403,
    subsample_freq=1,
    colsample_bytree=0.8648548559170002,
    n_estimators=2000,
    random_state=42,
    n_jobs=-1,
    verbosity=-1,
)

final_model.fit(X_train, y_train)

print('########모델평가########')
print('train r2:', final_model.score(X_train, y_train))
print('test r2:', final_model.score(X_test, y_test))
test_predictions = final_model.predict(X_test)
print('test mae:', mean_absolute_error(y_test, test_predictions))
print('features:', final_model.feature_name_)
print('feature importances:', final_model.feature_importances_)

model_path = './team_261117_python/gbm_model.pkl'
joblib.dump(final_model, model_path)
