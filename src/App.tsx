import { useState, useEffect } from "react";
import { AuthProvider } from "./utils/AuthContext";
import Index from "./pages/Index";
import Contact from "./pages/Contact";

const App = () => {
  const [page, setPage] = useState<'home' | 'contact'>('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setPage(hash as 'home' | 'contact');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (route: string) => {
    window.location.hash = route === 'home' ? '' : route;
  };

  return (
    <AuthProvider>
      {page === 'home' ? <Index /> : <Contact />}
    </AuthProvider>
  );
};

export default App;
