import "./index.css";
import { useEffect } from "react"; // useEffect import
import Header from "./components/layout/Header";
import LeftPanel from "./components/layout/LeftPanel";
import CenterPanel from "./components/layout/CenterPanel";
import RightPanel from "./components/layout/RightPanel";
import Footer from "./components/layout/Footer";
import { useChartStore } from "./components/store/useChartStore"; // "대뇌" import
import AudioPlayer from "./components/core/AudioPlayer";

function App() {
  const loadAudio = useChartStore((state) => state.loadAudio);

  // 👇👇👇 앱이 처음 켜질 때 딱 한 번 실행! 👇👇👇
  useEffect(() => {
    // "대뇌"에게 "이 음악 로드해줘!"라고 명령
    loadAudio("/music/mysong.wav");
  }, [loadAudio]); // (loadAudio는 절대 변하지 않으니 안심!)

  return (
    <div className="flex flex-col h-screen" data-theme="dark">
      {/* "심장"을 여기에 뿅! (눈에 안 보이지만 작동 시작!) */}
      <AudioPlayer />

      <Header />
      <main className="flex-1 flex overflow-hidden">
        {/* (이하 동일) */}
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </main>
      <Footer />
    </div>
  );
}

export default App;
