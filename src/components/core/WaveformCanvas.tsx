import React, { useRef, useEffect, useMemo } from "react"; // 👈 1. "React" import 추
import { useChartStore, type ChartState } from "../store/useChartStore";

type StoreState = ChartState;

// "캔버스 조각(Chunk)" 1개의 높이 (px)
// (3000px 정도는 요즘 브라우저에서 렉 안 걸려!)
const CHUNK_HEIGHT = 3000;

// -----------------------------------------------------
// 2. "하나의 캔버스 조각"을 그리는 컴포넌트
// -----------------------------------------------------
interface CanvasChunkProps {
  peakDataArrays: [number[], number[]];
  songDuration: number;
  pixelsPerSecond: number;
  totalHeight: number;

  chunkIndex: number; // (내가 몇 번째 조각인지?)
  chunkY: number; // (내 Y 위치는 어디인지?)
  chunkHeight: number; // (내 실제 높이는 몇 px인지?)
}

const CanvasChunk: React.FC<CanvasChunkProps> = ({
  peakDataArrays,
  songDuration,
  pixelsPerSecond,
  totalHeight,
  chunkIndex,
  chunkY,
  chunkHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // (그리기 함수는 밖으로 뺐어!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawWaveformChunk(
        canvas,
        peakDataArrays,
        songDuration,
        pixelsPerSecond,
        totalHeight,
        chunkY,
        chunkHeight
      );
    }
  }, [
    peakDataArrays,
    songDuration,
    pixelsPerSecond,
    totalHeight,
    chunkY,
    chunkHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={224} // (그림판 너비)
      height={chunkHeight} // (🔥 중요! 3000px!)
      className="w-full absolute"
      style={{
        top: `${chunkY}px`, // (🔥 중요! 내 위치!)
        height: `${chunkHeight}px`,
      }}
    />
  );
};

// -----------------------------------------------------
// 3. "파형 그리기" 함수 (V4와 99% 동일! y좌표 계산만 살짝 다름!)
// -----------------------------------------------------
const drawWaveformChunk = (
  canvas: HTMLCanvasElement,
  peakDataArrays: [number[], number[]],
  songDuration: number,
  pixelsPerSecond: number,
  totalHeight: number,
  chunkY: number, // (이 조각이 시작하는 Y 위치)
  chunkHeight: number // (이 조각의 높이)
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const [leftChannel, rightChannelData] = peakDataArrays;
  const rightChannel = rightChannelData || leftChannel;
  const dataLength = leftChannel.length;

  const middleLeft = canvas.width / 4;
  const middleRight = (canvas.width / 4) * 3;
  const halfWidth = canvas.width / 4;
  const colorLeft = "#E5E7EB";
  const colorRight = "#A78BFA";

  const pixelsPerPeak = totalHeight / dataLength;

  // (데이터를 1바퀴 쓱~ 도는 건 동일!)
  for (let i = 0; i < dataLength; i++) {
    // (이 데이터가 그려져야 할 "전체 Y좌표")
    const globalY = totalHeight - i * pixelsPerPeak;

    // (🔥 중요!) 이 Y좌표가 "지금 이 캔버스 조각" 범위 밖이면...
    if (globalY < chunkY || globalY > chunkY + chunkHeight) {
      continue; // ...그리지 말고 스킵!
    }

    // (범위 안이면, "이 캔버스 안에서의 로컬 y좌표" 계산)
    const localY = globalY - chunkY;

    // (이하 V4와 100% 동일!)
    const peakLeft = Math.abs(leftChannel[i] || 0);
    const peakRight = Math.abs(rightChannel[i] || 0);
    const amplitudeLeft = peakLeft * halfWidth;
    const amplitudeRight = peakRight * halfWidth;

    ctx.fillStyle = colorLeft;
    ctx.fillRect(
      middleLeft - amplitudeLeft,
      localY,
      amplitudeLeft * 2,
      pixelsPerPeak
    );
    ctx.fillStyle = colorRight;
    ctx.fillRect(
      middleRight - amplitudeRight,
      localY,
      amplitudeRight * 2,
      pixelsPerPeak
    );
  }
};

// -----------------------------------------------------
// 1. "캔버스 가상화" 메인 컴포넌트
// -----------------------------------------------------
interface WaveformCanvasProps {
  totalHeight: number;
  scrollTop: number;
  clientHeight: number;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  totalHeight,
  scrollTop,
  clientHeight,
}) => {
  // "대뇌"에서 "파형 데이터"만 가져오기
  const peakDataArrays = useChartStore(
    (state: StoreState) => state.peakDataArrays
  );
  const songDuration = useChartStore((state: StoreState) => state.songDuration);
  const pixelsPerSecond = useChartStore(
    (state: StoreState) => state.pixelsPerSecond
  );

  // "지금 눈에 보이는" 캔버스 조각(Chunk)들만 계산!
  const visibleChunks = useMemo(() => {
    const chunks = [];
    if (totalHeight === 0 || clientHeight === 0) return [];

    // (버퍼 100px 추가: 스크롤할 때 안 끊기게!)
    const visibleTop = scrollTop - 100;
    const visibleBottom = scrollTop + clientHeight + 100;

    // "눈에 보이는" 첫 번째 조각 인덱스
    const firstChunkIndex = Math.floor(visibleTop / CHUNK_HEIGHT);
    // "눈에 보이는" 마지막 조각 인덱스
    const lastChunkIndex = Math.ceil(visibleBottom / CHUNK_HEIGHT);

    for (let i = firstChunkIndex; i < lastChunkIndex; i++) {
      const chunkY = i * CHUNK_HEIGHT;
      // (총 높이를 넘어가면 안 됨!)
      if (chunkY > totalHeight) break;

      const chunkHeight = Math.min(CHUNK_HEIGHT, totalHeight - chunkY);
      if (chunkHeight <= 0) break;

      chunks.push(
        <CanvasChunk
          key={i}
          chunkIndex={i}
          chunkY={chunkY}
          chunkHeight={chunkHeight}
          // (모든 "대뇌" 정보도 싹 다 넘겨주기!)
          peakDataArrays={peakDataArrays!}
          songDuration={songDuration}
          pixelsPerSecond={pixelsPerSecond}
          totalHeight={totalHeight}
        />
      );
    }
    return chunks;
  }, [
    peakDataArrays,
    songDuration,
    pixelsPerSecond,
    totalHeight,
    scrollTop,
    clientHeight,
  ]);

  if (!peakDataArrays) return null; // 데이터 없으면 렌더링 X

  return (
    <>
      {/* (V4 코드: <canvas ... /> 한 개짜리) (삭제!)
       */}

      {/* (V-Final 코드: "눈에 보이는" 조각(Chunk)들만 렌더링!)
        (보통 2~3개만 렌더링됨!)
      */}
      {visibleChunks}
    </>
  );
};

// (React.memo로 감싸서, "스크롤"할 때만 리렌더링되게 최적화!)
export default React.memo(WaveformCanvas);
