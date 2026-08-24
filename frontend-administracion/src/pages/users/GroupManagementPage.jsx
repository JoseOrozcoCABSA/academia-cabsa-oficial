import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Download, FileSpreadsheet, FolderPlus, RefreshCw } from 'lucide-react';
import { Button, Loader } from '@/components/common';
import { userDashboardService } from '@/services/userDashboardService';
import CentralBaseImport from './CentralBaseImport';
import ExcelAnalysis from './ExcelAnalysis';
import { GroupAnalytics, Groups } from './UserDashboard';
import './user-dashboard.css';
import './excel-analysis.css';

const downloadRosterTemplate = () => {
  const content = '\uFEFFNombre,Correo,Código de beca,RFC,Usuario,Correo oficial\nMaría López,maria.lopez@ejemplo.com,BECA-2026-001,LOPM900101ABC,mlopez,maria.lopez@institucion.mx\n';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla-padron-grupo.csv';
  link.click();
  URL.revokeObjectURL(url);
};

export default function GroupManagementPage() {
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, analyticsData] = await Promise.all([
        userDashboardService.overview(),
        userDashboardService.groupAnalytics(),
      ]);
      setOverview(overviewData);
      setAnalytics(analyticsData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los grupos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const stats = new Map(analytics.map((row) => [String(row.grupo_id), row]));
    return (overview?.groups || []).map((group) => ({
      ...group,
      ...(stats.get(String(group.id)) || {}),
    }));
  }, [analytics, overview]);

  const saved = async (message) => {
    setManagerOpen(false);
    setNotice(message);
    await load();
  };

  if (loading && !overview) {
    return <div className="page admin-page"><section className="card"><Loader label="Preparando grupos y padrones" /></section></div>;
  }

  return <div className="page admin-page user-dashboard group-management-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">Usuarios · Grupos y padrones</p>
        <h1>Administración de grupos</h1>
        <p>Cada bloque tiene una responsabilidad: estructura del grupo, base central, padrón vigente y análisis. Las cuentas individuales se editan únicamente desde el directorio.</p>
      </div>
      <div className="user-actions">
        <Button onClick={() => setManagerOpen(true)}><FolderPlus /> Crear o editar grupo</Button>
        <Button variant="secondary" onClick={load}><RefreshCw /> Actualizar grupos</Button>
      </div>
    </div>

    {error && <div className="alert alert--error">{error}</div>}
    {notice && <div className="source-note">{notice}</div>}

    <nav className="group-workflow" aria-label="Flujo de administración de grupos">
      <a href="#estructura"><strong>1</strong><span>Estructura<small>Crear, editar o retirar grupos vacíos</small></span></a>
      <a href="#base-central"><strong>2</strong><span>Base central<small>Actualizar el catálogo de referencia</small></span></a>
      <a href="#padrones"><strong>3</strong><span>Padrones<small>Cargar, comparar y restaurar archivos</small></span></a>
      <a href="#resultados"><strong>4</strong><span>Resultados<small>Medir registro y cobertura</small></span></a>
    </nav>

    <section id="estructura" className="card group-function-block">
      <header><FolderPlus /><div><p className="eyebrow">Bloque 1 · Estructura</p><h2>Creación y mantenimiento de grupos</h2><p>Define nombre, descripción y ubicación. Un grupo nuevo requiere su archivo de origen para evitar estructuras vacías o ambiguas.</p></div><Button onClick={() => setManagerOpen(true)}>Administrar grupos</Button></header>
      <section className="roster-template-guide">
        <header><FileSpreadsheet /><div><strong>Ejemplo del Excel para crear un grupo</strong><small>La primera fila debe contener los nombres de las columnas. Se procesa la primera hoja del archivo.</small></div><Button variant="secondary" onClick={downloadRosterTemplate}><Download /> Descargar ejemplo CSV</Button></header>
        <div className="roster-template-columns">
          <div><strong>RFC</strong><span>Identificador principal y recomendado.</span></div>
          <div><strong>Correo</strong><span>Identificador alternativo de la persona.</span></div>
          <div><strong>Código de beca</strong><span>Identificador alternativo para relacionar la beca.</span></div>
          <div><strong>Nombre</strong><span>Dato recomendado para reconocer a la persona.</span></div>
          <div><strong>Usuario</strong><span>Dato opcional de referencia.</span></div>
          <div><strong>Correo oficial</strong><span>Dato opcional adicional.</span></div>
        </div>
        <p><strong>Regla obligatoria:</strong> incluye al menos una columna <code>RFC</code>, <code>Correo</code> o <code>Código de beca</code>. Para mejores coincidencias incluye las tres cuando estén disponibles.</p>
      </section>
      <div className="group-structure-summary"><strong>{groups.length}</strong><span>grupos configurados</span><strong>{groups.filter((group) => Number(group.padron_total)).length}</strong><span>con padrón vigente</span></div>
    </section>

    <section id="base-central" className="group-function-block">
      <header className="card"><Database /><div><p className="eyebrow">Bloque 2 · Referencia</p><h2>Base central de personas</h2><p>Esta carga sirve únicamente para comparar identidades; no crea cuentas, grupos ni membresías.</p></div></header>
      <CentralBaseImport onImported={load} />
    </section>

    <section id="padrones" className="group-function-block">
      <header className="card"><Database /><div><p className="eyebrow">Bloque 3 · Operación</p><h2>Padrón vigente y acciones grupales</h2><p>Selecciona un solo grupo para importar, consultar, restaurar o aplicar acciones sobre sus becas.</p></div></header>
      <ExcelAnalysis groups={groups} onGroupsChanged={load} />
    </section>

    <section id="resultados" className="group-function-block">
      <GroupAnalytics groups={groups} loading={loading} error={error} retry={load} />
    </section>

    <Groups open={managerOpen} groups={groups} close={() => setManagerOpen(false)} saved={saved} />
  </div>;
}
