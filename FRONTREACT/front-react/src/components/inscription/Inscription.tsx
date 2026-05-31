import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; 

    setIsLoading(true);
    setMessageErreur('');
    
    AuthService.register(formData)
      .then(() => {
        return new Promise<void>((resolve, reject) => {
          AuthService.login(formData.email, formData.motDePasse).subscribe({
            next: () => resolve(),
            error: (err) => reject(err)
          });
        });
      })
      .then(() => {
        setIsLoading(false);
        navigate('/chat');
      })
      .catch((err) => {
        setIsLoading(false);
        setMessageErreur(err.message || "Erreur lors de l'inscription.");
      });
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
            {!isLoading && <span>S'inscrire</span>}
            {isLoading && <span>Création en cours...</span>}
          </button>

          <div className="toggle-mode">
            Déjà un compte ? <Link to="/login">Connectez-vous ici</Link>
          </div>
        </form>
      </div>
    </div>
  );
};