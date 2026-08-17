/**
 * @file Componente `Login`.
 *
 *
 * Requiere sesión: lee el usuario del contexto de autenticación.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Input } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
/**
 * Inicio de sesion del panel.
 *
 * Sin casilla de «recordarme»: la sesion se guarda siempre en `localStorage`.
 * Que el usuario tenga rol suficiente lo comprueba la guarda de ruta despues,
 * asi que una cuenta sin permisos entra y luego se le niega el acceso.
 */
export default function Login() {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  /**
   * Autentica y vuelve al destino interceptado por la guarda, o al inicio.
   */
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const session = await login(identity, password);
      const isAdvisor = (session.user?.roles || []).some((role) =>
        ["ADVISOR", "ASESOR", "advisor"].includes(String(role)),
      );
      navigate(location.state?.from || (isAdvisor ? "/asesor" : "/"), {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="auth-card">
      <span className="auth-icon">
        <ShieldCheck />
      </span>
      <p className="eyebrow">Administración segura</p>
      <h2>Centro de control CABSA</h2>
      <p>Accede a la operación de los seis servicios SOA.</p>
      <form onSubmit={submit}>
        <Input
          label="Usuario o correo"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="alert alert--error">{error}</div>}
        <Button disabled={loading} type="submit">
          {loading ? "Ingresando…" : "Ingresar"} <ArrowRight />
        </Button>
      </form>
      <small className="auth-note">
        Las acciones realizadas quedan vinculadas al usuario autenticado.
      </small>
    </div>
  );
}
