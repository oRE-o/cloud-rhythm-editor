import { create } from 'zustand';
import WaveSurfer from 'wavesurfer.js';
import { nanoid } from 'nanoid';

export interface Note {
  id: string;        
  time: number;      
  lane: number;      
  type: string;      
  isLongNote: boolean; 
  extraInfo?: string;  // 끝 시간 저장용
  hitSoundEnabled: boolean; // 👈 V12: 히트음 사용 여부!
}
export interface NoteType {
  id: string;        
  name: string;      
  color: string;     
  canBeLong?: boolean; 
  defaultHitSoundEnabled?: boolean; // 👈 V12: 기본 히트음 설정!
}
export interface TimeSignature {
  beatsPerMeasure: number; 
  beatValue: number;       
}

export interface ChartState {
  isPlaying: boolean;
  currentTime: number;
  songDuration: number;
  isLoading: boolean;
  audioSrc: string | null;      
  peakDataArrays: [number[], number[]] | null; 
  pixelsPerSecond: number; 
  title: string;
  bpm: number;
  offset: number;
  laneCount: number;
  timeSignature: TimeSignature; 
  notes: Note[]; 
  editorMode: 'place' | 'delete';       
  pendingLongNoteId: string | null; // 끝점 대기 중인 노트 ID
  noteTypes: NoteType[];                
  currentNoteTypeId: string | null; 
  snapDivision: number;                 
}

export interface ChartActions {
  togglePlay: () => void;
  seekTime: (time: number) => void;
  _internalSetTime: (time: number) => void;
  setPixelsPerSecond: (pps: number) => void; 
  loadAudio: (url: string) => Promise<void>; 
  setBpm: (bpm: number) => void; 
  setOffset: (offset: number) => void;
  setLaneCount: (count: number) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  addNote: (note: Omit<Note, 'id'>) => Note | undefined; 
  deleteNote: (id: string) => void; 
  updateNoteLaneAndTime: (id: string, lane: number, time: number) => void; 
  setSnapDivision: (snap: number) => void; 
  setEditorMode: (mode: 'place' | 'delete') => void;
  addNoteType: (name: string, color: string) => void;
  setCurrentNoteTypeId: (id: string) => void;
  updateNoteType: (id: string, updatedProps: Partial<Omit<NoteType, 'id'>>) => void;
  setPendingLongNoteId: (id: string | null) => void; 
  updateNoteEndTime: (id: string, endTime: number) => void; 
  toggleNoteHitSound: (id: string) => void; // 👈 V12: 히트음 토글 함수!
}

const DEFAULT_NOTE_TYPES: NoteType[] = [
  { id: 'normal', name: '일반 노트', color: 'bg-primary',  canBeLong: false},
  { id: 'attack', name: '공격 노트', color: 'bg-accent', canBeLong: true },
  { id: 'trigger', name: '트리거 노트', color: 'bg-secondary', canBeLong: false},
];

