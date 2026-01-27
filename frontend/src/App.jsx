import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NotFoundPage from './pages/NotFoundPage';
import { AppProvider } from './context/AppContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Main app pages
import MainPage from './pages/MainPage';
import StationPage from './pages/StationPage';
import TextPage from './pages/TextPage';

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
            <Route path="/toc" element={<TextPage docUrl="/docs/terms.txt" />} />
            <Route path="/license" element={<TextPage docUrl="/docs/mit.txt" />} />
            <Route path="/third-party" element={<TextPage docUrl="/docs/third-party.txt" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;