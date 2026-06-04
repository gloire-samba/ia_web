import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service'; // 👉 Import corrigé (minuscule)
import './Inscription.css';

export const InscriptionComponent = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', motDePasse: '' });
  const [messageErreur, setMessageErreur] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setHidePassword(!hidePassword);
  };

  // 👉 Logique React propre avec async/await (adieu .subscribe !)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; 

    setIsLoading(true);
    setMessageErreur('');
    
    try {
      // 1. On s'inscrit
      await authService.register(formData);
      // 2. On se connecte automatiquement dans la foulée
      await authService.login(formData.email, formData.motDePasse);
      
      setIsLoading(false);
      navigate('/chat');
    } catch (err: any) { // 👉 Le ': any' corrige l'erreur TS7006
      setIsLoading(false);
      setMessageErreur(err.message || "Erreur lors de l'inscription.");
    }
  };

  return (
    <div className="inscription-container">
      <div className="inscription-box">
        <h2>Créer un compte</h2>

        {messageErreur && <div className="alert error">{messageErreur}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Adresse Email</label>
            <input 
              type="email" 
              id="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              placeholder="votre@email.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="password-wrapper">
              <input 
                type={hidePassword ? 'password' : 'text'} 
                id="password" 
                value={formData.motDePasse} 
                onChange={e => setFormData({...formData, motDePasse: e.target.value})} 
                placeholder="••••••••" 
                required
              />
              <button type="button" className="btn-eye" onClick={togglePasswordVisibility}>
                {hidePassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={isLoading}>
            {!isLoading ? <span>S'inscrire</span> : <span>Création en cours...</span>}
          </button>

          <div className="toggle-mode">
            Déjà un compte ? <Link to="/login">Connectez-vous ici</Link>
          </div>
        </form>
      </div>
    </div>
  );
};