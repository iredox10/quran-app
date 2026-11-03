import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BottomNav from './components/BottomNav';
const Home = lazy(() => import('./pages/Home'));
const Surah = lazy(() => import('./pages/Surah'));
const Page = lazy(() => import('./pages/Page'));

const MemorizeIndex = lazy(() => import('./pages/MemorizeIndex'));
const Memorization = lazy(() => import('./pages/Memorization'));
const Library = lazy(() => import('./pages/Library'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Collections = lazy(() => import('./pages/Collections'));
const CollectionDetail = lazy(() => import('./pages/CollectionDetail'));
const RecentSurahs = lazy(() => import('./pages/RecentSurahs'));
const Progress = lazy(() => import('./pages/Progress'));
const ActivityHistory = lazy(() => import('./pages/ActivityHistory'));
const Planner = lazy(() => import('./pages/Planner'));
const PlannerReader = lazy(() => import('./pages/PlannerReader'));
const OfflineLibrary = lazy(() => import('./pages/OfflineLibrary'));
import TajweedTooltip from './components/TajweedTooltip';
const Profile = lazy(() => import('./pages/Profile'));
const FloatingPomodoro = lazy(() => import('./components/FloatingPomodoro'));
const SaukaIndex = lazy(() => import('./pages/SaukaIndex'));
const SaukaGroup = lazy(() => import('./pages/SaukaGroup'));
import CloudSync from './components/CloudSync';
import AlertModal from './components/ui/AlertModal';
import ConfirmModal from './components/ui/ConfirmModal';
import { useAppStore } from './store/useAppStore';

import SplashScreen from './components/ui/SplashScreen';

class PageLoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <main role="alert" className="container text-center py-12">
        <h2>Unable to load this page</h2>
        <p>Check your connection, then try again.</p>
        <button type="button" className="rounded-xl bg-accent px-5 py-3 text-white" onClick={() => window.location.reload()}>Try again</button>
      </main>
    );
    return this.props.children;
  }
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const showGlobalPomodoro = useAppStore(state => state.showGlobalPomodoro);

  useEffect(() => {
    // Override default window.alert for a better UX
    const originalAlert = window.alert;
    window.alert = (message) => {
      useAppStore.getState().setGlobalAlert(message);
    };

    async function requestPersistentStorage() {
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) {
          console.log('✅ Storage is already permanently locked.');
          return;
        }
        const granted = await navigator.storage.persist();
        console.log(granted
          ? '✅ Storage is now permanently locked! The OS will not delete offline data.'
          : '⚠️ Persistent storage not granted yet. Install the app for best offline experience.'
        );
      }
    }

    // Request persistent storage unconditionally on load to prevent offline data eviction
    requestPersistentStorage();

    // Also request right after the user installs the PWA
    const onInstalled = () => {
      console.log('🎉 App installed! Requesting persistent storage...');
      requestPersistentStorage();
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('appinstalled', onInstalled);
      window.alert = originalAlert;
    };
  }, []);

  return (
    <BrowserRouter>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      {/* Headless cloud sync — runs silently in the background on every page */}
      <CloudSync />
      <PageLoadBoundary>
      <Suspense fallback={<main role="status" className="container text-center py-12">Loading Quran Nur…</main>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          <Route path="/memorize" element={<MemorizeIndex />} />
          <Route path="/memorize/:id" element={<Memorization />} />
          <Route path="/library" element={<Library />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/recent" element={<RecentSurahs />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/planner/read/:dayNumber" element={<PlannerReader />} />
          <Route path="/offline-library" element={<OfflineLibrary />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/progress/activity" element={<ActivityHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/sauka" element={<SaukaIndex />} />
          <Route path="/sauka/:groupId" element={<SaukaGroup />} />
          <Route path="/surah/:id" element={<Surah />} />
          <Route path="/page/:id" element={<Page />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
      </PageLoadBoundary>
      <BottomNav />
      <Suspense fallback={null}>{showGlobalPomodoro && <FloatingPomodoro />}</Suspense>
      <TajweedTooltip />
      <AlertModal />
      <ConfirmModal />
    </BrowserRouter>
  );
}

export default App;
