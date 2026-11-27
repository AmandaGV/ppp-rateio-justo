import { Link } from 'react-router-dom';
import { PapelBadge, StatusBadge } from '../comum/Badges';
import { formatarMoeda } from '../../utils/formatadores';

export default function GrupoCard({ grupo }) {
  const t = `group-card-${grupo.id}`;
  return (
    <Link to={`/grupos/${grupo.id}`} className="cartao grupo-card" data-testid={t} data-group-name={grupo.nome}>
      <div className="grupo-card-topo">
        <h3 data-testid={`${t}-name`}>{grupo.nome}</h3>
        <div className="badges">
          <StatusBadge status={grupo.status} testId={`${t}-status-badge`} />
          <PapelBadge papel={grupo.meuPapel} testId={`${t}-role-badge`} />
        </div>
      </div>
      {grupo.descricao && <p className="texto-suave" data-testid={`${t}-description`}>{grupo.descricao}</p>}
      <div className="grupo-card-rodape">
        <span data-testid={`${t}-members-count`}>👥 {grupo.totalMembros}/{grupo.limiteMembros} participantes</span>
        <span data-testid={`${t}-expenses-count`}>🧾 {grupo.quantidadeDespesas} despesas</span>
        <span data-testid={`${t}-total`}>{formatarMoeda(grupo.totalGasto)}</span>
      </div>
    </Link>
  );
}
