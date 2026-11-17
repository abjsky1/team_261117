from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

FEATURE_COLUMNS = [
    'airline', 'flight', 'source_city', 'departure_time', 'stops',
    'arrival_time', 'destination_city', 'class', 'duration', 'days_left',
]
CATEGORICAL_COLUMNS = [
    'airline', 'flight', 'source_city', 'departure_time', 'stops',
    'arrival_time', 'destination_city', 'class',
]

model = joblib.load('./team_261117_python/gbm_model.pkl')
app = FastAPI(title='Flight Price Prediction API', version='1.0.0')


class FlightInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    airline: str = Field(min_length=1)
    flight: str = Field(min_length=1)
    source_city: str = Field(min_length=1)
    departure_time: str = Field(min_length=1)
    stops: str = Field(min_length=1)
    arrival_time: str = Field(min_length=1)
    destination_city: str = Field(min_length=1)
    seat_class: str = Field(alias='class', min_length=1)
    duration: float = Field(gt=0)
    days_left: int = Field(ge=0)

# 응답규격
class PredictionOutput(BaseModel):
    predicted_price: float

# 서버상태 확인
@app.get('/health')
def health_check():
    return {'status': 'ok', 'model_loaded': True}


@app.post('/predict', response_model=PredictionOutput)
def predict_price(request: FlightInput):
    values = request.model_dump(by_alias=True)
    input_df = pd.DataFrame([{column: values[column] for column in FEATURE_COLUMNS}])
    input_df[CATEGORICAL_COLUMNS] = input_df[CATEGORICAL_COLUMNS].astype('category')
    # 1) 정답예측
    predicted_price = float(model.predict(input_df)[0])
    # 2) 응답반환
    return PredictionOutput(predicted_price=predicted_price)

import asyncio
import json
from fastapi.responses import StreamingResponse

@app.post('/predict/stream')
async def predict_price_stream(request: FlightInput):
    async def event_generator():
        # 1단계: 전처리 알림
        yield f"data: {json.dumps({'progress': 40, 'message': '데이터 범주형 변환 및 전처리 중...'})}\n\n"
        await asyncio.sleep(0.4)

        values = request.model_dump(by_alias=True)
        input_df = pd.DataFrame([{column: values[column] for column in FEATURE_COLUMNS}])
        input_df[CATEGORICAL_COLUMNS] = input_df[CATEGORICAL_COLUMNS].astype('category')

        # 2단계: LightGBM 추론 알림
        yield f"data: {json.dumps({'progress': 80, 'message': 'LightGBM 모델 가격 추론 중...'})}\n\n"
        await asyncio.sleep(0.4)

        predicted_price = float(model.predict(input_df)[0])

        # 3단계: 최종 예측 가격 전송
        result_data = {
            'progress': 100,
            'message': '예측 완료!',
            'predicted_price': predicted_price
        }
        yield f"data: {json.dumps(result_data)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")