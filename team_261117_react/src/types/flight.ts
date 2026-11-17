export interface FpDto {
  fno?: number;
  airline: string;
  flight: string;
  source_city: string;
  departure_time: string;
  stops: string;
  arrival_time: string;
  destination_city: string;
  classbe: string;
  // 프론트엔드에서 0~23시간, 0~59분 선택하여 자바로 전송할 필드
  duration_hours: number;
  duration_minutes: number;
  // 자바에서 변환되어 채워질 필드 (선택적)
  duration?: number;
  days_left: number;
}

export interface PriceDto {
  price: number;
  duration?: number;
  status?: string;
  progress?: number;
  message?: string;
}
