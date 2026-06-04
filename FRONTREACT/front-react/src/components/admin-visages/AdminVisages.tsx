import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { serveurService } from '../../services/serveur.service';
import { apiFetch } from '../../services/jwt.interceptor';

export const AdminVisages: React.FC = () => {
  const navigate = useNavigate();
  const [visages, setVisages] = useState<any[]>([]);
  const [imageZoomee, setImageZoomee] = useState<number | null>(null);

  // 👉 Nouveaux états pour les filtres
  const [filtreId, setFiltreId] = useState('');
  const [filtreNom, setFiltreNom] = useState('');
  const [filtreChemin, setFiltreChemin] = useState('');

  const chargerVisages = async () => {
    try {
      const res = await apiFetch(`${serveurService.getApiUrl()}/visages`);
      const data = await res.json();
      setVisages(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { chargerVisages(); }, []);

  const getUrlImage = (chemin: string) => {
    if (!chemin) return '';
    // Extraire uniquement le nom du fichier (ex: brad_pitt.jpg)
    const nomFichier = chemin.split('/').pop()?.split('\\').pop();
    // Enlever /api à la fin de l'URL du serveur si nécessaire
    const rootUrl = serveurService.getApiUrl().replace(/\/api$/, '');
    const isDjango = serveurService.getBackend() === 'django';
    // Construire le chemin propre
    return isDjango ? `${rootUrl}/media/visages/${nomFichier}` : `${rootUrl}/uploads/visages/${nomFichier}`;
  };

  const supprimerVisage = async (id: number) => {
    if(window.confirm('Supprimer ce visage effacera aussi son vecteur IA. Continuer ?')) {
      const suffix = serveurService.getBackend() === 'django' ? '/' : '';
      await apiFetch(`${serveurService.getApiUrl()}/visages/${id}${suffix}`, { method: 'DELETE' });
      chargerVisages();
    }
  };

  // 👉 Logique de filtrage en temps réel
  const visagesFiltres = visages.filter(v => {
    const cheminDB = v.chemin_image || v.cheminImage || '';
    const matchId = v.id.toString().includes(filtreId);
    const matchNom = v.nom.toLowerCase().includes(filtreNom.toLowerCase());
    const matchChemin = cheminDB.toLowerCase().includes(filtreChemin.toLowerCase());
    return matchId && matchNom && matchChemin;
  });

  return (
    <div className="crud-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Base Biométrique (FAISS)</h3>
        <Link to="/admin/visages/nouveau" className="btn-submit" style={{ width: 'auto', margin: 0, textDecoration: 'none', display: 'inline-block' }}>➕ Ajouter Visage</Link>
      </div>

      {/* 👉 BARRE DE FILTRES */}
      <div className="filter-row">
        <div className="filter-group">
          <label>🔍 Recherche ID</label>
          <input type="text" placeholder="Ex: 5" value={filtreId} onChange={e => setFiltreId(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>👤 Nom Complet</label>
          <input type="text" placeholder="Ex: Brad Pitt" value={filtreNom} onChange={e => setFiltreNom(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>📁 Chemin / Fichier</label>
          <input type="text" placeholder="Ex: brad_pitt.jpg" value={filtreChemin} onChange={e => setFiltreChemin(e.target.value)} />
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>Photo</th><th>ID IA</th><th>Nom Complet</th><th>Chemin DB</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {visagesFiltres.map(v => (
            <tr key={v.id}>
              <td>
                <img 
                  src={getUrlImage(v.chemin_image || v.cheminImage)} 
                  alt="Visage" 
                  className={`visage-thumbnail ${imageZoomee === v.id ? 'zoom' : ''}`}
                  onClick={() => setImageZoomee(imageZoomee === v.id ? null : v.id)}
                  style={{ width: '50px', height: '50px', borderRadius: '5px', cursor: 'pointer', objectFit: 'cover' }}
                />
              </td>
              <td>#{v.id}</td>
              <td>{v.nom}</td>
              <td style={{ fontSize: '12px', color: '#64748b' }}>{v.chemin_image || v.cheminImage}</td>
              <td>
                <button onClick={() => navigate(`/admin/visages/modifier/${v.id}`)} className="btn-action btn-edit">✏️ Modifier</button>
                <button className="btn-action btn-delete" onClick={() => supprimerVisage(v.id)}>🗑️ Supprimer</button>
              </td>
            </tr>
          ))}
          {visagesFiltres.length === 0 && (
            <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>Aucun visage trouvé.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};