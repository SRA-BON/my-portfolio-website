import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Home from './pages/Home';
import Works from './pages/Works';
import Career from './pages/Career';
import AdminDashboard from './pages/AdminDashboard';
import LiveChat from './components/LiveChat';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppContent({ theme, setTheme, isMobile }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNav, setShowNav] = useState(location.pathname !== '/');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'gaming' : 'light');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user && !user.isAnonymous);
    });
    return () => unsubscribe();
  }, []);

  // Handle Navbar visibility on scroll for Home page
  useEffect(() => {
    if (location.pathname !== '/') {
      // Only update state if it would actually change to avoid unnecessary re-renders
      if (!showNav) {
        setShowNav(true);
      }
      return;
    }

    // Set initial state for home page
    setShowNav(window.scrollY > window.innerHeight * 0.8);

    const handleScroll = () => {
      // The dynamite animation ends around 0.32 progress of the scroll height.
      // Home.jsx scrollHeight is 350vh (desktop) or 200vh (mobile).
      // We'll show the nav after the user has scrolled significantly.
      const threshold = isMobile ? window.innerHeight * 0.5 : window.innerHeight * 0.8;
      setShowNav(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, isMobile]);

  return (
    <div className="app-container">
      <AnimatePresence>
        {showNav && (
          <motion.nav 
            className="navbar"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link to="/" className="nav-logo">Srabon.</Link>

            <div className="nav-links">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
              <NavLink to="/works" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Works</NavLink>
              <NavLink to="/career" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Career</NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} style={{ color: 'var(--primary-color)' }}>INBOX</NavLink>
              )}
            </div>

            <div className="theme-controls">
              <div className="theme-switch-container">
                <span className={`theme-label light ${theme === 'light' ? 'active' : ''}`}>Light</span>
                <button 
                  className={`theme-switch ${theme}`} 
                  onClick={toggleTheme} 
                  aria-label="Toggle theme"
                >
                  <div className="switch-handle">
                    <div className="sun-details"></div>
                    <div className="moon-details"></div>
                  </div>
                  <div className="switch-decoration">
                    <div className="star"></div>
                    <div className="star"></div>
                    <div className="star"></div>
                    <div className="cloud"></div>
                    <div className="cloud"></div>
                  </div>
                </button>
                <span className={`theme-label dark ${theme === 'gaming' ? 'active' : ''}`}>Dark</span>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<Home theme={theme} />} />
        <Route path="/works" element={<Works />} />
        <Route path="/career" element={<Career />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      
      {!isAdmin && location.pathname !== '/admin' && <LiveChat />}

      <footer>
        <p>&copy; {new Date().getFullYear()} Srabon. Designed and built with intent.</p>
      </footer>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState('gaming');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <AppContent theme={theme} setTheme={setTheme} isMobile={isMobile} />
    </Router>
  );
}

export default App;
