import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
import { chatService } from '../../services/chat.service';
import './Login.css';

export const LoginComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hidePassword, setHidePassword] = useState(true);
  const [messageErreur, setMessageErreur] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    motDePasse: ''
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      const id = searchParams.get('id') || '0';
      const role = searchParams.get('role') || 'ROLE_USER';
      const email = searchParams.get('email') || 'social_user@ia.com';
      const backend = searchParams.get('backend'); // 👉 On récupère l'identité du serveur

      AuthService.sauvegarderSession(token, role, email, id);
      
      // 👉 Si le serveur a déclaré son identité, on l'applique immédiatement
      if (backend === 'spring' || backend === 'django') {
        chatService.setBackend(backend as any);
      }

      navigate('/chat');
    }
  }, [searchParams, navigate]);
  
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessageErreur('');

    AuthService.login(formData.email, formData.motDePasse).subscribe({
      next: () => {
        navigate('/chat');
      },
      error: () => {
        setMessageErreur("Identifiants incorrects.");
      }
    });
  };

  const connexionSociale = (fournisseur: 'google' | 'github') => {
    const baseUrl = AuthService.getBaseUrl(); 
    const backend = chatService.getCurrentBackend();

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

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Adresse Email</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              placeholder="utilisateur@exemple.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-wrapper">
              <input 
                type={hidePassword ? 'password' : 'text'} 
                value={formData.motDePasse} 
                onChange={(e) => setFormData({...formData, motDePasse: e.target.value})} 
                placeholder="••••••••" 
                required 
              />
              <button type="button" className="btn-eye" onClick={() => setHidePassword(!hidePassword)}>
                {hidePassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit">Se Connecter</button>

          {/* 👉 LIEN RÉACTIVÉ VERS L'INSCRIPTION */}
          <div className="toggle-mode">
            Pas encore inscrit ? <Link to="/inscription">Créer un compte ici</Link>
          </div>
        </form>

        <div className="divider"><span>OU</span></div>

        <div className="social-login">
          <div className="social-buttons">
            <button type="button" className="btn-social google" onClick={() => connexionSociale('google')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" />
              Google
            </button>
            <button type="button" className="btn-social github" onClick={() => connexionSociale('github')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" alt="GitHub" />
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};