export const useChartStore = create<ChartState & ChartActions>((set, get) => ({
  // --- 초기 상태 값 ---
  isPlaying: false, currentTime: 0, songDuration: 0, isLoading: true,
  audioSrc: null, peakDataArrays: null, pixelsPerSecond: 150, 
  pendingLongNoteId: null, 
  title: '새로운 곡', bpm: 120, offset: 0, laneCount: 5,
  timeSignature: { beatsPerMeasure: 4, beatValue: 4 }, 
  notes: [], noteTypes: DEFAULT_NOTE_TYPES, editorMode: 'place',
  currentNoteTypeId: DEFAULT_NOTE_TYPES[0].id, snapDivision: 16,

  // --- 액션(함수) 구현 ---
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  seekTime: (time) => { 
    const duration = get().songDuration;
    let newTime = Math.max(0, time);
    if (duration > 0) newTime = Math.min(newTime, duration);
    set({ currentTime: newTime });
  },
  _internalSetTime: (time) => set({ currentTime: time }),
  setPixelsPerSecond: (pps) => { 
    const newPps = Math.max(50, Math.min(pps, 5000)); 
    set({ pixelsPerSecond: newPps });
  },
  loadAudio: async (url: string) => {
    console.log("Loading audio:", url);
    set({ isLoading: true, peakDataArrays: null, audioSrc: null, songDuration: 0, notes: [] });
    let wavesurfer: WaveSurfer | null = null;

    try {
      wavesurfer = WaveSurfer.create({
        container: document.createElement("div"),
        url: url,
        media: document.createElement("audio"),
      });
      console.log("WaveSurfer instance created.");

      // 👇 Promise 내부에서 wavesurfer가 null일 가능성은 거의 없지만,
      //    안전을 위해 옵셔널 체이닝(?.un) 유지
      await new Promise<void>((resolve, reject) => {
        const readyHandler = () => {
          console.log("WaveSurfer ready!");
          wavesurfer?.un('ready', readyHandler); // Optional chaining
          wavesurfer?.un('error', errorHandler); // Optional chaining
          resolve();
        };
        const errorHandler = (err: Error) => {
          console.error("WaveSurfer error during load:", err);
          wavesurfer?.un('ready', readyHandler); // Optional chaining
          wavesurfer?.un('error', errorHandler); // Optional chaining
          reject(err);
        };

        // 👇 생성 직후 wavesurfer가 null일 수 있으므로 체크
        if (!wavesurfer) {
            reject(new Error("WaveSurfer instance creation failed silently."));
            return;
        }
        wavesurfer.on("ready", readyHandler);
        wavesurfer.on("error", errorHandler);
      });

      // --- Promise 성공 후 ---

      // 👇👇👇 (🔥 V10.4.1) Null Check 추가! 👇👇👇
      if (!wavesurfer) {
        // Promise가 성공했지만 혹시 모를 상황 대비
        throw new Error("WaveSurfer instance is unexpectedly null after ready event.");
      }
      // 👆👆👆 Null Check 완료! 👆👆👆

      const duration = wavesurfer.getDuration(); // 이제 wavesurfer는 null이 아님이 보장됨
      console.log("Audio duration:", duration);

      let desiredMaxLength = 0;
      if (duration > 0) {
        desiredMaxLength = Math.min(Math.floor(duration * 200), 50000);
      } else {
         console.warn("Audio duration is 0 or invalid.");
      }

      let peakDataArraysResult: [number[], number[]] | null = null;
      if (desiredMaxLength > 0) {
          // 👇 exportPeaks 전에도 wavesurfer null 체크 (이론상 불필요하나 안전을 위해)
          const exportedPeaks = wavesurfer.exportPeaks({
              channels: 2,
              maxLength: desiredMaxLength,
          });
          if (exportedPeaks?.[0]?.length > 0) {
              peakDataArraysResult = exportedPeaks as [number[], number[]];
              console.log("Peak data extracted:", peakDataArraysResult[0].length, "points");
          } else {
              console.warn("Exported peaks data is empty or invalid.");
          }
      }

      set({
        peakDataArrays: peakDataArraysResult,
        audioSrc: url,
        songDuration: duration,
        isLoading: false,
        currentTime: 0,
        pendingLongNoteId: null,
      });
      console.log("Audio loaded successfully, state updated.");

    } catch (error) {
      console.error("Wavesurfer audio loading/analysis failed:", error);
      set({ isLoading: false, songDuration: 0 });
    } finally {
      // 👇 여기 null check는 원래 있었고 잘 작동함
      if (wavesurfer) {
        console.log("Destroying WaveSurfer instance.");
        wavesurfer.destroy();
      }
    }
  },
  setBpm: (bpm) => { if (bpm > 0) set({ bpm }); },
  setOffset: (offset) => set({ offset }),
  setLaneCount: (count) => { if (count > 0) set({ laneCount: count }); },
  setTimeSignature: (ts) => { if (ts.beatsPerMeasure > 0 && ts.beatValue > 0) set({ timeSignature: ts }); },
  addNote: (noteWithoutId) => {
    const newNote: Note = { ...noteWithoutId, id: nanoid() , hitSoundEnabled: noteType?.defaultHitSoundEnabled ?? true,};
    let finalNotes: Note[] = [];
    set((state) => {
        finalNotes = [...state.notes, newNote].sort((a, b) => a.time - b.time);
        return { notes: finalNotes };
    });
    return finalNotes.find(n => n.id === newNote.id);
  },
  deleteNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),
  updateNoteLaneAndTime: (id, lane, time) => set((state) => ({ notes: state.notes.map((note) => note.id === id ? { ...note, lane, time } : note) })),
  setSnapDivision: (snap) => { if (snap > 0) set({ snapDivision: snap }); },
  setEditorMode: (mode) => set({ editorMode: mode }),
  setCurrentNoteTypeId: (id) => set({ currentNoteTypeId: id }),
  addNoteType: (name, color) => {
    const newType: NoteType = { id: nanoid(), name, color, canBeLong: false };
    set((state) => ({ noteTypes: [...state.noteTypes, newType] }));
  },
  updateNoteType: (id, updatedProps) => set((state) => ({ noteTypes: state.noteTypes.map((nt) => nt.id === id ? { ...nt, ...updatedProps } : nt ) })),
  setPendingLongNoteId: (id) => set({ pendingLongNoteId: id }), 
  updateNoteEndTime: (id, endTime) => { 
    set((state) => ({
      notes: state.notes.map((note) => {
        if (note.id === id) {
          const startTime = note.time;
          const isNowLong = endTime > startTime + 0.01; // 정방향!
          return { ...note, extraInfo: isNowLong ? `${endTime}` : undefined, isLongNote: isNowLong };
        }
        return note;
      }),
    }));
    if (get().pendingLongNoteId === id) set({ pendingLongNoteId: null });
  },
  toggleNoteHitSound: (id) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, hitSoundEnabled: !note.hitSoundEnabled } : note
      ),
    }));
  },
}));