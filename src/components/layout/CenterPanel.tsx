// src/components/layout/CenterPanel.tsx

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { UIEvent } from 'react';
import {
  useChartStore, type ChartState, type ChartActions, type Note, type NoteType,
} from '../store/useChartStore';
// nanoid는 store에서 사용

type StoreState = ChartState & ChartActions;

const JUDGE_LINE_OFFSET_PX = 40;
const SHORT_NOTE_HEIGHT_PX = 20; // 짧은 노트 높이

const CenterPanel = () => {
  // --- Refs ---
  const scrollRef = useRef<HTMLElement | null>(null); // 스크롤 컨테이너
  const isScrollingProgrammatically = useRef(false); // 코드 스크롤 플래그
  const scrollElementRef = useRef<HTMLDivElement | null>(null); // 노트/라인 영역
  // (드래그 관련 Refs 삭제!)

  // --- State ---
  const [clientHeight, setClientHeight] = useState(0); // 컨테이너 높이
  const currentTime = useChartStore((state: StoreState) => state.currentTime);
  const isPlaying = useChartStore((state: StoreState) => state.isPlaying);
  const songDuration = useChartStore((state: StoreState) => state.songDuration);
  const seekTime = useChartStore((state: StoreState) => state.seekTime);
  const pixelsPerSecond = useChartStore((state: StoreState) => state.pixelsPerSecond);
  const laneCount = useChartStore((state: StoreState) => state.laneCount);
  const notes = useChartStore((state: StoreState) => state.notes);
  const addNote = useChartStore((state: StoreState) => state.addNote);
  const deleteNote = useChartStore((state: StoreState) => state.deleteNote);
  const bpm = useChartStore((state: StoreState) => state.bpm);
  const offset = useChartStore((state: StoreState) => state.offset);
  const snapDivision = useChartStore((state: StoreState) => state.snapDivision);
  const beatsPerMeasure = useChartStore((state: StoreState) => state.timeSignature.beatsPerMeasure);
  const beatValue = useChartStore((state: StoreState) => state.timeSignature.beatValue);
  const editorMode = useChartStore((state: StoreState) => state.editorMode);
  const noteTypes = useChartStore((state: StoreState) => state.noteTypes);
  const currentNoteTypeId = useChartStore((state: StoreState) => state.currentNoteTypeId);
  const pendingLongNoteId = useChartStore((state: StoreState) => state.pendingLongNoteId);
  const setPendingLongNoteId = useChartStore((state: StoreState) => state.setPendingLongNoteId);
  const updateNoteEndTime = useChartStore((state: StoreState) => state.updateNoteEndTime);

  // --- 계산된 값 ---
  const totalHeight = songDuration * pixelsPerSecond;
  const paddingTop = clientHeight - JUDGE_LINE_OFFSET_PX; // V3 역방향 여백
  const paddingBottom = JUDGE_LINE_OFFSET_PX;         // V3 역방향 여백
  
  // --- 스냅 라인 계산 ---
  const snapLines = useMemo(() => {
    // ... (V10 박자 계산 로직 - 정확!) ...
    const lines: { time: number; isMeasure: boolean; isBeat: boolean }[] = [];
    if (bpm <= 0 || snapDivision <= 0 || songDuration === 0 || beatsPerMeasure <= 0 || beatValue <= 0) return lines;
    const beatDuration = 60 / bpm;
    const snapDuration = beatDuration / (snapDivision / 4);
    const snapsPerBeat = snapDivision / (beatValue / 4);
    const snapsPerMeasure = snapsPerBeat * beatsPerMeasure;
    let currentSnapIndex = 0;
    for (let i = 0; ; i++) {
        const calculatedTime = offset + i * snapDuration;
        if (calculatedTime > songDuration + snapDuration) break;
        if (calculatedTime < 0) continue;
        const roundedTime = Math.round(calculatedTime * 1000) / 1000;
        const indexTime = i;
        const isMeasureLine = Math.abs(indexTime % snapsPerMeasure) < 1e-6;
        const isBeatLine = Math.abs(indexTime % snapsPerBeat) < 1e-6;
        lines.push({ time: roundedTime, isMeasure: isMeasureLine, isBeat: isBeatLine });
        currentSnapIndex++;
    }
    return lines;
  }, [bpm, offset, snapDivision, songDuration, beatsPerMeasure, beatValue]);


  // --- Helper: 마우스 위치 -> 시간/레인 변환 ---
  const getNoteInfoFromEvent = useCallback((e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
       const targetElement = scrollElementRef.current ?? (e.currentTarget as HTMLDivElement);
       if (!targetElement || bpm <= 0) return { snappedTime: 0, clickedLane: 0 };
       const rect = targetElement.getBoundingClientRect();
       const clickYInDiv = e.clientY - rect.top;
       const clickXInDiv = e.clientX - rect.left;
       const clickYInContent = clickYInDiv - paddingTop; // paddingTop 사용!
       const clickedTimeRough = (totalHeight - clickYInContent) / pixelsPerSecond;
       let closestSnapTime = clickedTimeRough;
       let minDiff = Infinity;
       if (snapLines && snapLines.length > 0) {
         for (const line of snapLines) {
             const diff = Math.abs(clickedTimeRough - line.time);
             if (diff < minDiff) { minDiff = diff; closestSnapTime = line.time; }
             if (line.time < clickedTimeRough - (60 / bpm / 2)) break;
         }
       } else { closestSnapTime = Math.max(0, Math.min(songDuration, clickedTimeRough)); }
       const percentX = clickXInDiv / rect.width;
       const clickedLane = Math.floor(percentX * laneCount);
       const clampedLane = Math.max(0, Math.min(laneCount - 1, clickedLane));
       const snappedTime = Math.max(0, Math.min(songDuration, closestSnapTime));
       return { snappedTime: snappedTime, clickedLane: clampedLane };
  }, [totalHeight, pixelsPerSecond, paddingTop, snapLines, bpm, songDuration, laneCount, offset]);


  // --- useEffects ---
  // 1. 화면 높이 측정
  useEffect(() => {
     const observer = new ResizeObserver(entries => {
      for (let entry of entries) setClientHeight(entry.contentRect.height);
    });
    const currentScrollEl = scrollRef.current;
    if (currentScrollEl) {
      setClientHeight(currentScrollEl.clientHeight);
      observer.observe(currentScrollEl);
    }
    return () => { if (currentScrollEl) observer.unobserve(currentScrollEl); };
  }, []);

  // 2. 시간 -> 스크롤 동기화
  useEffect(() => {
     if (!scrollRef.current || clientHeight === 0) return;
     const newScrollTop = totalHeight - (currentTime * pixelsPerSecond);
     if (Math.abs(scrollRef.current.scrollTop - newScrollTop) < 1) return;
     isScrollingProgrammatically.current = true;
     scrollRef.current.scrollTo({ top: newScrollTop, behavior: "auto" });
     setTimeout(() => { isScrollingProgrammatically.current = false; }, 50);
  }, [currentTime, pixelsPerSecond, totalHeight, clientHeight]);

  // 3. 수동 스크롤 -> 시간 동기화
  const handleScroll = (e: UIEvent<HTMLElement>) => {
     if (isScrollingProgrammatically.current || isPlaying || totalHeight === 0) return;
     const currentScrollTop = e.currentTarget.scrollTop;
     const newTime = (totalHeight - currentScrollTop) / pixelsPerSecond;
     if (newTime < -1 || newTime > songDuration + 1) return;
     const clampedTime = Math.max(0, Math.min(newTime, songDuration));
     seekTime(clampedTime);
  };

  // --- 노트 인터랙션 핸들러 ---

  // 스냅 라인 클릭: 짧은 노트 생성 / 롱노트 끝점 설정
  const handleSnapLineMouseDown = (e: React.MouseEvent<HTMLDivElement>, lineTime: number) => {
    if (e.button !== 0 || isPlaying || editorMode === 'delete') return;

    // 1. 끝점 대기 중인가?
    if (pendingLongNoteId) {
      // --- 롱노트 끝점 설정 ---
      const pendingNote = notes.find(n => n.id === pendingLongNoteId);
      if (pendingNote) {
        const startTime = pendingNote.time;
        const endTime = lineTime; // 클릭된 라인 시간

        // 끝 시간이 시작 시간보다 충분히 커야 함 (정방향!)
        if (endTime > startTime + 0.01) {
           updateNoteEndTime(pendingLongNoteId, endTime);
           // (updateNoteEndTime이 pending 상태 해제)
        } else {
           // 너무 짧거나 시작점보다 앞이면 -> 대기 취소 (짧은 노트로 남음)
           setPendingLongNoteId(null);
           console.log("롱노트 끝점 설정 취소: 시작점보다 뒤여야 합니다.");
        }
      } else {
         setPendingLongNoteId(null); // 노트 없으면 초기화
      }
    } else {
      // --- 새 노트 생성 ---
      if (!currentNoteTypeId) return;

      const currentNoteType = noteTypes.find(nt => nt.id === currentNoteTypeId);
      const isLongNoteCapable = currentNoteType?.canBeLong;
      const { clickedLane } = getNoteInfoFromEvent(e);
      const snappedTime = lineTime;

      // 노트 생성 요청 (isLongNote: false)
      const createdNote = addNote({
        time: snappedTime, lane: clickedLane, type: currentNoteTypeId,
        isLongNote: false, extraInfo: undefined,
      });

      // 롱노트 가능 타입이면 -> pending 상태로 전환
      if (isLongNoteCapable && createdNote) {
        setPendingLongNoteId(createdNote.id);
      }
    }
  };

  // 노트 클릭 (삭제 / 대기 취소)
  const handleNoteClick = (e: React.MouseEvent, noteId: string) => {
      e.stopPropagation();
      if (editorMode === 'delete') {
          deleteNote(noteId);
          // 삭제 시 pending 상태도 해제
          if (pendingLongNoteId === noteId) {
              setPendingLongNoteId(null);
          }
      } else if (pendingLongNoteId === noteId) {
          // 배치 모드에서 pending 상태 노트 클릭 시 대기 취소
          setPendingLongNoteId(null);
      }
  };

  // 노트 종류 사전
  const noteTypeMap = useMemo(() => new Map(noteTypes.map(nt => [nt.id, nt])), [noteTypes]);

  return (
    <section
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 bg-base-100 overflow-y-auto relative cursor-crosshair"
    >
      {/* --- h2, paddingTop div --- */}
      <h2 className="text-lg font-bold p-4 sticky top-0 bg-base-100 z-10">
        노트 배치 에디터
      </h2>
      <div style={{ height: `${paddingTop}px` }} />

      {/* --- 2. "진짜 컨텐츠" (노트 영역) --- */}
      <div
       ref={scrollElementRef}
        style={{ height: `${totalHeight}px` }}
        className="border-l border-base-300 relative"
      >
        {/* --- (A) 레인 --- */}
        <div className="absolute top-0 left-0 w-full h-full flex pointer-events-none">
          {Array.from({ length: laneCount }).map((_, index) => (
            <div key={`lane-line-${index}`} className="flex-1 border-r border-base-content/10" />
          ))}
        </div>

        {/* --- (B) 스냅 라인 --- */}
        {snapLines.map((line, index) => (
          <div
            key={`snap-wrapper-${index}`}
            className="absolute w-full h-4 -mt-2 cursor-pointer group z-0 "
            style={{ top: `${totalHeight - (line.time * pixelsPerSecond)}px` }}
            onMouseDown={(e) => handleSnapLineMouseDown(e, line.time)}
          >
             {/* V10.8 색상 수정: 1박마다 보라색 */}
            <div className={`w-full h-px ${
               line.isBeat ? 'bg-secondary' : 'bg-base-content/10'
            } group-hover:bg-primary group-hover:h-0.5`} />
            {line.isBeat && (
              <span
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 // z-index 추가!
                           text-xs text-accent opacity-100 // 크기 키우고, 색 바꾸고, 불투명하게!
                           pointer-events-none
                           select-none
                           // hidden group-hover:block // 👈 항상 보이도록 hover 효과 제거!
                          "
                 // 👆👆👆 (🔥 V11.3) 수정 완료! 👆👆👆
              >
                {line.time.toFixed(2)}
              </span>
            )}
          </div>
          
        ))}

        {/* --- (C) 노트 렌더링 (V10.8 버전 사용 - 중앙 정렬!) --- */}
        {notes.map((note) => {
          const noteType = noteTypeMap.get(note.type);
          const colorClass = noteType ? noteType.color : 'bg-gray-500';
          const startTime = note.time;
          let endTime = (note.isLongNote && note.extraInfo) ? parseFloat(note.extraInfo) : startTime;

          const isPending = pendingLongNoteId === note.id;

          // 높이 계산
          const duration = note.isLongNote ? Math.max(0.01, endTime - startTime) : 0; // 정방향!
          const longNoteHeight = duration * pixelsPerSecond;
          // 대기 중이면 짧은 노트 높이
          const noteHeight = (note.isLongNote && !isPending) ? Math.max(SHORT_NOTE_HEIGHT_PX / 2, longNoteHeight) : SHORT_NOTE_HEIGHT_PX;

          // 노트 "머리" Y 좌표 (끝 시간 기준)
          const noteHeadY = totalHeight - (endTime * pixelsPerSecond);
          // 최종 Top 위치 (머리 기준)
          const finalTop = noteHeadY;
          const finalRenderHeight = note.isLongNote ? noteHeight + 20 : noteHeight;
          return (
            <div
              key={note.id}
              className={`absolute rounded text-xs p-0.5 text-primary-content transition-opacity flex items-center justify-center
                ${colorClass} ${
                editorMode === 'delete' ? 'opacity-50 hover:opacity-100 cursor-not-allowed' : 'cursor-default'
              }
              ${!note.isLongNote && !isPending ? 'shadow-md' : ''}
              ${isPending ? 'ring-2 ring-offset-2 ring-primary animate-pulse' : ''} // 대기 중 하이라이트
            `}
              style={{
                top: `${finalTop-20}px`, // 👈 머리 위치 기준!
                left: `${(note.lane / laneCount) * 100}%`,
                width: `${(1 / laneCount) * 100}%`,
                height: `${finalRenderHeight}px`,
                // 👇 transform 삭제! borderRadius 통일!
                borderRadius: '4px',
                zIndex: isPending ? 30 : (note.isLongNote ? 10 : 20),
              }}
              // 👇 노트 위 클릭은 삭제 또는 대기 취소만!
              onClick={(e) => handleNoteClick(e, note.id)}
            >
              <span className="truncate">{noteType?.name || note.type}</span>
            </div>
          );
        })}
      </div>

      {/* --- paddingBottom div, 판정선 div --- */}
      <div style={{ height: `${paddingBottom}px` }} />
      <div className="sticky bottom-0 h-1 w-full bg-error z-20 shadow-lg">
        <div className="badge badge-error badge-lg absolute left-1/2 -translate-x-1/2">
          판정선 (고정!)
        </div>
      </div>
    </section>
  );
};

export default CenterPanel;