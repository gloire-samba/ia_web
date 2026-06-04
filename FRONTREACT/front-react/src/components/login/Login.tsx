import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { serveurService } from '../../services/serveur.service';
import './Login.css'; // Identique à celui d'Angular

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [messageErreur, setMessageErreur] = useState('');

  // Gestion du retour OAuth2 (Social Login)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      const id = searchParams.get('id') || '0';
      const role = searchParams.get('role') || 'ROLE_USER';
      const userEmail = searchParams.get('email') || 'social_user@ia.com';
      const backend = searchParams.get('backend');

      authService.sauvegarderSession(token, role, userEmail, id);

      if (backend === 'spring' || backend === 'django') {
        serveurService.setBackend(backend as any);
      }
      
      // 👉 REDIRECTION INTELLIGENTE (OAUTH)
      if (role === 'ROLE_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMessageErreur('');

    try {
      await authService.login(email, motDePasse);
      
      // 👉 REDIRECTION INTELLIGENTE (CLASSIQUE)
      if (authService.getRole() === 'ROLE_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    } catch (error) {
      setMessageErreur("Identifiants incorrects.");
    }
  };

  const loginAsAdmin = async () => {
    setEmail('admin@ia.com');
    setMotDePasse('admin123');
    try {
      // On bypass le state et on envoie directement les identifiants
      const data = await authService.login('admin@ia.com', 'admin123');
      if (data.role === 'ROLE_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    } catch (error) {
      setMessageErreur("Identifiants incorrects.");
    }
  };

  const connexionSociale = (fournisseur: 'google' | 'github') => {
    const baseUrl = authService.getBaseUrl();
    const backend = serveurService.getBackend();

    if (backend === 'django') {
      window.location.href = `${baseUrl}/auth/${fournisseur}/login/?frontend=react`;
    } else {
      window.location.href = `${baseUrl}/auth/init-social?fournisseur=${fournisseur}&frontend=react`;
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Connexion à l'IA</h2>
        
        {messageErreur && <div className="alert error">{messageErreur}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Adresse Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-wrapper">
              <input 
                type={hidePassword ? "password" : "text"} 
                value={motDePasse} 
                onChange={e => setMotDePasse(e.target.value)} 
                required 
              />
              <button type="button" className="btn-eye" onClick={() => setHidePassword(!hidePassword)}>
                {hidePassword ? '👁️' : '🙈'}
              </button>
            </div>
            
            <button type="button" className="btn-submit" style={{ backgroundColor: '#ef4444', marginTop: '10px' }} onClick={loginAsAdmin}>
              👑 Connexion Rapide Admin
            </button>
          </div>

          <button type="submit" className="btn-submit">Se Connecter</button>
        </form>

        <div className="divider"><span>OU</span></div>

        <div className="social-login">
          <div className="social-buttons">
            <button type="button" className="btn-social google" onClick={() => connexionSociale('google')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google"/>
              Google
            </button>
            <button type="button" className="btn-social github" onClick={() => connexionSociale('github')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" alt="GitHub"/>
              GitHub
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};