import React from 'react';
import { createRoot } from 'react-dom/client';
// import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css';


const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  
  root.render(
    // <React.StrictMode>
      <App />
    // </React.StrictMode>
  );
}