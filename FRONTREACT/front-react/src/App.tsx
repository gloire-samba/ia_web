import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'; // 👉 useLocation retiré
import { LoginComponent } from './components/login/Login';
import { AuthGuard } from './guards/AuthGuard';
import './App.css';
import { Chat } from './components/chat/Chat';
import { AuthService } from './services/auth.service';
import { chatService, type BackendType } from './services/chat.service';
import { InscriptionComponent } from './components/inscription/Inscription';

function App() {
  const navigate = useNavigate();
  // 👉 location retiré car on affiche toujours la barre maintenant
  const [selectedBackend, setSelectedBackend] = useState<BackendType>(chatService.getCurrentBackend());
  const [isLoggedIn, setIsLoggedIn] = useState(AuthService.isLoggedIn());

  // On écoute les changements de connexion
  useEffect(() => {
    const subscription = AuthService.currentUser$.subscribe(user => {
      setIsLoggedIn(!!user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const changerServeur = (backend: BackendType) => {
    AuthService.logout();
    chatService.setBackend(backend);
    setSelectedBackend(backend);
    navigate('/login');
  };

  const basculerVersAngular = () => {
    AuthService.logout();
    window.location.href = 'http://localhost:4200/';
  };

  const deconnexion = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <div className="app-host">
      <div className="app-layout">
        
        <header className="navbar">
          <div className="logo">
            <span className="icon">🤖</span> IA Bureautique
          </div>

          <div className="status-badge">
              <span style={{ color: '#00d8ff', fontWeight: 'bold' }}>🖥️ Front: React</span>
              <span className="divider" style={{ margin: '0 10px' }}>|</span>
              <span style={{ color: selectedBackend === 'spring' ? '#28a745' : '#007bff', fontWeight: 'bold' }}>
                🗄️ Back: {selectedBackend === 'spring' ? 'Spring Boot ☕' : 'Django 🎸'}
              </span>
          </div>
          
          <div className="backend-selector">
            <button type="button" style={{ backgroundColor: '#dd0031', color: 'white', fontWeight: 'bold' }} onClick={basculerVersAngular}>
              🔴 Vue Angular
            </button>
            <button 
              className={selectedBackend === 'spring' ? 'active-spring' : ''} 
              onClick={() => changerServeur('spring')}>
              ☕ Spring
            </button>
            <button 
              className={selectedBackend === 'django' ? 'active-django' : ''} 
              onClick={() => changerServeur('django')}>
              🎸 Django
            </button>
          </div>
          
          {/* 👉 On utilise la variable d'état isLoggedIn pour que ça soit réactif */}
          {isLoggedIn && (
            <nav className="nav-links">
              <button className="btn-logout" onClick={deconnexion}>🚪 Déconnexion</button>
            </nav>
          )}
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route path="/inscription" element={<InscriptionComponent />} />
            <Route element={<AuthGuard />}>
              <Route path="/chat" element={<Chat />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;