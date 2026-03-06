import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Surah from './pages/Surah';
import Page from './pages/Page';
import Dashboard from './pages/Dashboard';
import MemorizeIndex from './pages/MemorizeIndex';
import Memorization from './pages/Memorization';
import Progress from './pages/Progress';
import TajweedTooltip from './components/TajweedTooltip';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/memorize" element={<MemorizeIndex />} />
          <Route path="/memorize/:id" element={<Memorization />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/surah/:id" element={<Surah />} />
        </Route>

        <Route path="/page/:id" element={<Page />} />
      </Routes>
      <TajweedTooltip />
    </BrowserRouter>
  );
}

export default App;
