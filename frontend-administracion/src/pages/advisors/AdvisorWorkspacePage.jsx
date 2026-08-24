import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Users, KeyRound, Edit } from "lucide-react";
import { Button, Input } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { advisorService } from "@/services/advisorService";
import "./advisor-pages.css";

const groupInitial = { name: "", description: "" };
const userInitial = {
  groupId: "",
  fullName: "",
  email: "",
  username: "",
  password: "",
  passwordConfirmation: "",
  scholarshipLevel: "",
  activationMode: "DIRECT",
  durationDays: "365",
  expiresAt: "",
};
const editInitial = {
  fullName: "",
  email: "",
  username: "",
};
const adminRoles = ["ADMIN", "SUPER_ADMIN", "administrator"];

export default function AdvisorWorkspacePage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).some((role) =>
    adminRoles.includes(String(role)),
  );
  const [advisors, setAdvisors] = useState([]),
    [advisorId, setAdvisorId] = useState("");
  const [workspace, setWorkspace] = useState({ groups: [], users: [], scholarshipLevels: [] }),
    [group, setGroup] = useState(groupInitial),
    [account, setAccount] = useState(userInitial),
    [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const result = await advisorService.workspace(isAdmin ? advisorId : "");
      setWorkspace(result);
      setAccount((current) => ({
        ...current,
        scholarshipLevel: result.scholarshipLevels?.some((level) => String(level.id) === String(current.scholarshipLevel))
          ? current.scholarshipLevel
          : String(result.scholarshipLevels?.[0]?.id || ""),
      }));
    } catch (error) {
      setMessage({ error: true, text: error.message });
    }
  }, [advisorId, isAdmin]);
  useEffect(() => {
    if (isAdmin)
      advisorService
        .list()
        .then(setAdvisors)
        .catch(() => {});
  }, [isAdmin]);
  useEffect(() => {
    load();
  }, [load]);
  const ownerPayload = useMemo(
    () => (isAdmin ? { advisorId } : {}),
    [advisorId, isAdmin],
  );
  const createGroup = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await advisorService.createGroup({ ...group, ...ownerPayload });
      setGroup(groupInitial);
      setMessage({ text: "Grupo creado y asignado al asesor." });
      await load();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    } finally {
      setSaving(false);
    }
  };
  const createUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await advisorService.createUser({
        ...account,
        ...ownerPayload,
        durationDays: account.expiresAt
          ? undefined
          : Number(account.durationDays || 0),
      });
      setAccount({ ...userInitial, scholarshipLevel: String(workspace.scholarshipLevels?.[0]?.id || "") });
      setMessage({
        text: result.scholarshipActive
          ? "Usuario creado con la beca activa."
          : `Usuario creado. Codigo para entregar: ${result.code}`,
      });
      await load();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    } finally {
      setSaving(false);
    }
  };
  const toggleUser = async (managed) => {
    try {
      await advisorService.setUserStatus(
        managed.id,
        managed.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
        isAdmin ? managed.advisorId : "",
      );
      await load();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    }
  };
  const field = (setter, key) => (event) =>
    setter((current) => ({ ...current, [key]: event.target.value }));
  
  const changeEdit = (key) => (event) =>
    setEditing((current) => ({ ...current, [key]: event.target.value }));
  
  const submitEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await advisorService.updateUser(editing.id, {
        groupId: editing.groupId,
        fullName: editing.fullName,
        email: editing.email,
        username: editing.username,
        ...ownerPayload,
      });
      setEditing(null);
      setMessage({
        text: "Usuario actualizado correctamente.",
      });
      await load();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    } finally {
      setSaving(false);
    }
  };
  
  const startEdit = (managed) => {
    setEditing({
      id: managed.id,
      groupId: String(managed.groupId),
      fullName: managed.displayName,
      email: managed.email,
      username: managed.username,
    });
  };
  
  const cancelEdit = () => {
    setEditing(null);
  };
  const canCreate = !isAdmin || Boolean(advisorId);
  return (
    <div className="page admin-page advisor-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Gestión delegada</p>
          <h1>Usuarios, grupos y becas</h1>
          <p>
            Las altas quedan vinculadas al asesor. La beca puede quedar activa
            inmediatamente o entregarse mediante código.
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw /> Actualizar
        </Button>
      </div>
      {isAdmin && (
        <section className="card advisor-owner">
          <label>
            Revisar el espacio de un asesor
            <select
              value={advisorId}
              onChange={(event) => setAdvisorId(event.target.value)}
            >
              <option value="">Todos (solo consulta)</option>
              {advisors.map((advisor) => (
                <option value={advisor.id} key={advisor.id}>
                  {advisor.displayName} · {advisor.email}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      
      {editing && (
        <section className="card advisor-form">
          <h2>
            <Edit /> Editar usuario
          </h2>
          <form onSubmit={submitEdit}>
            <label>
              Grupo
              <select value={editing.groupId} onChange={changeEdit("groupId")} required>
                <option value="">Seleccionar...</option>
                {workspace.groups.map((item) => (
                  <option value={item.id} key={`${item.advisorId}-${item.id}`}>{item.name}</option>
                ))}
              </select>
            </label>
            <Input
              label="Nombre completo"
              value={editing.fullName}
              onChange={changeEdit("fullName")}
              required
            />
            <Input
              label="Correo"
              type="email"
              value={editing.email}
              onChange={changeEdit("email")}
              required
            />
            <Input
              label="Usuario"
              value={editing.username}
              onChange={changeEdit("username")}
              required
            />
            <div className="advisor-form-row">
              <Button type="button" onClick={cancelEdit}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </section>
      )}
      {message && (
        <div
          className={`alert ${message.error ? "alert--error" : "alert--success"}`}
        >
          {message.text}
        </div>
      )}
      <div className="advisor-columns">
        <section className="card advisor-form">
          <h2>
            <Users /> Crear grupo
          </h2>
          <form onSubmit={createGroup}>
            <Input
              label="Nombre del grupo"
              value={group.name}
              onChange={field(setGroup, "name")}
              required
            />
            <label>
              Descripción
              <textarea
                value={group.description}
                onChange={field(setGroup, "description")}
                rows="3"
              />
            </label>
            <Button type="submit" disabled={saving || !canCreate}>
              Crear grupo
            </Button>
          </form>
        </section>
        <section className="card advisor-form">
          <h2>
            <KeyRound /> Crear usuario y beca
          </h2>
          <form onSubmit={createUser}>
            <label>
              Grupo
              <select
                required
                value={account.groupId}
                onChange={field(setAccount, "groupId")}
              >
                <option value="">Seleccionar...</option>
                {workspace.groups.map((item) => (
                  <option value={item.id} key={`${item.advisorId}-${item.id}`}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Nombre completo"
              value={account.fullName}
              onChange={field(setAccount, "fullName")}
              required
            />
            <div className="advisor-form-row">
              <Input
                label="Correo"
                type="email"
                value={account.email}
                onChange={field(setAccount, "email")}
                required
              />
              <Input
                label="Usuario"
                value={account.username}
                onChange={field(setAccount, "username")}
                required
              />
            </div>
            <div className="advisor-form-row">
              <Input
                label="Contraseña"
                type="password"
                value={account.password}
                onChange={field(setAccount, "password")}
                required
              />
              <Input
                label="Confirmar"
                type="password"
                value={account.passwordConfirmation}
                onChange={field(setAccount, "passwordConfirmation")}
                required
              />
            </div>
            <div className="advisor-form-row">
              <label>
                Tipo de beca
                <select
                  required
                  value={account.scholarshipLevel}
                  onChange={field(setAccount, "scholarshipLevel")}
                >
                  <option value="">Seleccionar tipo de beca...</option>
                  {workspace.scholarshipLevels.map((level) => (
                    <option value={level.id} key={level.id}>{level.name}</option>
                  ))}
                </select>
                {!workspace.scholarshipLevels.length && <small>No hay tipos de beca configurados.</small>}
              </label>
              <label>
                Activación
                <select
                  value={account.activationMode}
                  onChange={field(setAccount, "activationMode")}
                >
                  <option value="DIRECT">Activar directamente</option>
                  <option value="CODE">Entregar código</option>
                </select>
              </label>
            </div>
            <div className="advisor-form-row">
              <Input
                label="Duración (días; vacío = indefinida)"
                type="number"
                min="1"
                max="3650"
                value={account.durationDays}
                onChange={field(setAccount, "durationDays")}
              />
              <Input
                label="O fecha exacta"
                type="date"
                value={account.expiresAt}
                onChange={field(setAccount, "expiresAt")}
              />
            </div>
            <Button type="submit" disabled={saving || !canCreate}>
              {saving ? "Guardando..." : "Crear usuario"}
            </Button>
          </form>
        </section>
      </div>
      <section className="card">
        <h2>Usuarios gestionados ({workspace.users.length})</h2>
        <div className="advisor-list">
          {workspace.users.map((managed) => (
            <article className="advisor-row" key={managed.id}>
              <div>
                <strong>{managed.displayName}</strong>
                <span>
                  {managed.email} -{" "}
                  {managed.scholarshipName ||
                    `Beca ${managed.scholarshipLevel}`}
                </span>
                <small>
                  Grupo: {managed.groupName || managed.groupId} -{" "}
                  {managed.activationMode === "CODE" &&
                  !managed.scholarshipActive
                    ? `Pendiente de activar: ${managed.code}`
                    : "Beca activa"}{" "}
                  - Vence:{" "}
                  {managed.expiresAt?.slice(0, 10) || "sin vencimiento"}
                </small>
              </div>
              <button className="status-action" type="button" onClick={() => startEdit(managed)}>
                <Edit /> Editar
              </button>
              <button
                className={`status-action ${managed.status === "ACTIVE" ? "" : "is-inactive"}`}
                type="button"
                onClick={() => toggleUser(managed)}
              >
                {managed.status === "ACTIVE" ? "Suspender" : "Reactivar"}
              </button>
            </article>
          ))}
          {!workspace.users.length && (
            <p className="empty-copy">No hay usuarios en este alcance.</p>
          )}
        </div>
      </section>
    </div>
  );
}
