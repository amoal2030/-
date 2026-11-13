import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const swUrl = `${baseUrl}sw.js`;
    navigator.serviceWorker
      .register(swUrl, { scope: baseUrl })
      .catch((error) => {
        console.warn('Service Worker registration notice:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
