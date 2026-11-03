import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import bundledChapters from './data/chapters.json';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register the service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Only automatically reload if we're sure it's safe
    if (confirm('A new version is available! Reload to update?')) {
      updateSW();
    }
  },
  onOfflineReady() {
    console.log('App is ready to be used offline!');
  },
});

const queryClient = new QueryClient();
// Chapter metadata ships with the app, so the home screen is usable immediately
// even when the first backend request is slow or the device is offline.
queryClient.setQueryData(['chapters'], bundledChapters);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);
