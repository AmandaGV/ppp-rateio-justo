import { Navigate, Route, Routes } from 'react-router-dom';
import RotaProtegida from './components/comum/RotaProtegida';
import LoginPage from './pages/LoginPage';
import CadastroPage from './pages/CadastroPage';
import DashboardPage from './pages/DashboardPage';
import GrupoDetalhesPage from './pages/GrupoDetalhesPage';
import NaoEncontradoPage from './pages/NaoEncontradoPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/grupos" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route element={<RotaProtegida />}>
        <Route path="/grupos" element={<DashboardPage />} />
        <Route path="/grupos/:id" element={<GrupoDetalhesPage />} />
      </Route>
      <Route path="*" element={<NaoEncontradoPage />} />
    </Routes>
  );
}
