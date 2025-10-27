// src/components/layout/CenterPanel.tsx

import { useRef, useEffect, useState, useMemo } from "react";
import type { UIEvent } from "react";
import {
  useChartStore,
  type ChartState,
  type ChartActions,
  type Note,
} from "../store/useChartStore";

type StoreState = ChartState & ChartActions;

const JUDGE_LINE_OFFSET_PX = 40;

const CenterPanel = () => {
  const scrollRef = useRef<HTMLElement | null>(null);
  const isScrollingProgrammatically = useRef(false);
  const [clientHeight, setClientHeight] = useState(0);

  // --- "대뇌"에서 모든 정보 가져오기! (동일) ---
  const currentTime = useChartStore((state: StoreState) => state.currentTime);
  const isPlaying = useChartStore((state: StoreState) => state.isPlaying);
  const songDuration = useChartStore((state: StoreState) => state.songDuration);
  const seekTime = useChartStore((state: StoreState) => state.seekTime);
  const pixelsPerSecond = useChartStore(
    (state: StoreState) => state.pixelsPerSecond
  );
  const laneCount = useChartStore((state: StoreState) => state.laneCount);
  const notes = useChartStore((state: StoreState) => state.notes);
  const addNote = useChartStore((state: StoreState) => state.addNote);
  const bpm = useChartStore((state: StoreState) => state.bpm);
  const offset = useChartStore((state: StoreState) => state.offset);
  const snapDivision = useChartStore((state: StoreState) => state.snapDivision);

  const totalHeight = songDuration * pixelsPerSecond;
  const paddingTop = clientHeight - JUDGE_LINE_OFFSET_PX * 2 - 20;
  const paddingBottom = JUDGE_LINE_OFFSET_PX;

  // --- 1. "화면 높이" state에 저장! (ResizeObserver - V5와 동일) ---
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setClientHeight(entry.contentRect.height);
      }
    });
    if (scrollRef.current) {
      setClientHeight(scrollRef.current.clientHeight);
      observer.observe(scrollRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // --- 2. "스크롤 엔진 1" (시간 ➔ 스크롤 - V5와 동일) ---
  useEffect(() => {
    if (!scrollRef.current || clientHeight === 0) return;
    const newScrollTop = totalHeight - currentTime * pixelsPerSecond;
    if (Math.abs(scrollRef.current.scrollTop - newScrollTop) < 1) return;
    isScrollingProgrammatically.current = true;
    scrollRef.current.scrollTo({ top: newScrollTop, behavior: "auto" });
    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 50);
  }, [currentTime, pixelsPerSecond, totalHeight, clientHeight]);

  // --- 3. "스크롤 엔진 2" (수동 스크롤 ➔ 시간 - V5와 동일) ---
  const handleScroll = (e: UIEvent<HTMLElement>) => {
    if (isScrollingProgrammatically.current) return;
    if (isPlaying) return;
    if (totalHeight === 0) return;
    const currentScrollTop = e.currentTarget.scrollTop;
    const newTime = (totalHeight - currentScrollTop) / pixelsPerSecond;
    if (newTime < -1 || newTime > songDuration + 1) return;
    const clampedTime = Math.max(0, Math.min(newTime, songDuration));
    seekTime(clampedTime);
  };

  // --- 4. (🔥 V6 수정!) "스냅 라인" 계산! (4박/1박 구분!) ---
  const snapLines = useMemo(() => {
    // 👇 1. "타입"에 'isMeasure' (4박) 추가!
    const lines: { time: number; isMeasure: boolean; isBeat: boolean }[] = [];
    if (bpm <= 0 || snapDivision <= 0 || songDuration === 0) return lines;

    const beatDuration = 60 / bpm; // 1박자 시간
    const snapDuration = beatDuration / (snapDivision / 4); // 스냅 1칸 시간

    // 👇 2. 1박자에 스냅이 몇 개? 4박자(1마디)에 스냅이 몇 개?
    const snapsPerBeat = snapDivision / 4; // (e.g., 16비트 -> 4개)
    const snapsPerMeasure = snapsPerBeat * 4; // (e.g., 16비트 -> 16개)

    let currentSnapIndex = 0;
    for (let time = offset; time < songDuration; time += snapDuration) {
      if (time < 0) continue;

      const roundedTime = Math.round(time * 1000) / 1000;

      // 👇 3. "마디 선"인가? (4박) "박자 선"인가? (1박)
      // (오차 방지를 위해 인덱스로 계산!)
      const isMeasureLine = currentSnapIndex % snapsPerMeasure === 0;
      const isBeatLine = currentSnapIndex % snapsPerBeat === 0;

      lines.push({
        time: roundedTime,
        isMeasure: isMeasureLine,
        isBeat: isBeatLine,
      });
      currentSnapIndex++;
    }
    return lines;
  }, [bpm, offset, snapDivision, songDuration]);

  // --- 5. "노트 찍기" 함수 (V5와 동일) ---
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlaying) return;
    if (bpm <= 0) return;

    // 1. (시간 계산 공식 - 동일)
    const rect = e.currentTarget.getBoundingClientRect();
    const clickYInDiv = e.clientY - rect.top;
    const clickedTime = (totalHeight - clickYInDiv) / pixelsPerSecond;

    // 2. (레인 계산 공식 - 동일)
    const clickXInDiv = e.clientX - rect.left;
    const percentX = clickXInDiv / rect.width;
    const clickedLane = Math.floor(percentX * laneCount);

    // 3. (스냅 기능 - 동일)
    const beatDuration = 60 / bpm;
    const snapDuration = beatDuration / (snapDivision / 4);
    const snappedTime = Math.round(clickedTime / snapDuration) * snapDuration;

    console.log(`클릭! 시간: ${snappedTime.toFixed(3)}, 레인: ${clickedLane}`);

    // 4. (노트 추가 - 동일)
    addNote({
      time: snappedTime,
      lane: clickedLane,
      type: "tap",
      isLongNote: false,
    });
  };

  return (
    <section
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 bg-base-100 overflow-y-auto relative"
    >
      <h2 className="text-lg font-bold p-4 sticky top-0 bg-base-100 z-10">
        {" "}
        (가운데 노트 에디터)
      </h2>

      {/* 1. "윗쪽 여백" (V5와 동일) */}
      <div style={{ height: `${paddingTop}px` }} />

      {/* 2. "진짜 컨텐츠" (노트 영역) */}
      <div
        style={{ height: `${totalHeight}px` }}
        className="border-l border-base-300 relative"
        onClick={handleTrackClick}
      >
        {/* --- (A) "레인" 세로줄 (V5와 동일) --- */}
        <div className="absolute top-0 left-0 w-full h-full flex">
          {Array.from({ length: laneCount }).map((_, index) => (
            <div
              key={index}
              className="flex-1 border-r border-base-content/10"
            />
          ))}
        </div>

        {/* --- (B) (🔥 V6 수정!) "스냅" 가로줄! (3단 분리!) --- */}
        {snapLines.map((line, index) => (
          <div
            key={`snap-${index}`}
            // 👇 1. "4박"이면 보라색! "1박"이면 굵은 회색! "나머지"는 얇은 회색!
            className={`absolute w-full h-px ${
              line.isMeasure // 4박마다
                ? "bg-secondary" // 보라색! (daisyUI 'secondary' 컬러)
                : line.isBeat // 1박마다
                ? "bg-base-content/40" // 굵은 회색
                : "bg-base-content/10" // 얇은 회색
            }`}
            style={{
              top: `${totalHeight - line.time * pixelsPerSecond}px`,
            }}
          />
        ))}

        {/* --- (C) "노트" 렌더링! (V5와 동일) --- */}
        {notes.map((note) => (
          <div
            key={note.id}
            className="absolute bg-primary rounded-sm text-primary-content text-xs p-0.5"
            style={{
              top: `${totalHeight - note.time * pixelsPerSecond}px`,
              left: `${(note.lane / laneCount) * 100}%`,
              width: `${(1 / laneCount) * 100}%`,
              height: "10px",
              transform: "translateY(-50%)",
            }}
          >
            {note.type}
          </div>
        ))}
      </div>

      {/* 3. "아랫쪽 여백" (V5와 동일) */}
      <div style={{ height: `${paddingBottom}px` }} />

      {/* 판정선 (V5와 동일) */}
      <div className="sticky bottom-10 h-1 w-full bg-error z-20 shadow-lg">
        <div className="badge badge-error badge-lg absolute -top-3 left-1/2 -translate-x-1/2">
          판정선 (고정!)
        </div>
      </div>
    </section>
  );
};

export default CenterPanel;
