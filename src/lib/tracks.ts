export const TRACK_IDS = ['da', 'ml', 'ai'] as const;
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
  {
    id: 'ai',
    title: 'AI Engineer',
    lead: 'เรียนงาน LLM แบบวิศวกร: token/ต้นทุน, prompt และ structured output, embeddings + RAG, agents และการประเมินผล — ฝึกด้วยชิ้นส่วนที่รันในเบราว์เซอร์ได้ แล้วต่อ API จริงใน notebook',
  },
];

export const trackInfo = (id: TrackId): TrackInfo => TRACKS.find((t) => t.id === id)!;
