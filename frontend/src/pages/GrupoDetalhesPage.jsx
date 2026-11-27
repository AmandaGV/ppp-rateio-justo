import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Alerta from '../components/comum/Alerta';
import Carregando from '../components/comum/Carregando';
import ConfirmacaoModal from '../components/comum/ConfirmacaoModal';
import { PapelBadge, StatusBadge } from '../components/comum/Badges';
import DespesasTab from '../components/despesas/DespesasTab';
import MembrosTab from '../components/membros/MembrosTab';
import BalancoTab from '../components/balanco/BalancoTab';

const ABAS = [
  { id: 'despesas', rotulo: 'Despesas', testId: 'group-tab-expenses' },
  { id: 'membros', rotulo: 'Membros', testId: 'group-tab-members' },
  { id: 'balanco', rotulo: 'Balanço', testId: 'group-tab-balance' },
];

export default function GrupoDetalhesPage() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const aba = ABAS.some((a) => a.id === params.get('aba')) ? params.get('aba') : 'despesas';

  const [grupo, setGrupo] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [balanco, setBalanco] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [g, d, b] = await Promise.all([api.obterGrupo(id), api.listarDespesas(id), api.balanco(id)]);
      setGrupo(g);
      setDespesas(d);
      setBalanco(b);
      setErro(null);
    } catch (err) {
      setErro(err);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  if (carregando) return <Carregando testId="group-loading" />;

  if (erro && !grupo) {
    return (
      <section data-testid="group-error-page">
        <Alerta tipo="erro" testId="group-error-alert">
          {erro.status === 403 ? 'Acesso negado: você não é participante deste grupo.' : erro.message}
        </Alerta>
        <Link to="/grupos" className="botao botao-secundario" data-testid="group-back-button">← Voltar para meus grupos</Link>
      </section>
    );
  }

  return (
    <section data-testid="group-details-page" data-group-id={grupo.id}>
      <Link to="/grupos" className="link-voltar" data-testid="group-back-link">← Meus grupos</Link>

      <header className="cabecalho-pagina">
        <div>
          <h1 data-testid="group-name">{grupo.nome}</h1>
          {grupo.descricao && <p className="texto-suave" data-testid="group-description">{grupo.descricao}</p>}
          <div className="badges">
            <StatusBadge status={grupo.status} testId="group-status-badge" />
            <PapelBadge papel={grupo.meuPapel} testId="group-role-badge" />
          </div>
        </div>
        {grupo.meuPapel === 'ADMIN' && (
          <button type="button" className="botao botao-perigo-contorno" onClick={() => setConfirmarExclusao(true)} data-testid="delete-group-button">
            Excluir grupo
          </button>
        )}
      </header>

      {erro && <Alerta tipo="erro" testId="group-refresh-error-alert">{erro.message}</Alerta>}

      <div className="abas" role="tablist" data-testid="group-tabs">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={aba === a.id}
            className={`aba ${aba === a.id ? 'ativa' : ''}`} onClick={() => setParams({ aba: a.id })} data-testid={a.testId}>
            {a.rotulo}
            {a.id === 'despesas' && <span className="contador-aba">{despesas.length}</span>}
            {a.id === 'membros' && <span className="contador-aba">{grupo.totalMembros}</span>}
          </button>
        ))}
      </div>

      <div className="painel-aba" role="tabpanel">
        {aba === 'despesas' && <DespesasTab grupo={grupo} despesas={despesas} usuario={usuario} aoAlterar={carregar} />}
        {aba === 'membros' && <MembrosTab grupo={grupo} usuario={usuario} aoAlterar={carregar} />}
        {aba === 'balanco' && <BalancoTab grupo={grupo} balanco={balanco} aoAlterar={carregar} />}
      </div>

      <ConfirmacaoModal
        aberto={confirmarExclusao}
        titulo="Excluir grupo"
        mensagem={`Excluir o grupo "${grupo.nome}" e todas as suas despesas? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir grupo"
        testId="delete-group-modal"
        aoFechar={() => setConfirmarExclusao(false)}
        aoConfirmar={async () => {
          await api.excluirGrupo(grupo.id);
          navigate('/grupos', { state: { mensagem: `Grupo "${grupo.nome}" excluído.` } });
        }}
      />
    </section>
  );
}
