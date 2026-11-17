import React, { useState } from 'react';
import axios from 'axios';
// 아래 줄에서 import 뒤에 type 을 꼭 붙여주세요!
import type { FpDto, PriceDto } from '../types/flight';
import './FlightPredictor.css';

// 학습 데이터에 사용된 실제 범주(Category) 목록 고정
const AIRLINES = [
  { value: 'SpiceJet', label: 'SpiceJet (스파이스젯)' },
  { value: 'AirAsia', label: 'AirAsia (에어아시아)' },
  { value: 'Vistara', label: 'Vistara (비스타라 항공)' },
  { value: 'GO_FIRST', label: 'GO_FIRST (고 퍼스트)' },
  { value: 'Indigo', label: 'Indigo (인디고 항공)' },
  { value: 'Air_India', label: 'Air_India (에어 인디아)' },
];

const CITIES = [
  { value: 'Delhi', code: 'DEL', name: '델리 (Delhi)' },
  { value: 'Mumbai', code: 'BOM', name: '뭄바이 (Mumbai)' },
  { value: 'Bangalore', code: 'BLR', name: '방갈로르 (Bangalore)' },
  { value: 'Kolkata', code: 'CCU', name: '콜카타 (Kolkata)' },
  { value: 'Hyderabad', code: 'HYD', name: '하이데라바드 (Hyderabad)' },
  { value: 'Chennai', code: 'MAA', name: '첸나이 (Chennai)' },
];

const TIME_SLOTS = [
  { value: 'Early_Morning', label: 'Early_Morning (이른 아침 04~08시)' },
  { value: 'Morning', label: 'Morning (오전 08~12시)' },
  { value: 'Afternoon', label: 'Afternoon (오후 12~16시)' },
  { value: 'Evening', label: 'Evening (저녁 16~20시)' },
  { value: 'Night', label: 'Night (야간 20~24시)' },
  { value: 'Late_Night', label: 'Late_Night (심야 00~04시)' },
];

const STOPS = [
  { value: 'zero', label: 'zero (직항 / Non-stop)' },
  { value: 'one', label: 'one (1회 경유 / 1 Stop)' },
  { value: 'two_or_more', label: 'two_or_more (2회 이상 경유)' },
];

const CLASSES = [
  { value: 'Economy', label: 'Economy (일반석)' },
  { value: 'Business', label: 'Business (비즈니스석)' },
];

// 시간(0~23), 분(0~59), 남은 일수(1~49) 선택용 배열 생성
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => i);
const DAYS_LEFT_LIST = Array.from({ length: 49 }, (_, i) => i + 1);

