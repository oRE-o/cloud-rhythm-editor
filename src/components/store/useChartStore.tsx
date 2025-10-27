import { create } from "zustand";
import WaveSurfer from "wavesurfer.js"; // 👈 1. Import!
import { nanoid } from "nanoid"; // 👈 1. "고유 ID" 생성기 import! (먼저 pnpm add nanoid 설치!)

export interface Note {
  id: string; // 고유 ID (e.g., 'a8s7f9')
  time: number; // 등장 시간 (초)
  lane: number; // 레인 (0, 1, 2, 3...)
  type: string; // 노트 타입 (e.g., 'tap', 'hold')
  isLongNote: boolean;
  extraInfo?: string; // (롱노트 종료 시각 등)
}

export interface ChartState {
  // --- 음악 상태 ---
  isPlaying: boolean; // 지금 재생 중인가?
  currentTime: number; // 지금 몇 초인가? (e.g., 3.145)
  songDuration: number; // 노래 총 길이 (e.g., 180.0)
  isLoading: boolean; //
  // --- 음악 정보 ---
  title: string;
  bpm: number;
  offset: number;
  laneCount: number;

  // --- 에디터 설정 ---
  snapDivision: number; // 스냅 (8, 16, 24...)
  pixelsPerSecond: number; // <- 👈 1. 여기에 "줌 레벨" 변수 추가!
  maxPixelsPerSecond: number; // <- 👈 2. "최대 줌 한계선" 추가!
  audioSrc: string | null; // <- 👈 1. <audio> 태그가 쓸 파일 경로
  peakDataArrays: [number[], number[]] | null; // 👈 2. "채널 분리" 데이터로 변경!

  notes: Note[]; // 👈 3. "노트 배열" 추가!
}

// 2. 스토어의 "액션(행동)" 타입 정의 (상태를 바꾸는 함수들)
export interface ChartActions {
  // 재생/정지 토글
  togglePlay: () => void;
  // 특정 시간으로 점프
  seekTime: (time: number) => void;
  // (내부용) 오디오 플레이어가 호출할 시간 업데이트 함수
  _internalSetTime: (time: number) => void;
  loadAudio: (url: string) => Promise<void>; // (나중에 추가될 함수들...)
  // setBpm: (bpm: number) => void;
  // setSnap: (snap: number) => void;
  setPixelsPerSecond: (pps: number) => void; // <- 👈 2. 줌 레벨 변경 함수 추가!
  addNote: (note: Omit<Note, "id">) => void; // 👈 4. "노트 추가" 함수!
  setOffset: (offset: number) => void; // 👈 1. "오프셋 변경" 함수 추가!
}

// 3. Zustand 스토어 생성!
// create<>() 안에 state와 action 타입을 합쳐서 넣어줌
export const useChartStore = create<ChartState & ChartActions>((set, get) => ({
  // --- 초기 상태 값 ---
  isPlaying: false,
  currentTime: 0,
  songDuration: 0,
  isLoading: true, // <- 👈 요기! 이 줄을 추가해줘!
  pixelsPerSecond: 150, // <- 👈 3. 초기값 150px (config.ts 대신!)
  maxPixelsPerSecond: 1000, // <- 👈 4. 최대 줌 한계선 추가!
  title: "새로운 곡",
  offset: 0,
  bpm: 163,
  laneCount: 5,
  snapDivision: 16,
  audioSrc: null, // <- 👈 4. 초기값 null
  peakDataArrays: null, // 👈 3. 초기값 변경!  // --- 액션(함수) 구현 ---
  notes: [], // 👈 5. 초기값 (빈 배열!)

  togglePlay: () => {
    // isPlaying 값을 반대로 뒤집음
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  seekTime: (time) => {
    // 시간이 0보다 작거나 총 길이보다 길어지는 것 방지
    const duration = get().songDuration;
    let newTime = Math.max(0, time);
    if (duration > 0) {
      newTime = Math.min(newTime, duration);
    }
    set({ currentTime: newTime });
  },

  _internalSetTime: (time) => {
    // 이건 오디오 플레이어만 호출할 거라, seekTime과 달리
    // isPlaying 상태나 다른 로직을 건드리지 않고 시간만 업데이트!
    set({ currentTime: time });
  },
  setOffset: (offset) => {
    // (오프셋은 마이너스 값도 허용!)
    set({ offset: offset });
  },
  setPixelsPerSecond: (pps) => {
    // <- 👈 4. 함수 구현!
    // 줌 레벨은 최소 50, 최대 1000px로 제한 (너무 빨라지면 곤란!)
    const newPps = Math.max(50, Math.min(pps, 1000));
    set({ pixelsPerSecond: newPps });
  },
  loadAudio: async (url: string) => {
    set({ isLoading: true, peakDataArrays: null, audioSrc: null }); // 👈 4. peakData -> peakDataArrays
    try {
      const wavesurfer = WaveSurfer.create({
        container: document.createElement("div"),
        url: url,
        media: document.createElement("audio"),
      });

      await new Promise<void>((resolve, reject) => {
        wavesurfer.on("ready", () => resolve());
        wavesurfer.on("error", (err) => reject(err));
      });

      // 👇👇👇 "잘게 쪼개기" 핵심! 👇👇👇

      // 5. 노래 총 시간을 먼저 가져오기!
      const duration = wavesurfer.getDuration();

      // 6. 1초당 200개의 "촘촘한" 데이터 요청! (e.g., 180초 * 200 = 36,000개!)
      const desiredMaxLength = Math.floor(duration * 200);

      // 7. "요약 데이터" 추출! (maxLength: 10000 -> desiredMaxLength)
      const peakDataArrays = wavesurfer.exportPeaks({
        channels: 2,
        maxLength: desiredMaxLength,
      });

      // 8. (🔥 중요!) 데이터를 합치지 않고 "채널 2개" 그대로 저장!
      // (combinedPeakData 루프 싹~ 삭제!)

      // 9. "대뇌"에 모든 정보 저장!
      set({
        // peakData: combinedPeakData, // 👈 10. 삭제!
        peakDataArrays: peakDataArrays as [number[], number[]], // 👈 11. "채널 2개" 원본 저장!
        audioSrc: url,
        songDuration: duration,
        isLoading: false,
        currentTime: 0,
      });

      wavesurfer.destroy();
    } catch (error) {
      console.error("Wavesurfer 오디오 로딩/분석 실패:", error);
      set({ isLoading: false });
    }
  },
  addNote: (noteWithoutId) => {
    const newNote: Note = {
      ...noteWithoutId,
      id: nanoid(), // (nanoid로 고유 ID 생성!)
    };

    // (시간 순서대로 정렬해서 저장하면 나중에 편해!)
    set((state) => ({
      notes: [...state.notes, newNote].sort((a, b) => a.time - b.time),
    }));
  },
}));
