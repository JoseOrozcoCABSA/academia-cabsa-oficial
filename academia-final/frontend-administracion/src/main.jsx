/**
 * @file Punto de entrada de la aplicacion: monta el arbol de React.
 *
 * El orden de los proveedores importa: `AuthProvider` envuelve a `AppProvider`,
 * asi que el estado de interfaz puede leer la sesion pero no al contrario.
 * `BrowserRouter` va por fuera de los dos para que ambos puedan navegar.
 *
 * `StrictMode` monta y desmonta cada componente dos veces en desarrollo, lo que
 * duplica las peticiones de los efectos. Es esperado y no ocurre en produccion.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
