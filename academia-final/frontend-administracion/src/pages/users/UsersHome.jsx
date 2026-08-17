import { ArrowRight, UserCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import './users-home.css';

const modules = [
  {
    number: '01',
    icon: UserCheck,
    area: 'Directorio',
    title: 'Cuentas registradas',
    description: 'Buscar, revisar y editar las cuentas que ya tienen acceso a la plataforma.',
    to: '/usuarios/panorama?vista=accounts',
  },
  {
    number: '05',
    icon: UsersRound,
    area: 'Grupos y padrones',
    title: 'Estructura de grupos',
    description: 'Crear, editar o retirar grupos vacíos y definir su ubicación.',
    to: '/usuarios/grupos#estructura',
  },
];

export default function UsersHome() {
  return <div className="page admin-page users-home">
    <div className="page-heading">
      <div>
        <p className="eyebrow">users-service</p>
        <h1>Administración de usuarios</h1>
        <p>Cada función tiene un acceso independiente para evitar concentrar operaciones diferentes en un solo módulo.</p>
      </div>
    </div>

    <div className="users-home-grid">
      {modules.map((module) => {
        const Icon = module.icon;
        return <Link className="card users-home-card" to={module.to} key={module.number}>
          <header>
            <strong className="users-home-number">{module.number}</strong>
            <Icon />
          </header>
          <p className="eyebrow">{module.area}</p>
          <h2>{module.title}</h2>
          <p>{module.description}</p>
          <span>Abrir módulo <ArrowRight /></span>
        </Link>;
      })}
    </div>
  </div>;
}
