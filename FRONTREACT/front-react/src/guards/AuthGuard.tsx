import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/auth.service';

export const AuthGuard: React.FC = () => {
  // Si l'utilisateur n'est pas connecté, redirection vers /login
  if (!authService.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  // Si connecté, on affiche le composant enfant (le Chat)
  return <Outlet />;
};