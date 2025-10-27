import {
  useChartStore,
  type ChartState,
  type ChartActions,
} from "../store/useChartStore";

type StoreState = ChartState & ChartActions;

const RightPanel = () => {
  // "대뇌"에서 줌 레벨과 *최대 줌 한계선*을 가져오기
  const pixelsPerSecond = useChartStore(
    (state: StoreState) => state.pixelsPerSecond
  );
  const maxPixelsPerSecond = useChartStore(
    (state: StoreState) => state.maxPixelsPerSecond
  );
  const setPixelsPerSecond = useChartStore(
    (state: StoreState) => state.setPixelsPerSecond
  );

  // 👇 1. "오프셋"과 "오프셋 변경" 함수 가져오기!
  const offset = useChartStore((state: StoreState) => state.offset);
  const setOffset = useChartStore((state: StoreState) => state.setOffset);

  // (handleZoomChange ... 동일)
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPixelsPerSecond(Number(e.target.value));
  };

  // 👇 2. "오프셋" input이 바뀔 때 호출될 함수
  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // (숫자로 바꿔서 "대뇌"에 쏴주기!)
    setOffset(Number(e.target.value));
  };

  return (
    <aside className="w-72 bg-base-200 p-4 overflow-y-auto">
      {/* ... (tabs) ... */}

      {/* --- 줌 슬라이더 (V5와 동일) --- */}
      <div className="mt-6 form-control">
        <label className="label">
          <span className="label-text">확대/축소 (줌)</span>
          <span className="label-text-alt">{pixelsPerSecond} px/sec</span>
        </label>
        <input
          type="range"
          min="50"
          max={maxPixelsPerSecond}
          step="10"
          value={pixelsPerSecond}
          onChange={handleZoomChange}
          className="range range-primary"
        />
      </div>

      {/* 👇👇👇 3. "오프셋" input 추가! 👇👇👇 */}
      <div className="mt-4 form-control">
        <label className="label">
          <span className="label-text">오프셋 (초)</span>
          <span className="label-text-alt">첫 박자 시간 (e.g., 0.352)</span>
        </label>
        {/* daisyUI "input" (숫자 타입!) */}
        <input
          type="number"
          step="0.001" // (밀리초 단위로 조절!)
          value={offset}
          onChange={handleOffsetChange}
          className="input input-bordered"
        />
      </div>
    </aside>
  );
};

export default RightPanel;
