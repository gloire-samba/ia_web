import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import './AdminDashboard.css';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const deconnexion = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>🛡️ Espace Admin</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/utilisateurs" className={({isActive}) => isActive ? "nav-item actif" : "nav-item"}>
            👥 Liste Utilisateurs
          </NavLink>
          <NavLink to="/admin/visages" className={({isActive}) => isActive ? "nav-item actif" : "nav-item"}>
            👤 Base Biométrique (IA)
          </NavLink>
          {/* 👉 LE NOUVEAU BOUTON CHAT */}
          <NavLink to="/chat" className={({isActive}) => isActive ? "nav-item actif" : "nav-item"}>
            💬 Accéder au Chat
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="btn-deconnexion" onClick={deconnexion}>Déconnexion</button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet /> {/* Les composants Utilisateurs ou Visages s'injectent ici */}
      </main>
    </div>
  );
};