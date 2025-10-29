import { useChartStore, type ChartState, type ChartActions } from '../store/useChartStore';
import type { TimeSignature, NoteType } from '../store/useChartStore';
import { useState } from 'react'; // Keep useState

type StoreState = ChartState & ChartActions;

const NOTE_COLORS = [
  'bg-primary', 'bg-secondary', 'bg-accent', 
  'bg-info', 'bg-success', 'bg-warning', 'bg-error',
  'bg-neutral',
];

const RightPanel = () => {
  // --- 👇👇👇 Select EVERYTHING individually! 👇👇👇 ---

  // (Tab 1: 곡 설정)
  const bpm = useChartStore((state: StoreState) => state.bpm);
  const setBpm = useChartStore((state: StoreState) => state.setBpm);
  const offset = useChartStore((state: StoreState) => state.offset);
  const setOffset = useChartStore((state: StoreState) => state.setOffset);
  const laneCount = useChartStore((state: StoreState) => state.laneCount);
  const setLaneCount = useChartStore((state: StoreState) => state.setLaneCount);
  // (Select timeSignature parts individually too!)
  const beatsPerMeasure = useChartStore((state: StoreState) => state.timeSignature.beatsPerMeasure);
  const beatValue = useChartStore((state: StoreState) => state.timeSignature.beatValue);
  const setTimeSignature = useChartStore((state: StoreState) => state.setTimeSignature);
  
  // (Tab 2: 에디터 설정)
  const editorMode = useChartStore((state: StoreState) => state.editorMode);
  const setEditorMode = useChartStore((state: StoreState) => state.setEditorMode);
  const noteTypes = useChartStore((state: StoreState) => state.noteTypes);
  const currentNoteTypeId = useChartStore((state: StoreState) => state.currentNoteTypeId);
  const setCurrentNoteTypeId = useChartStore((state: StoreState) => state.setCurrentNoteTypeId);
  const addNoteType = useChartStore((state: StoreState) => state.addNoteType);
  const updateNoteType = useChartStore((state: StoreState) => state.updateNoteType);
  const snapDivision = useChartStore((state: StoreState) => state.snapDivision);
  const setSnapDivision = useChartStore((state: StoreState) => state.setSnapDivision);
    
  // (줌 관련)
  const pixelsPerSecond = useChartStore((state: StoreState) => state.pixelsPerSecond);
  const setPixelsPerSecond = useChartStore((state: StoreState) => state.setPixelsPerSecond);
  
  // --- Handlers (Need slight adjustment for timeSignature) ---
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPixelsPerSecond(Number(e.target.value));
  };
  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset(Number(e.target.value)); 
  };
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(Number(e.target.value)); 
  };
  const handleLaneCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLaneCount(Number(e.target.value));
  };

  const [editingNoteTypeNames, setEditingNoteTypeNames] = useState<Record<string, string>>({});

  // 👇 Adjusted handler to use individual state values 👇
  const handleTimeSignatureChange = (part: keyof TimeSignature, value: number) => {
    const nonNegativeValue = Math.max(1, value);
    // Construct the new timeSignature object using current values
    const newTimeSignature = {
        beatsPerMeasure: part === 'beatsPerMeasure' ? nonNegativeValue : beatsPerMeasure,
        beatValue: part === 'beatValue' ? nonNegativeValue : beatValue,
    };
    setTimeSignature(newTimeSignature);
  };
  const handleNoteTypeNameChange = (id: string, currentName: string) => {
    setEditingNoteTypeNames(prev => ({ ...prev, [id]: currentName }));
  };
  const handleNoteTypeNameBlur = (id: string) => {
    if (editingNoteTypeNames[id] !== undefined) {
      updateNoteType(id, { name: editingNoteTypeNames[id] }); 
    }
  };

  const handleSnapChange = (newSnap: number) => {
    setSnapDivision(newSnap);
  };
  const handleAddNewNoteType = () => {
    const randomColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    addNoteType('새 노트', randomColor);
  };
  // 👇 New handler for color change
  const handleNoteColorChange = (id: string, newColor: string) => {
      updateNoteType(id, { color: newColor });
  };
  // 👇 New handler for long note toggle change
  const handleCanBeLongToggleChange = (id: string, isChecked: boolean) => {
      updateNoteType(id, { canBeLong: isChecked });
  };

  return (
    <aside className="w-72 bg-base-200 p-4 overflow-y-auto">
      
      {/* --- Zoom Slider --- */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">스크롤 속도</span>
          <span className="label-text-alt">{pixelsPerSecond} px/sec</span>
        </label>
        <input 
          type="range" min="50" max="900" step="10" 
          value={pixelsPerSecond} onChange={handleZoomChange}
          className="range range-primary" 
        />
      </div>

      {/* --- Main Tabs --- */}
      <div role="tablist" className="tabs tabs-boxed mt-6">
        <input type="radio" name="settings_tabs" role="tab" className="tab" aria-label="곡 설정" defaultChecked />
        {/* --- Tab 1: 곡 설정 --- */}
        <div role="tabpanel" className="tab-content bg-base-100 border-base-300 rounded-box p-4">
          
          {/* BPM */}
          <div className="form-control">
            <label className="label"><span className="label-text">시작 BPM</span></label>
            <input type="number" step="0.01" value={bpm} onChange={handleBpmChange} className="input input-bordered input-sm" />
          </div>
          
          {/* Offset */}
          <div className="form-control mt-4">
            <label className="label"><span className="label-text">오프셋 (초)</span></label>
            <input type="number" step="0.001" value={offset} onChange={handleOffsetChange} className="input input-bordered input-sm" />
          </div>
          
          {/* Lane Count */}
          <div className="form-control mt-4">
            <label className="label"><span className="label-text">라인 수</span></label>
            <input type="number" step="1" min="1" max="10" value={laneCount} onChange={handleLaneCountChange} className="input input-bordered input-sm" />
          </div>

          {/* Time Signature */}
          <div className="form-control mt-4">
            <label className="label"><span className="label-text">박자</span></label>
            <div className="join">
              <input 
                type="number" step="1" min="1" value={beatsPerMeasure} // Use individual value
                onChange={(e) => handleTimeSignatureChange('beatsPerMeasure', Number(e.target.value))}
                className="input input-bordered input-sm join-item w-1/2" 
                aria-label="마디당 박 수"
              />
              <span className="join-item btn btn-sm no-animation">/</span>
              <select
                value={beatValue} // Use individual value
                onChange={(e) => handleTimeSignatureChange('beatValue', Number(e.target.value))}
                className="select select-bordered select-sm join-item w-1/2"
                aria-label="기준 음표"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={16}>16</option>
              </select>
            </div>
          </div>
        </div>

        <input type="radio" name="settings_tabs" role="tab" className="tab" aria-label="에디터" />
        {/* --- Tab 2: 에디터 설정 --- */}
        <div role="tabpanel" className="tab-content bg-base-100 border-base-300 rounded-box p-4">
          
          {/* Editor Mode */}
          <label className="label"><span className="label-text">에디터 모드</span></label>
          <div className="btn-group grid grid-cols-2">
            <button 
              className={`btn btn-sm ${editorMode === 'place' ? 'btn-active' : ''}`}
              onClick={() => setEditorMode('place')}
            >
              배치 🖌️
            </button>
            <button 
              className={`btn btn-sm ${editorMode === 'delete' ? 'btn-active' : ''}`}
              onClick={() => setEditorMode('delete')}
            >
              삭제 ❌
            </button>
          </div>
          
          {/* Note Types */}
          <label className="label mt-4"><span className="label-text">노트 종류</span></label>
          <div className="form-control space-y-1 max-h-60 overflow-y-auto"> 
            {noteTypes.map((noteType) => (
              <div 
                key={noteType.id} 
                className={`collapse collapse-arrow border border-base-300 bg-base-200 rounded-md transition-all 
                  ${noteType.color} ${currentNoteTypeId === noteType.id ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-primary' : ''}`}
                // 1. (🔥 V7.9) 타이틀 클릭 시 선택만 토글
                onClick={() => {
                   if (editorMode !== 'delete') {
                       setCurrentNoteTypeId(noteType.id); // 클릭하면 선택
                   }
                }}
              >
                 {/* 3. (🔥 V7.7) 체크박스 부활! + "클릭 타겟" 지정 */}
                 <input type="checkbox" className="peer" />
                 
                 {/* Collapse Title */}
                 <div className={`collapse-title text-sm font-medium flex flex-col items-start ${noteType.color} text-base-content rounded-md 
                   ${currentNoteTypeId === noteType.id ? 'font-bold' : ''} peer-checked:rounded-b-none p-2`}>
                   
                   {/* 1. 첫 번째 줄: 노트 이름 (크게!) */}
                   <span className="text-base font-bold text-base-content leading-tight">
                     {noteType.name}
                   </span>
                   
                   {/* 2. 두 번째 줄: 선택 상태 (작게!) */}
                   <span className="text-xs text-base-content opacity-70 leading-tight">
                     {currentNoteTypeId === noteType.id ? (
                       '선택됨' // 👈 선택됨 고정 텍스트
                     ) : (
                       '편집 가능' // 👈 상태 텍스트
                     )}
                   </span>
                 </div>
                 {/* Collapse Content: Editing options */}
                 <div className="collapse-content bg-base-100"> 
                   {/* Name Input */}
                   <div className="form-control mt-2">
                     <label className="label py-1"><span className="label-text text-xs">이름</span></label>
                     <input 
                       type="text"
                       value={editingNoteTypeNames[noteType.id] ?? noteType.name} 
                       onChange={(e) => handleNoteTypeNameChange(noteType.id, e.target.value)}
                       onBlur={() => handleNoteTypeNameBlur(noteType.id)}
                       className="input input-bordered input-sm"
                       placeholder="노트 이름"
                       disabled={editorMode === 'delete'} 
                     />
                   </div>
                   
                   {/* Color Selector */}
                   <div className="form-control mt-2">
                     <label className="label py-1"><span className="label-text text-xs">색상</span></label>
                     <div className="grid grid-cols-4 gap-1">
                       {NOTE_COLORS.map(color => (
                         <button
                           key={color}
                           className={`btn btn-xs h-6 rounded ${color} ${noteType.color === color ? 'ring-2 ring-offset-1 ring-base-content' : ''}`}
                           onClick={() => handleNoteColorChange(noteType.id, color)}
                           disabled={editorMode === 'delete'}
                         />
                       ))}
                     </div>
                   </div>

                   {/* Long Note Toggle */}
                   <div className="form-control mt-2">
                     <label className="label cursor-pointer py-1">
                       <span className="label-text text-xs">롱노트 가능</span> {/* 👈 라벨 변경! */}
                       <input 
                         type="checkbox" 
                         className="toggle toggle-sm toggle-primary" 
                         checked={noteType.canBeLong || false} // 👈 'canBeLong' 사용!
                         onChange={(e) => handleCanBeLongToggleChange(noteType.id, e.target.checked)} // 👈 핸들러 이름 변경!
                         disabled={editorMode === 'delete'}
                       />
                     </label>
                   </div>
                 </div>
               </div>
            ))}
            {/* Add Note Type Button */}
            <button className="btn btn-sm btn-outline btn-block mt-2" onClick={handleAddNewNoteType}>
              + 노트 종류 추가
            </button>
          </div>
          
          {/* Snap Grid */}
          <label className="label mt-4"><span className="label-text">스냅 (분할)</span></label>
          <div role="tablist" className="tabs tabs-boxed grid grid-cols-4 gap-1">
             {[4, 8, 12, 16, 24, 32].map((snap) => (
              <a
                key={snap}
                role="tab"
                className={`tab tab-xs ${snapDivision === snap ? 'tab-active' : ''}`}
                onClick={() => handleSnapChange(snap)}
              >
                1/{snap}
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightPanel;