import { useEffect, useRef } from "react";
import {
  useChartStore,
  type ChartState,
  type ChartActions,
} from "../store/useChartStore";

type StoreState = ChartState & ChartActions;

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null); // (이거 필요했지!)

  // "하나씩" 가져오기
  const isPlaying = useChartStore((state: StoreState) => state.isPlaying);
  const currentTime = useChartStore((state: StoreState) => state.currentTime);
  const seekTime = useChartStore((state: StoreState) => state.seekTime);
  const _internalSetTime = useChartStore(
    (state: StoreState) => state._internalSetTime
  );
  const audioSrc = useChartStore((state: StoreState) => state.audioSrc);

  // --- 1. 재생/정지 로직 (이건 완벽했어!) ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.error("재생 오류:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // --- 2. 시간 동기화 로직 (이것도 완벽했어!) ---
  useEffect(() => {
    if (audioRef.current) {
      if (Math.abs(audioRef.current.currentTime - currentTime) > 0.1) {
        audioRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  // 👇👇👇 3. "게임 루프" 부활! (이게 통째로 빠졌었어!) 👇👇👇
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // "게임 루프" 함수 정의
    const animationLoop = () => {
      // 오디오의 현재 시간을 "대뇌"에 콕! 쏴주기
      _internalSetTime(audio.currentTime);
      // 다음 프레임에 또 실행 예약
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    };

    if (isPlaying) {
      // 재생 중이면 "게임 루프" 시작!
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    } else {
      // 정지 중이면 "게임 루프" 멈추기!
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    // 컴포넌트 사라질 때 루프 정리
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, _internalSetTime]); // isPlaying이 바뀔 때마다 실행!

  // --- 4. 오디오 이벤트 리스너 (원래 4번이었지!) ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 노래가 끝까지 재생됐을 때
    const handleEnded = () => {
      seekTime(0);
    };
    audio.addEventListener("ended", handleEnded);

    // (setSongLoaded는 "대뇌"가 하니까 여긴 필요 없음!)

    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [seekTime]);

  // --- 5. audioSrc가 바뀔 때 <audio> 태그 업데이트 (이건 완벽했어!) ---
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioSrc && !audio.src) {
      // 👈 "!audio.src" (아직 src가 없을 때만!)
      audio.src = audioSrc;
      audio.load(); // (수동으로 로드 명령!)
    }
  }, [audioSrc]); // (의존성은 그대로!)

  return (
    <audio ref={audioRef} preload="auto" /> // (src="" 삭제한 거 그대로!)
  );
};

export default AudioPlayer;
