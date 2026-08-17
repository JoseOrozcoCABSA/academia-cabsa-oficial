import { Link } from 'react-router-dom';
import verticalLogo from '@/assets/logo/logo-vertical.svg';
import '@/components/public/header-footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-column footer-legal">
          <h3>Legal</h3>
          <ul>
            <li><Link to="/terminos">Términos y condiciones</Link></li>
            <li><Link to="/aviso-privacidad">Aviso de privacidad</Link></li>
          </ul>
        </div>

        <div className="footer-logo">
          <figure><img src={verticalLogo} alt="Academia CABSA" /></figure>
        </div>

        <div className="footer-column footer-support">
          <h3>Contacto y Soporte</h3>
          <ul>
            <li><Link to="/soporte">Formulario de soporte</Link></li>
            <li><Link to="/documentacion">Documentación</Link></li>
            <li>
              <a href="https://api.whatsapp.com/send?phone=525521173227&text=Hola" target="_blank" rel="noopener noreferrer">
                Soporte WhatsApp<br />
                Lunes a Viernes 9:00 a 18:00<br />
                Zona Centro
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