const FlightPredictor: React.FC = () => {
  const [formData, setFormData] = useState<FpDto>({
    airline: 'Vistara',
    flight: 'UK-995',
    source_city: 'Delhi',
    departure_time: 'Morning',
    stops: 'zero',
    arrival_time: 'Afternoon',
    destination_city: 'Mumbai',
    classbe: 'Economy',
    duration_hours: 2,
    duration_minutes: 10, // 2시간 10분 -> 자바에서 2 + (10/60) = 2.17 로 변환됨
    days_left: 15,
  });

  const [activeCase, setActiveCase] = useState<'A' | 'B' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [result, setResult] = useState<PriceDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['duration_hours', 'duration_minutes', 'days_left'];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handleSwapCities = () => {
    setFormData((prev) => ({
      ...prev,
      source_city: prev.destination_city,
      destination_city: prev.source_city,
    }));
  };

  // 프론트엔드 1차 유효성 검사
  const validateForm = (): string | null => {
    if (formData.source_city === formData.destination_city) {
      return '출발 도시와 도착 도시는 서로 달라야 합니다.';
    }
    if (!formData.flight.trim()) {
      return '항공편명(flight, 예: UK-995, SG-8709)을 직접 입력해 주세요.';
    }
    if (formData.duration_hours === 0 && formData.duration_minutes === 0) {
      return '총 비행 시간은 최소 1분 이상이어야 합니다. (0시간 0분 불가)';
    }
    return null;
  };

  // [케이스 A 버튼 동작] 일반 Axios 단건 JSON 요청 (/api/pp)
  const handleCaseA = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setActiveCase('A');
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post<PriceDto>('http://localhost:8080/api/pp', formData);
      setResult(response.data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        '케이스 A 서버 통신 중 오류가 발생했습니다. 자바(8080) 및 파이썬(8000) 서버를 확인해주세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // [케이스 B 버튼 동작] Axios + SSE 실시간 스트리밍 요청 (/api/pp/stream)
  const handleCaseB = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setActiveCase('B');
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressPercent(15);
    setProgressMsg('자바 서버에서 시간/분 변환 및 FastAPI SSE 스트림 연결 중...');

    try {
      await axios.post('http://localhost:8080/api/pp/stream', formData, {
        headers: { Accept: 'text/event-stream' },
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          const rawText = progressEvent.event?.target?.responseText || '';
          const lines = rawText.split('\n').filter((line: string) => line.startsWith('data:'));
          if (lines.length > 0) {
            const lastLine = lines[lines.length - 1].replace('data:', '').trim();
            try {
              const parsed: PriceDto = JSON.parse(lastLine);
              if (parsed.progress !== undefined) setProgressPercent(parsed.progress);
              if (parsed.message) setProgressMsg(parsed.message);
              if (parsed.price !== undefined && parsed.price !== null) {
                setResult(parsed);
              }
            } catch {
              // 스트리밍 청크 수신 대기
            }
          }
        },
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        '케이스 B (SSE 스트리밍) 연결 중 오류가 발생했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const getCityCode = (city: string) => CITIES.find((c) => c.value === city)?.code || 'AIR';

  // 화면 미리보기용 변환 값 계산 (자바 서버와 동일한 공식: 시간 + 분/60 소수점 둘째자리 반올림)
  const previewConvertedDuration = (
    formData.duration_hours +
    Math.round((formData.duration_minutes / 60) * 100) / 100
  ).toFixed(2);

  return (
    <div className="flight-page">
      <header className="flight-hero">
        <div className="hero-badge">AI FLIGHT FARE PREDICTION</div>
        <h1>스마트 항공권 가격 예측 시스템</h1>
        <p>학습된 데이터 범주 내에서 조건을 선택하고 케이스 A(단건)와 케이스 B(SSE)를 모두 테스트해보세요.</p>
      </header>

      <main className="flight-container">
        <section className="booking-card">
          {/* 상단 좌석 등급 선택 */}
          <div className="card-top-bar">
            <div className="class-tabs">
              {CLASSES.map((cls) => (
                <button
                  key={cls.value}
                  type="button"
                  className={formData.classbe === cls.value ? 'tab active' : 'tab'}
                  onClick={() => setFormData({ ...formData, classbe: cls.value })}
                >
                  {cls.label}
                </button>
              ))}
            </div>
            <div className="category-notice">
              <span>✔ 모든 선택 항목은 학습 데이터 범주(Category)에 고정되어 있습니다</span>
            </div>
          </div>

          <div className="booking-form">
            {/* 출발 도시 & 도착 도시 선택 */}
            <div className="route-selector">
              <div className="route-box">
                <label>출발 도시 (source_city)</label>
                <div className="airport-code">{getCityCode(formData.source_city)}</div>
                <select name="source_city" value={formData.source_city} onChange={handleChange}>
                  {CITIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="swap-btn"
                onClick={handleSwapCities}
                title="출발/도착 도시 바꾸기"
              >
                ⇄
              </button>

              <div className="route-box">
                <label>도착 도시 (destination_city)</label>
                <div className="airport-code">{getCityCode(formData.destination_city)}</div>
                <select name="destination_city" value={formData.destination_city} onChange={handleChange}>
                  {CITIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 항공편 세부 조건 선택 그리드 */}
            <div className="form-grid">
              {/* 1. 항공사 선택 */}
              <div className="input-group">
                <label>항공사 선택 (airline)</label>
                <select name="airline" value={formData.airline} onChange={handleChange}>
                  {AIRLINES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. 항공편명 직접 입력 (유일한 텍스트 입력칸) */}
              <div className="input-group">
                <label>항공편명 직접 입력 (flight)</label>
                <input
                  type="text"
                  name="flight"
                  value={formData.flight}
                  onChange={handleChange}
                  placeholder="예: UK-995, SG-8709"
                />
              </div>

              {/* 3. 경유 횟수 선택 */}
              <div className="input-group">
                <label>경유 횟수 선택 (stops)</label>
                <select name="stops" value={formData.stops} onChange={handleChange}>
                  {STOPS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. 출발 시간대 선택 */}
              <div className="input-group">
                <label>출발 시간대 선택 (departure_time)</label>
                <select name="departure_time" value={formData.departure_time} onChange={handleChange}>
                  {TIME_SLOTS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. 도착 시간대 선택 */}
              <div className="input-group">
                <label>도착 시간대 선택 (arrival_time)</label>
                <select name="arrival_time" value={formData.arrival_time} onChange={handleChange}>
                  {TIME_SLOTS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. 출발까지 남은 일수 선택 (1~49일 드롭다운) */}
              <div className="input-group">
                <label>출발까지 남은 일수 선택 (days_left: 1~49)</label>
                <select name="days_left" value={formData.days_left} onChange={handleChange}>
                  {DAYS_LEFT_LIST.map((day) => (
                    <option key={day} value={day}>
                      D-{day}일 전 ({day}일 남음)
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. 비행 소요 시간 선택 (시간 0~23 / 분 0~59 분리 선택) */}
              <div className="input-group full-width duration-selector-box">
                <div className="duration-header">
                  <label>총 비행 소요 시간 선택 (duration: 시간 0~23 / 분 0~59)</label>
                  <span className="conversion-preview">
                    자바 변환 예정 값: <strong>{previewConvertedDuration}</strong> 시간
                  </span>
                </div>
                <div className="duration-selects">
                  <div className="duration-unit">
                    <select
                      name="duration_hours"
                      value={formData.duration_hours}
                      onChange={handleChange}
                    >
                      {HOURS_LIST.map((h) => (
                        <option key={h} value={h}>
                          {h}시간
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="duration-unit">
                    <select
                      name="duration_minutes"
                      value={formData.duration_minutes}
                      onChange={handleChange}
                    >
                      {MINUTES_LIST.map((m) => (
                        <option key={m} value={m}>
                          {m}분 (≈ {(Math.round((m / 60) * 100) / 100).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="error-alert">⚠️ {error}</div>}

            {/* 케이스 A 버튼 & 케이스 B 버튼 나란히 배치 */}
            <div className="action-buttons-grid">
              <button
                type="button"
                className="predict-btn case-a-btn"
                onClick={handleCaseA}
                disabled={loading}
              >
                <span className="btn-badge">CASE A</span>
                <span className="btn-title">✈️ 케이스 A로 가격 예측 확인 (단건 JSON)</span>
                <span className="btn-desc">Axios POST → Spring WebClient → FastAPI 단건 응답</span>
              </button>

              <button
                type="button"
                className="predict-btn case-b-btn"
                onClick={handleCaseB}
                disabled={loading}
              >
                <span className="btn-badge">CASE B</span>
                <span className="btn-title">📡 케이스 B로 가격 예측 확인 (SSE 스트리밍)</span>
                <span className="btn-desc">Axios POST → Spring Flux → FastAPI SSE 실시간 수신</span>
              </button>
            </div>
          </div>

          {/* 케이스 B 실행 시 실시간 SSE 진행률 바 */}
          {loading && activeCase === 'B' && (
            <div className="sse-progress-box">
              <div className="progress-header">
                <span>{progressMsg || '실시간 SSE 분석 스트림 수신 중...'}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* 결과 보딩패스 티켓 */}
        {result && (
          <section className="boarding-pass">
            <div className="ticket-left">
              <div className="ticket-header">
                <span className="case-result-tag">
                  {activeCase === 'A' ? 'CASE A (단건 응답 결과)' : 'CASE B (SSE 스트리밍 결과)'}
                </span>
                <span className="airline-tag">{formData.airline}</span>
                <span className="flight-no">{formData.flight}</span>
                <span className="cabin-badge">{formData.classbe.toUpperCase()} CLASS</span>
              </div>

              <div className="ticket-route">
                <div className="ticket-city">
                  <h2>{getCityCode(formData.source_city)}</h2>
                  <p>{formData.source_city}</p>
                  <span className="time-tag">{formData.departure_time}</span>
                </div>

                <div className="ticket-flight-visual">
                  <span className="duration-text">
                    {formData.duration_hours}시간 {formData.duration_minutes}분 (변환값:{' '}
                    {result.duration ?? previewConvertedDuration})
                  </span>
                  <div className="plane-line">
                    <span className="dot" />
                    <span className="line" />
                    <span className="plane-icon">✈️</span>
                    <span className="line" />
                    <span className="dot" />
                  </div>
                  <span className="stops-text">
                    {STOPS.find((s) => s.value === formData.stops)?.label}
                  </span>
                </div>

                <div className="ticket-city">
                  <h2>{getCityCode(formData.destination_city)}</h2>
                  <p>{formData.destination_city}</p>
                  <span className="time-tag">{formData.arrival_time}</span>
                </div>
              </div>
            </div>

            <div className="ticket-divider" />

            <div className="ticket-right">
              <span className="price-label">AI 예측 항공 운임 (Predicted Fare)</span>
              <div className="predicted-price">₹ {result.price?.toLocaleString() ?? '0'}</div>
              <p className="krw-estimate">
                한화 약 {Math.round((result.price || 0) * 16.5).toLocaleString()} 원
              </p>
              <div className="d-day-chip">출발 D-{formData.days_left}일 기준</div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default FlightPredictor;
