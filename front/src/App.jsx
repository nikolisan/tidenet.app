import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainPage from './pages/MainPage';
import StationPage from './pages/StationPage';

import './index.css';





const App = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/station/:label" element={<StationPage />} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;