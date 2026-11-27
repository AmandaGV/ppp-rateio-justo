import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Alerta from '../components/comum/Alerta';
import Carregando from '../components/comum/Carregando';
import GrupoCard from '../components/grupos/GrupoCard';
import NovoGrupoModal from '../components/grupos/NovoGrupoModal';

const FILTROS = ['TODOS', 'ABERTO', 'FECHADO'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [grupos, setGrupos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(location.state?.mensagem || '');
  const [filtro, setFiltro] = useState('TODOS');
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setGrupos(await api.listarGrupos());
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = grupos.filter((g) => filtro === 'TODOS' || g.status === filtro);

  return (
    <section data-testid="dashboard-page">
      <header className="cabecalho-pagina">
        <div>
          <h1 data-testid="dashboard-title">Meus grupos</h1>
          <p className="texto-suave">Grupos de rateio dos quais você participa.</p>
        </div>
        <button type="button" className="botao botao-primario" onClick={() => setModalAberto(true)} data-testid="dashboard-create-group-button">
          + Novo grupo
        </button>
      </header>

      <Alerta tipo="sucesso" testId="dashboard-success-alert" aoFechar={() => setSucesso('')}>{sucesso}</Alerta>
      <Alerta tipo="erro" testId="dashboard-error-alert">{erro}</Alerta>

      <div className="filtros" role="tablist" data-testid="dashboard-status-filter">
        {FILTROS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filtro === f}
            className={`chip ${filtro === f ? 'ativo' : ''}`} onClick={() => setFiltro(f)}
            data-testid={`dashboard-filter-${f.toLowerCase()}-button`}>
            {f === 'TODOS' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {carregando ? (
        <Carregando testId="dashboard-loading" />
      ) : visiveis.length === 0 ? (
        <div className="vazio" data-testid="dashboard-empty-state">
          <p>{grupos.length === 0 ? 'Você ainda não participa de nenhum grupo.' : 'Nenhum grupo com este status.'}</p>
          {grupos.length === 0 && (
            <button type="button" className="botao botao-primario" onClick={() => setModalAberto(true)} data-testid="dashboard-empty-create-group-button">
              Criar meu primeiro grupo
            </button>
          )}
        </div>
      ) : (
        <div className="grade-grupos" data-testid="dashboard-group-list">
          {visiveis.map((g) => <GrupoCard key={g.id} grupo={g} />)}
        </div>
      )}

      <NovoGrupoModal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        aoCriar={(grupo) => {
          setSucesso(`Grupo "${grupo.nome}" criado com sucesso.`);
          navigate(`/grupos/${grupo.id}`);
        }}
      />
    </section>
  );
}
