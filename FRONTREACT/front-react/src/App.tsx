import React, { useState, useEffect } from 'react';

import { Login } from './components/login/Login';
import { Chat } from './components/chat/Chat';

import { authService } from './services/auth.service';

import './App.css';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { type BackendType, serveurService } from './services/serveur.service';

import { AdminDashboard } from './components/admin-dashboard/AdminDashboard';
import { AdminUtilisateurs } from './components/admin-utilisateurs/AdminUtilisateurs';
import { AdminVisages } from './components/admin-visages/AdminVisages';
import { AdminVisageForm } from './components/admin-visage-form/AdminVisageForm';



// Gardien de route simple
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const role = authService.getRole();
  if (!authService.getUserFromStorage()) return <Navigate to="/login" />;
  if (requireAdmin && role !== 'ROLE_ADMIN') return <Navigate to="/chat" />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  const [serveurActif, setServeurActif] = useState<BackendType>(serveurService.getBackend());
  
  // 1. On remet le useState pour l'admin
  const [isAdmin, setIsAdmin] = useState(authService.getRole() === 'ROLE_ADMIN');
  
  // 2. On récupère la location
  const location = useLocation();

  // 3. 👉 CORRECTION : On utilise "location" dans les dépendances de useEffect.
  // Ainsi, à chaque fois que tu changes de page (location), le statut Admin est revérifié !
  useEffect(() => {
    setIsAdmin(authService.getRole() === 'ROLE_ADMIN');
  }, [location, serveurActif]); 

  const changerServeur = (backend: BackendType) => {
    authService.logout();
    serveurService.setBackend(backend);
    setServeurActif(backend);
  };
  
  return (
    <div className="app-layout">
      <header className="navbar">
        <div className="logo"><span className="icon">🤖</span> IA Bureautique (React)</div>
        
        <div className="status-badge">
          <span style={{ color: '#00d8ff', fontWeight: 'bold' }}>🖥️ Front: React</span>
          <span className="divider" style={{ margin: '0 10px' }}>|</span>
          <span style={{ color: serveurActif === 'spring' ? '#28a745' : '#007bff', fontWeight: 'bold' }}>
            🗄️ Back: {serveurActif === 'spring' ? 'Spring Boot ☕' : 'Django 🎸'}
          </span>
        </div>
        
        <div className="backend-selector">
          <button type="button" style={{ backgroundColor: '#dd0031', color: '#fff', fontWeight: 'bold' }} onClick={() => window.location.href = 'http://localhost:4200/'}>
            🅰️ Vue Angular
          </button>
          <button className={serveurActif === 'spring' ? 'active-spring' : ''} onClick={() => changerServeur('spring')}>
            ☕ Spring
          </button>
          <button className={serveurActif === 'django' ? 'active-django' : ''} onClick={() => changerServeur('django')}>
            🎸 Django
          </button>
        </div>

        {/* 👉 CORRECTION DU NAV ET DU BOUTON ADMIN ICI */}
        <nav className="nav-links">
          {isAdmin && <Link to="/admin" className="btn-admin">🛡️ Admin Dashboard</Link>}
          <button className="btn-logout" onClick={() => authService.logout()}>Déconnexion</button>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          
          {/* ROUTES ADMIN IMBRIQUÉES */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>}>
            <Route index element={<Navigate to="utilisateurs" />} />
            <Route path="utilisateurs" element={<AdminUtilisateurs />} />
            <Route path="visages" element={<AdminVisages />} />
            <Route path="visages/nouveau" element={<AdminVisageForm />} />
            <Route path="visages/modifier/:id" element={<AdminVisageForm />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  );
};