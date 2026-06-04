import React, { useState, useEffect } from 'react';
import { utilisateurService } from '../../services/utilisateur.service';
import { authService } from '../../services/auth.service';

export const AdminUtilisateurs: React.FC = () => {
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  
  // 👉 Nouveaux états pour les filtres
  const [filtreId, setFiltreId] = useState('');
  const [filtreEmail, setFiltreEmail] = useState('');
  const [filtreRole, setFiltreRole] = useState('');

  const chargerUtilisateurs = async () => {
    try {
      const data = await utilisateurService.getTous();
      const currentEmail = authService.getUserFromStorage()?.email;
      const liste = data.results || data.content || data._embedded?.utilisateurs || data;
      setUtilisateurs(liste.filter((u: any) => u.email !== currentEmail));
    } catch (err) {
      console.error("Erreur chargement utilisateurs", err);
    }
  };

  useEffect(() => { chargerUtilisateurs(); }, []);

  const changerRole = async (id: number, nouveauRole: string) => {
    if(window.confirm(`Confirmer le changement de rôle ?`)) {
      await utilisateurService.modifierRole(id, nouveauRole);
      chargerUtilisateurs();
    }
  };

  const supprimerUtilisateur = async (id: number) => {
    if(window.confirm('Es-tu sûr de vouloir supprimer cet utilisateur ?')) {
      await utilisateurService.supprimer(id);
      chargerUtilisateurs();
    }
  };

  // 👉 Logique de filtrage en temps réel
  const utilisateursFiltres = utilisateurs.filter(u => {
    const matchId = u.id.toString().includes(filtreId);
    const matchEmail = u.email.toLowerCase().includes(filtreEmail.toLowerCase());
    const matchRole = filtreRole === '' || u.role === filtreRole;
    return matchId && matchEmail && matchRole;
  });

  return (
    <div className="crud-section">
      <div className="section-header">
        <h3>Gestion des Utilisateurs</h3>
      </div>

      {/* 👉 BARRE DE FILTRES */}
      <div className="filter-row">
        <div className="filter-group">
          <label>🔍 Recherche par ID</label>
          <input type="text" placeholder="Ex: 15" value={filtreId} onChange={e => setFiltreId(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>📧 Recherche par Email</label>
          <input type="text" placeholder="Ex: jean@mail.com" value={filtreEmail} onChange={e => setFiltreEmail(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>🛡️ Filtrer par Rôle</label>
          <select value={filtreRole} onChange={e => setFiltreRole(e.target.value)}>
            <option value="">Tous les rôles</option>
            <option value="ROLE_USER">Utilisateurs (USERS)</option>
            <option value="ROLE_ADMIN">Administrateurs (ADMIN)</option>
          </select>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>ID</th><th>Email</th><th>Rôle</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {utilisateursFiltres.map(u => (
            <tr key={u.id}>
              <td>#{u.id}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => changerRole(u.id, e.target.value)}>
                  <option value="ROLE_USER">Utilisateur</option>
                  <option value="ROLE_ADMIN">Administrateur</option>
                </select>
              </td>
              <td>
                <button className="btn-action btn-delete" onClick={() => supprimerUtilisateur(u.id)}>🚫 Bannir</button>
              </td>
            </tr>
          ))}
          {utilisateursFiltres.length === 0 && (
            <tr><td colSpan={4} style={{textAlign: 'center', padding: '20px'}}>Aucun utilisateur trouvé.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};