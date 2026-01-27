import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotFoundPage from './pages/NotFoundPage';
import { AppProvider } from './context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Main app pages
import MainPage from './pages/MainPage';
import StationPage from './pages/StationPage';
import TextPage from './pages/TextPage';

// Complementary files
import tocText from './assets/terms.txt?raw'
import licenseText from './assets/mit.txt?raw'
import softwareText from './assets/third-party.txt?raw'

import './index.css';



const queryClient = new QueryClient();


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppProvider>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/station/:label" element={<StationPage />} />
            <Route path="/toc" element={<TextPage text={tocText} />} />
            <Route path="/license" element={<TextPage text={licenseText} />} />
            <Route path="/third-party" element={<TextPage text={softwareText} />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;