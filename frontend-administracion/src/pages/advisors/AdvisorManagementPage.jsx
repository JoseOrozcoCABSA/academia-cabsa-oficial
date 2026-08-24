import { useCallback, useEffect, useState } from "react";
import { UserPlus, RefreshCw, Edit } from "lucide-react";
import { Button, Input } from "@/components/common";
import { advisorService } from "@/services/advisorService";
import "./advisor-pages.css";

const empty = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  passwordConfirmation: "",
};

const emptyEdit = {
  fullName: "",
  email: "",
  username: "",
};

export default function AdvisorManagementPage() {
  const [form, setForm] = useState(empty),
    [advisors, setAdvisors] = useState([]);
  const [message, setMessage] = useState(null),
    [saving, setSaving] = useState(false),
    [editing, setEditing] = useState(null);
  const load = useCallback(
    () =>
      advisorService
        .list()
        .then(setAdvisors)
        .catch((error) => setMessage({ error: true, text: error.message })),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const changeEdit = (key) => (event) =>
    setEditing((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await advisorService.create(form);
      setForm(empty);
      setMessage({
        text: "Asesor creado. Ya puede entrar al portal administrativo.",
      });
      await load();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    } finally {
      setSaving(false);
    }
  };
  const submitEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await advisorService.update(editing.id, editing);
      setEditing(null);
      setMessage({
        text: "Asesor actualizado correctamente.",
      });
      await load();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (advisor) => {
    const status = advisor.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await advisorService.setStatus(advisor.id, status);
      await load();
    } catch (error) {
      setMessage({ error: true, text: error.message });
    }
  };
  const startEdit = (advisor) => {
    setEditing({
      id: advisor.id,
      fullName: advisor.displayName,
      email: advisor.email,
      username: advisor.username,
    });
  };
  const cancelEdit = () => {
    setEditing(null);
  };
  return (
    <div className="page admin-page advisor-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Usuarios y acceso</p>
          <h1>Asesores</h1>
          <p>
            Crea responsables con acceso limitado. El administrador conserva la
            supervisión de todos sus grupos y altas.
          </p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw /> Actualizar
        </Button>
      </div>
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
            <UserPlus /> Nuevo asesor
          </h2>
          <form onSubmit={submit}>
            <Input
              label="Nombre completo"
              value={form.fullName}
              onChange={change("fullName")}
              required
            />
            <Input
              label="Correo"
              type="email"
              value={form.email}
              onChange={change("email")}
              required
            />
            <Input
              label="Usuario"
              value={form.username}
              onChange={change("username")}
              required
            />
            <div className="advisor-form-row">
              <Input
                label="Contraseña"
                type="password"
                value={form.password}
                onChange={change("password")}
                required
              />
              <Input
                label="Confirmar"
                type="password"
                value={form.passwordConfirmation}
                onChange={change("passwordConfirmation")}
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Creando…" : "Crear asesor"}
            </Button>
          </form>
        </section>
        {editing && (
          <section className="card advisor-form">
            <h2>
              <Edit /> Editar asesor
            </h2>
            <form onSubmit={submitEdit}>
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
        <section className="card">
          <h2>Asesores registrados ({advisors.length})</h2>
          <div className="advisor-list">
            {advisors.map((advisor) => (
              <article key={advisor.id} className="advisor-row">
                <div>
                  <strong>{advisor.displayName}</strong>
                  <span>
                    {advisor.email} · @{advisor.username}
                  </span>
                  <small>
                    {advisor.groupCount || 0} grupos · {advisor.userCount || 0}{" "}
                    usuarios
                    {advisor.groupNames ? ` · ${advisor.groupNames}` : ""}
                  </small>
                </div>
                <div className="advisor-actions">
                  <button
                    type="button"
                    className="status-action"
                    onClick={() => startEdit(advisor)}
                  >
                    <Edit /> Editar
                  </button>
                  <button
                    type="button"
                    className={`status-action ${advisor.status === "ACTIVE" ? "" : "is-inactive"}`}
                    onClick={() => toggle(advisor)}
                  >
                    {advisor.status === "ACTIVE" ? "Suspender" : "Reactivar"}
                  </button>
                </div>
              </article>
            ))}
            {!advisors.length && (
              <p className="empty-copy">Todavía no hay asesores.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
