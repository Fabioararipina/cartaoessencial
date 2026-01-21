import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pointsService, redemptionsService } from '../services/api';

// Ícones SVG para Perfil
const Icons = {
  spinner: (
    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  ),
  settings: (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  help: (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442U12 18.75h.008v.008H12v-.008zM12 9.75a.75.75 0 01.75-.75h.008v.008H12v-.008z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  ),
};

export default function Perfil() {
  const { user, logout } = useAuth();
  const [saldo, setSaldo] = useState(0);
  const [resgates, setResgates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [balanceRes, redemptionsRes] = await Promise.all([
        pointsService.getBalance(user.id),
        redemptionsService.getMy(),
      ]);
      setSaldo(balanceRes.data.saldo);
      setResgates(redemptionsRes.data.redemptions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (nivel) => {
    const classes = {
      bronze: 'badge-bronze',
      prata: 'badge-prata',
      ouro: 'badge-ouro',
      diamante: 'badge-diamante',
    };
    return classes[nivel] || 'badge-bronze';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'badge-warning',
      aprovado: 'badge-success',
      rejeitado: 'badge-error',
      entregue: 'badge-info',
    };
    const labels = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
      entregue: 'Entregue',
    };
    return (
      <span className={`badge ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        {Icons.spinner}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Perfil */}
      <div className="card text-center py-8">
        <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-bold text-primary-500">
            {user?.nome?.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{user?.nome}</h2>
        <p className="text-gray-500">{user?.email}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`badge ${getBadgeClass(user?.nivel)}`}>
            {user?.nivel}
          </span>
          <span className="text-xs text-gray-500 capitalize">• {user?.tipo}</span>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-primary-500">{saldo.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Pontos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-secondary-500">{user?.total_indicacoes || 0}</p>
          <p className="text-sm text-gray-500">Indicações</p>
        </div>
      </div>

      {/* Dados Pessoais */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Dados Pessoais</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-500">CPF</span>
            <span className="font-medium text-gray-900">
              {user?.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-500">Telefone</span>
            <span className="font-medium text-gray-900">{user?.telefone || '-'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Membro desde</span>
            <span className="font-medium text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Meus Resgates */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Meus Resgates</h3>

        {resgates.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            Você ainda não resgatou nenhum prêmio
          </p>
        ) : (
          <div className="space-y-3">
            {resgates.slice(0, 5).map((resgate) => (
              <div key={resgate.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{resgate.reward_nome}</p>
                  <p className="text-xs text-gray-500">
                    Código: {resgate.codigo_resgate}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(resgate.status)}
                  <p className="text-xs text-gray-500 mt-1">
                    {resgate.points_spent} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="space-y-3">
        <button className="card w-full text-left flex items-center gap-3 hover:bg-gray-50 transition-colors">
          {Icons.settings}
          <span className="font-medium text-gray-900">Configurações</span>
        </button>

        <button className="card w-full text-left flex items-center gap-3 hover:bg-gray-50 transition-colors">
          {Icons.help}
          <span className="font-medium text-gray-900">Ajuda</span>
        </button>

        <button
          onClick={logout}
          className="card w-full text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
        >
          {Icons.logout}
          <span className="font-medium">Sair da conta</span>
        </button>
      </div>
    </div>
  );
}
