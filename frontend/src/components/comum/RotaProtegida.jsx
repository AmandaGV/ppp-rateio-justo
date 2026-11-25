import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Carregando from './Carregando';
import Navbar from './Navbar';

export default function RotaProtegida() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <Carregando texto="Verificando sessão..." />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname }} />;

  return (
    <>
      <Navbar />
      <main className="conteudo">
        <Outlet />
      </main>
    </>
  );
}
