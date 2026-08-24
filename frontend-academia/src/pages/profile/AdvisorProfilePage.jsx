import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { toast } from 'react-toastify';
import '../../auth-cabsa.css';

export const AdvisorProfilePage = () => {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/advisor/profile');
      setProfileData({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        email: response.data.email || '',
        username: response.data.username || ''
      });
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Error al cargar los datos del perfil');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        username: profileData.username
      };

      await api.put('/advisor/profile', updateData);
      toast.success('Perfil actualizado exitosamente');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchProfileData(); // Reset to original data
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h2 className="card-title">Perfil del Asesor</h2>
        
        <div className="profile-info">
          <div className="profile-header">
            <h3>Información Personal</h3>
            {!isEditing ? (
              <button 
                className="btn btn-primary" 
                onClick={() => setIsEditing(true)}
                style={{ marginBottom: '1rem' }}
              >
                Editar Perfil
              </button>
            ) : (
              <div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleCancel}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="firstName">Nombres:</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Apellidos:</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Correo Electrónico:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">Nombre de Usuario:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={profileData.username}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="profile-item">
                <span className="profile-label">Nombres:</span>
                <span className="profile-value">{profileData.firstName}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Apellidos:</span>
                <span className="profile-value">{profileData.lastName}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Correo Electrónico:</span>
                <span className="profile-value">{profileData.email}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Nombre de Usuario:</span>
                <span className="profile-value">{profileData.username}</span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button 
            className="btn btn-logout" 
            onClick={handleLogout}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};