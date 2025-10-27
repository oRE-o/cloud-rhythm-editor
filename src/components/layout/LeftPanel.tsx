import { useRef, useEffect, useState } from "react";
import { useChartStore, type ChartState } from "../store/useChartStore";
import WaveformCanvas from "../core/WaveformCanvas"; // 👈 1. (WaveformCanvas가 곧 바뀔 거야!)

type StoreState = ChartState;

const JUDGE_LINE_OFFSET_PX = 40;

const LeftPanel = () => {
  const scrollRef = useRef<HTMLElement | null>(null);

  // 👇 2. "스크롤 정보" (scrollTop, clientHeight)를 "state"로 관리!
  const [scrollInfo, setScrollInfo] = useState({
    scrollTop: 0,
    clientHeight: 0,
  });

  // ... (useChartStore hooks ... 동일) ...
  const currentTime = useChartStore((state: StoreState) => state.currentTime);
  const songDuration = useChartStore((state: StoreState) => state.songDuration);
  const pixelsPerSecond = useChartStore(
    (state: StoreState) => state.pixelsPerSecond
  );
  const isLoading = useChartStore((state: StoreState) => state.isLoading);

  const totalHeight = songDuration * pixelsPerSecond;

  // (V3 여백 공식 - 동일)
  const paddingTop = scrollInfo.clientHeight - JUDGE_LINE_OFFSET_PX;
  const paddingBottom = JUDGE_LINE_OFFSET_PX;

  // --- 1. "화면 높이" state에 저장! (ResizeObserver!) ---
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // 👇 3. clientHeight를 state에 저장!
        setScrollInfo((prev) => ({
          ...prev,
          clientHeight: entry.contentRect.height,
        }));
      }
    });
    const currentScrollEl = scrollRef.current;

    // 👇 2. "변수"로 if 체크! (이게 Type Guard!)
    if (currentScrollEl) {
      // 👇 3. "변수"의 clientHeight를 *먼저* 읽기!
      const currentHeight = currentScrollEl.clientHeight;

      // 👇 4. "읽어둔 값"으로 state 변경! (이러면 100% 안전!)
      setScrollInfo((prev) => ({
        ...prev,
        clientHeight: currentHeight,
      }));

      // 👇 5. "변수"로 observe!
      observer.observe(currentScrollEl);
    }

    // 👇 6. "변수"로 "정리" (disconnect()보다 이게 더 안전!)
    return () => {
      if (currentScrollEl) {
        observer.unobserve(currentScrollEl);
      }
    };
  }, []);

  // --- 2. "스크롤 엔진" (시간 ➔ 스크롤) ---
  useEffect(() => {
    if (!scrollRef.current || scrollInfo.clientHeight === 0) return;

    const newScrollTop = totalHeight - currentTime * pixelsPerSecond;

    if (Math.abs(scrollRef.current.scrollTop - newScrollTop) < 1) return;

    scrollRef.current.scrollTo({ top: newScrollTop, behavior: "auto" });

    // 👇 4. "스크롤 위치"도 "state"에 저장!
    setScrollInfo((prev) => ({ ...prev, scrollTop: newScrollTop }));
  }, [currentTime, pixelsPerSecond, totalHeight, scrollInfo.clientHeight]);

  // (LeftPanel은 수동 스크롤이 없으니 handleScroll은 필요 없음!)

  return (
    <aside
      ref={scrollRef}
      className="w-64 bg-base-200 overflow-y-hidden relative"
    >
      <h2 className="text-lg font-bold p-4 sticky top-0 bg-base-200 z-10">
        세로 파형 (왼쪽)
      </h2>

      {/* 1. "윗쪽 여백" (V3 높이 적용!) */}
      <div style={{ height: `${paddingTop}px` }} />

      {/* 2. "진짜 컨텐츠" (파형!) */}
      <div style={{ height: `${totalHeight}px` }} className="w-full relative">
        {/* 👇 5. "스크롤 정보"를 "props"로 싹! 넘겨주기! */}
        {!isLoading && (
          <WaveformCanvas
            totalHeight={totalHeight}
            scrollTop={scrollInfo.scrollTop}
            clientHeight={scrollInfo.clientHeight}
          />
        )}
      </div>

      {/* 3. "아랫쪽 여백" (V3 높이 적용!) */}
      <div style={{ height: `${paddingBottom}px` }} />

      {/* ... (로딩 스피너, 판정선 ... 100% 동일) ... */}
    </aside>
  );
};

export default LeftPanel;
