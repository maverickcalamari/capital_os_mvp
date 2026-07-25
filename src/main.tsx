import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initAuth } from './lib/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

initAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
