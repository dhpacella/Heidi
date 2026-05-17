import { useState, useEffect } from 'react';
import Home from './pages/Home';
import About from './pages/About';
import './App.css';

const pageComponents = {
  '':      Home,
  'home':  Home,
  'about': About,
};

function App() {
  const [currentPage, setCurrentPage] = useState(() =>
    window.location.pathname.slice(1) || 'home'
  );

  useEffect(() => {
    const onPop = () => setCurrentPage(window.location.pathname.slice(1) || 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const PageComponent = pageComponents[currentPage] || Home;

  return <PageComponent />;
}

export default App;
