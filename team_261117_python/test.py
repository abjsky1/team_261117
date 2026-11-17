from pathlib import Path

import joblib
import pandas as pd


model = joblib.load('./team_261117_python/gbm_model.pkl')

sample = pd.DataFrame([{
    'airline': 'SpiceJet',
    'flight': 'SG-8709',
    'source_city': 'Delhi',
    'departure_time': 'Evening',
    'stops': 'zero',
    'arrival_time': 'Night',
    'destination_city': 'Mumbai',
    'class': 'Economy',
    'duration': 2.17,
    'days_left': 1,
}])

categorical_cols = [
    'airline', 'flight', 'source_city', 'departure_time', 'stops',
    'arrival_time', 'destination_city', 'class',
]
sample[categorical_cols] = sample[categorical_cols].astype('category')

predicted_price = model.predict(sample)[0]
print('예상가격: ',predicted_price)


