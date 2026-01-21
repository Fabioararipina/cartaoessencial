import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { partnersService } from '../../services/api';

// Ícones SVG para ParceiroHome
const Icons = {
  spinner: (
    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  ),
  plus: (
    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
};

export default function ParceiroHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_transacoes: 0,
    valor_total: 0,
    pontos_total: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await partnersService.getMyTransactions({ limit: 5 });
      setStats(response.data.stats);
      setRecentTransactions(response.data.transactions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        {Icons.spinner}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Painel do Parceiro
        </h1>
        <p className="text-gray-500">Olá, {user?.nome?.split(' ')[0]}!</p>
      </div>

      {/* Botão Principal */}
      <Link
        to="/parceiro/lancar"
        className="card gradient-primary text-white flex items-center justify-between hover-lift"
      >
        <div>
          <p className="text-white/80 text-sm">Lançar pontos para cliente</p>
          <p className="text-xl font-bold mt-1">Nova Transação</p>
        </div>
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
          {Icons.plus}
        </div>
      </Link>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center hover-lift">
          <p className="text-2xl font-bold text-primary-500">{stats.total_transacoes}</p>
          <p className="text-xs text-gray-500 mt-1">Transações</p>
        </div>
        <div className="card text-center hover-lift">
          <p className="text-2xl font-bold text-secondary-500">{stats.pontos_total.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Pontos Lançados</p>
        </div>
        <div className="card text-center hover-lift">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.valor_total)}</p>
          <p className="text-xs text-gray-500 mt-1">Valor Total</p>
        </div>
      </div>

      {/* Últimas Transações */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Últimas transações</h3>
          <Link to="/parceiro/historico" className="text-sm text-primary-500 hover:text-primary-700">
            Ver todas
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhuma transação realizada
          </p>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.cliente_nome}</p>
                  <p className="text-xs text-gray-500">
                    CPF: {item.cliente_cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-secondary-600">+{item.points_awarded} pts</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.valor_compra)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
