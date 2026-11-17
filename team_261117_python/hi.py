# 1. 데이터 가져오기
import pandas as pd

data = './team_261117_python/Clean_Dataset.csv'
df = pd.read_csv(data)
#df.info()

# airline,flight,source_city,departure_time,stops,arrival_time,destination_city,class,duration,days_left,price
X = df[['airline','flight','source_city','departure_time','stops','arrival_time','destination_city','class','duration','days_left']].copy()
Y = df['price']

# 범주형 열 category 형으로 변경
cat_cols = [ 'airline', 'flight', 'source_city', 'departure_time',
    'stops', 'arrival_time', 'destination_city', 'class' ]
X[cat_cols] = X[cat_cols].astype('category')

from sklearn.model_selection import train_test_split
X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=42)

import optuna
import numpy as np
from lightgbm import LGBMRegressor, early_stopping
optuna.logging.set_verbosity(optuna.logging.WARNING) # 로그 숨기고 경고만 출력

# 2. 파라미터 탐색
from sklearn.model_selection import KFold
from sklearn.metrics import r2_score

def r2_eval(y_true, y_pred):
    return 'r2', r2_score(y_true, y_pred), True
# 목적함수 : 파라미터 넣어 호출하는 함수
# trial ? 파라미터 값 담긴 객체
def objective( trial ) :
    # 1) k-fold 설정
    # KFold( n_splits=분할개수, shuffle=True or False, random_state=42 )
    cv = KFold( n_splits=5 , shuffle=True, random_state=42 ) # shuffle? 데이터행 섞기
    r2_scores = [ ] 
    best_iterations = [ ]   # 각 폴드별 선택된 트리 번호 저장
    # 검증 세트 분할 
    for train_idx, val_idx in cv.split( X_train , Y_train ) :
        X_tr, X_val = X_train.iloc[ train_idx ] , X_train.iloc[val_idx]
        Y_tr, Y_val = Y_train.iloc[ train_idx ] , Y_train.iloc[val_idx]
        model = LGBMRegressor(
            n_estimators=2000, # 최대 트리개수
            # trial.suggest_XXX( '파라미터명' , 시작값, 끝값 )
            learning_rate=trial.suggest_float( 'learning_rate' , 0.01 , 0.1 ), # 학습률. 트리별 결과 반영비율
            num_leaves=trial.suggest_int( 'num_leaves' , 15, 60 ), # 리프노드 최대개수
            max_depth=trial.suggest_int( 'max_depth' , 5 , 10 ),
            min_child_samples=trial.suggest_int( 'min_child_samples', 30 , 100 ), # 리프노드 최소 데이터 개수
            subsample=trial.suggest_float( 'subsample' , 0.6 , 1.0 ), subsample_freq=1, # 트리마다 사용할 데이터 행개수 비율
            verbose=-1,random_state=42, n_jobs=-1 , 
            colsample_bytree=trial.suggest_float('colsample_bytree',0.6,1.0), # 트리마다 사용할 피처 개수 비율
            # class_weight = 회귀모델 이므로 생략 
        )
        # K폴드별 훈련용/검증용 으로 학습 
        model.fit( X_tr , Y_tr , eval_set=[ (X_val,Y_val)] , eval_metric=r2_eval,
                  callbacks=[ early_stopping( stopping_rounds=50, verbose=False ) ] ) 
        # K폴드별 검증 평가 r2
        r2 = model.score( X_val , Y_val )
        r2_scores.append( r2 )                          # k폴드별 평가 점수 저장 
        best_iteration = model.best_iteration_ if model.best_iteration_ > 0 else model.n_estimators
        best_iterations.append( best_iteration ) # k폴드별 최적 트리 번호 저장 
    # k폴드에서 산출된 최적 트리 개수의 평균값을 trial의 속성으로 저장 
    # k폴드만큼 구한 최적의 트리 리스트에서 평균값으로 trial 저장
    trial.set_user_attr( 'best_n_estimators' , int( np.mean( best_iterations ) ) )
    return np.mean( r2_scores ) # 검증 평가 평균 점수 반환 

# 3. 최종 모델 학습
sampler = optuna.samplers.TPESampler( seed=42 )
study = optuna.create_study( direction='maximize', sampler= sampler )
# study.optimize( 목적함수 , n_trials=반복수 )
study.optimize( objective , n_trials=20 ) # -> 반복 수 만큼 목적함수 실행 

######## 최종 모델 정보 확인 ########
print('######## 최종 모델 정보 확인 ########')
print( '최적 하이퍼파라미터:', study.best_params )
optimal_model = study.best_trial.user_attrs['best_n_estimators']
print( '최적 트리수: ', optimal_model )
 
final_model = LGBMRegressor(
    random_state=42, verbose=-1,n_jobs=-1,
    **study.best_params, # 최적 파라미터 포함 # **리스트 **딕셔너리 **전개연산자
    n_estimators=optimal_model
)

######## 최종 모델 점수 확인 ########
print('######## 최종 모델 점수 확인 ########')
final_model.fit( X_train , Y_train )
print( 'train r2: ', final_model.score( X_train , Y_train ) )
print( 'test r2: ', final_model.score( X_test , Y_test ) )
print( final_model.feature_name_ )
print( final_model.feature_importances_ )

import joblib
joblib.dump( final_model , './team_261117_python/gbm_model.pkl') 