import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from './App.tsx';
import './index.css';
import 'uplot/dist/uPlot.min.css';
import 'react-toastify/dist/ReactToastify.css';
import ConvexClientProvider from './components/ConvexClientProvider.tsx';
import WinluRoom from './components/WinluRoom.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).has('winlu-room') ? (
      <WinluRoom />
    ) : (
      <ConvexClientProvider>
        <Home />
      </ConvexClientProvider>
    )}
  </React.StrictMode>,
);
