import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainPage from './pages/MainPage';
import StationPage from './pages/StationPage';
import TextPage from './pages/TextPage';

import tosText from './assets/terms.txt?raw'
import licenseText from './assets/mit.txt?raw'
import softwareText from './assets/third-party.txt?raw'

import './index.css';





const App = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/station/:label" element={<StationPage />} />
          <Route path="/tos" element={<TextPage text={tosText} />} />
          <Route path="/license" element={<TextPage text={licenseText} />} />
          <Route path="/third-party" element={<TextPage text={softwareText} />} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;