import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Surah from './pages/Surah';
import Page from './pages/Page';
import TajweedTooltip from './components/TajweedTooltip';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="surah/:id" element={<Surah />} />
        </Route>
        <Route path="/page/:id" element={<Page />} />
      </Routes>
      <TajweedTooltip />
    </BrowserRouter>
  );
}

export default App;
