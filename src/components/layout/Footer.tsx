// src/components/layout/Footer.tsx

import {
  useChartStore,
  type ChartState,
  type ChartActions,
} from "../store/useChartStore";
// import { shallow } from 'zustand/shallow'; // <- 👈 shallow는 이제 필요 없어!

type StoreState = ChartState & ChartActions;

const Footer = () => {
  // ------------------ 👇👇👇 여기를 수정! 👇👇👇 ------------------

  // "대뇌"에서 필요한 것만 쏙! "하나씩!"
  const isPlaying = useChartStore((state: StoreState) => state.isPlaying);
  const togglePlay = useChartStore((state: StoreState) => state.togglePlay);
  const currentTime = useChartStore((state: StoreState) => state.currentTime);
  const songDuration = useChartStore((state: StoreState) => state.songDuration);

  // ------------------ 👆👆👆 여기까지 수정! 👆👆👆 ------------------

  return (
    <footer className="footer items-center p-4 bg-base-300 z-10">
      <div className="items-center grid-flow-col gap-4">
        {/* 현재 시간 표시! */}
        <div className="font-mono text-lg">
          <span>{currentTime.toFixed(3)}</span>
          <span className="text-base-content/50">
            {" / "}
            {songDuration.toFixed(3)}
          </span>
        </div>
      </div>
      <div className="grid-flow-col gap-4 md:place-self-center md:justify-self-end">
        {/* 버튼을 누르면 "대뇌"의 togglePlay() 함수를 호출! */}
        <button className="btn btn-primary" onClick={togglePlay}>
          {isPlaying ? "⏸ 정지" : "▶ 재생"}
        </button>
      </div>
    </footer>
  );
};

export default Footer;
