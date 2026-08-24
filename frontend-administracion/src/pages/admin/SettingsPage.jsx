import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Network } from 'lucide-react';
import { Card, Loader } from '@/components/common';
import { apiClient } from '@/services/apiClient';

/** Estado operativo real de los servicios, consultado a traves del gateway. */
export default function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient('/services/health').then(setHealth).catch((requestError) => setError(requestError.message));
  }, []);
  return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">Sistema local</p><h1>Configuración</h1><p>Estado actual de integración del entorno Academia CABSA.</p></div></div>{error&&<div className="alert alert--error">{error}</div>}{!health&&!error?<Loader label="Consultando servicios" />:<section className="settings-grid">{health?.services?.map((service)=>{const available=service.status==='ok';return <Card key={service.key}><Network/><div><h3>{service.name}</h3><p>{available?`Disponible · ${service.latencyMs} ms`:'No disponible'}</p></div>{available?<CheckCircle2 className="ok" aria-label="Disponible"/>:<CircleAlert className="error" aria-label="No disponible"/>}</Card>})}</section>}</div>;
}
