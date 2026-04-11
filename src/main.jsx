import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { getInitialSession } from './services/appwrite/auth.js';
import { initializeSync, setupAutoSync, setSyncUserId } from './services/syncService.js';
import { startSyncSubscriber } from './services/syncSubscriber.js';
import { isAppwriteConfigured } from './services/appwrite/client.js';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version is available! Reload to update?')) {
      updateSW();
    }
  },
  onOfflineReady() {
    console.log('App is ready to be used offline!');
  },
});

const queryClient = new QueryClient();

async function initializeApp() {
  if (isAppwriteConfigured()) {
    try {
      const user = await getInitialSession();
      if (user) {
        setSyncUserId(user.$id);
        await initializeSync(user.$id);
      } else {
        await initializeSync('anonymous-' + navigator.userAgent.slice(0, 20));
      }
    } catch (error) {
      console.warn('Appwrite initialization failed, running in local-only mode:', error);
    }
  }

  startSyncSubscriber();
  setupAutoSync();
}

initializeApp().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </HelmetProvider>
    </StrictMode>
  );
});
