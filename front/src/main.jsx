import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Import Cally to register the web component globally
import 'cally';

ReactDOM.createRoot(document.getElementById('root')).render(
  // TODO: Remove StrictMode for production
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);