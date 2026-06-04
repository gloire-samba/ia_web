import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { serveurService } from '../../services/serveur.service';
import { authService } from '../../services/auth.service';
import { apiFetch } from '../../services/jwt.interceptor'; // 👉 Important pour les requêtes JSON sécurisées
import './AdminVisageForm.css';

export const AdminVisageForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [nom, setNom] = useState('');
  const [chemin, setChemin] = useState(''); // 👉 Nouveau champ
  const [fichier, setFichier] = useState<File | null>(null);

  // 👉 Récupération des données si on est en mode Modification
  useEffect(() => {
    if (isEdit) {
      apiFetch(`${serveurService.getApiUrl()}/visages`)
        .then(res => res.json())
        .then(data => {
          const visageActuel = data.find((x: any) => x.id.toString() === id);
          if (visageActuel) {
            setNom(visageActuel.nom);
            setChemin(visageActuel.chemin_image || visageActuel.cheminImage);
          }
        });
    }
  }, [isEdit, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDjango = serveurService.getBackend() === 'django';
    
    try {
      if (isEdit) {
        // 👉 REQUÊTE DE MODIFICATION (PUT)
        const endpoint = isDjango ? `/visages/${id}/` : `/visages/${id}`;
        await apiFetch(`${serveurService.getApiUrl()}${endpoint}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom, chemin_image: chemin })
        });
        alert('Modifications sauvegardées avec succès !');
        navigate('/admin/visages');

      } else {
        // 👉 REQUÊTE D'AJOUT (POST MULTIPART avec Token manuel)
        if (!fichier || !nom) return;
        const formData = new FormData();
        formData.append('nom', nom);
        formData.append('image', fichier);

        const endpoint = isDjango ? '/visages/' : '/visages/ajouter';
        
        // On utilise fetch classique ici car formData gère son propre Content-Type
        const res = await fetch(`${serveurService.getApiUrl()}${endpoint}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authService.getToken()}` }, // Fix du 401
          body: formData 
        });
        
        if (!res.ok) throw new Error("Erreur serveur");
        alert('Visage encodé et ajouté à la base de données IA !');
        navigate('/admin/visages');
      }
    } catch (err) {
      alert('Erreur technique lors de la transaction.');
    }
  };

  return (
    <div className="login-box" style={{ margin: '2rem auto' }}>
      <h2>{isEdit ? 'Modifier' : 'Ajouter'} un Visage</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nom Complet</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} required />
        </div>
        
        {isEdit ? (
          <div className="form-group">
            <label>Chemin de l'image (Base de données)</label>
            <input type="text" value={chemin} onChange={e => setChemin(e.target.value)} required />
          </div>
        ) : (
          <div className="form-group">
            <label>Photo du visage</label>
            <input type="file" onChange={e => setFichier(e.target.files ? e.target.files[0] : null)} accept="image/png, image/jpeg" required />
          </div>
        )}
        
        <button type="submit" className="btn-submit">
          {isEdit ? 'Sauvegarder les modifications' : 'Sauvegarder et Synchroniser IA'}
        </button>
      </form>
    </div>
  );
};