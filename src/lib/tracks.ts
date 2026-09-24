export const TRACK_IDS = ['da', 'ml'] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export interface TrackInfo {
  id: TrackId;
  title: string;
  lead: string;
}

export const TRACKS: TrackInfo[] = [
  {
    id: 'da',
    title: 'Data Analyst',
    lead: 'เริ่มจาก SQL และ pandas ต่อด้วยสถิติ visualization และ business metrics แล้วจบด้วยโปรเจกต์ portfolio',
  },
  {
    id: 'ml',
    title: 'Machine Learning',
    lead: 'เรียน scikit-learn ตั้งแต่ workflow, การวัดผลโมเดล และ feature engineering ไปจนถึง tree/boosting และ deep learning เบื้องต้น',
  },
];

export const trackInfo = (id: TrackId): TrackInfo => TRACKS.find((t) => t.id === id)!;
