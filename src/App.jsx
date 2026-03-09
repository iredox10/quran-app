import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Surah from './pages/Surah';
import Page from './pages/Page';

import MemorizeIndex from './pages/MemorizeIndex';
import Memorization from './pages/Memorization';
import Library from './pages/Library';
import Progress from './pages/Progress';
import Planner from './pages/Planner';
import TajweedTooltip from './components/TajweedTooltip';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';
import Profile from './pages/Profile';
import { useAppStore } from './store/useAppStore';

function App() {
  const { translationId } = useAppStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          <Route path="/memorize" element={<MemorizeIndex />} />
          <Route path="/memorize/:id" element={<Memorization />} />
          <Route path="/library" element={<Library />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/surah/:id" element={<Surah />} />
          <Route path="/page/:id" element={<Page />} />
        </Route>
      </Routes>
      <BottomNav />
      <TajweedTooltip />
    </BrowserRouter>
  );
}

export default App;
