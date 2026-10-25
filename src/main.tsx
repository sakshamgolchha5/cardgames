import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import Landscape from './Landscape';
import './theme.css';
createRoot(document.getElementById('root')!).render(<Landscape><App /></Landscape>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
      const checkForUpdate = () => { if (document.visibilityState === 'visible') void registration.update(); };
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', checkForUpdate);
    }).catch(() => {});
  });
}
