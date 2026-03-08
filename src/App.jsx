import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Surah from './pages/Surah';
import Page from './pages/Page';
import Dashboard from './pages/Dashboard';
import MemorizeIndex from './pages/MemorizeIndex';
import Memorization from './pages/Memorization';
import Library from './pages/Library';
import Progress from './pages/Progress';
import TajweedTooltip from './components/TajweedTooltip';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';
import Profile from './pages/Profile';
import { useAppStore } from './store/useAppStore';

function App() {
  const { translationId, setTranslation } = useAppStore();

  useEffect(() => {
    // Migrate 131 (Clear Quran, removed from API v4) to 85 (Abdul Haleem) silently
    if (translationId === 131) {
      setTranslation(85);
    }
  }, [translationId, setTranslation]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/memorize" element={<MemorizeIndex />} />
          <Route path="/memorize/:id" element={<Memorization />} />
          <Route path="/library" element={<Library />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/surah/:id" element={<Surah />} />
        </Route>

        <Route path="/page/:id" element={<Page />} />
      </Routes>
      <BottomNav />
      <TajweedTooltip />
    </BrowserRouter>
  );
}

export default App;
