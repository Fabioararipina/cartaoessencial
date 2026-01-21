import { useState } from 'react';
import { partnersService } from '../../services/api';

// Ícones SVG para LancarPontos
const Icons = {
  spinner: (
    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  ),
  checkCircle: (
    <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  checkMark: (
    <svg className="w-10 h-10 text-secondary-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.174 3.35 1.9 3.35h13.713c1.726 0 2.766-1.85 1.9-3.35L13.73 7.96c-.234-.403-.9-.403-1.134 0L2.269 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

export default function LancarPontos() {
  const [step, setStep] = useState(1); // 1: buscar cliente, 2: lançar pontos, 3: sucesso
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState(null);
  const [valorCompra, setValorCompra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  // Formatar CPF enquanto digita
  const formatCpf = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const handleCpfChange = (e) => {
    setCpf(formatCpf(e.target.value));
  };

  // Buscar cliente
  const buscarCliente = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      setError('CPF inválido');
      setLoading(false);
      return;
    }

    try {
      const response = await partnersService.checkClient(cpfLimpo);

      if (response.data.found) {
        setCliente(response.data.client);

        if (!response.data.client.pode_lancar_pontos) {
          setError(`Cliente com status "${response.data.client.status}". Não é possível lançar pontos.`);
        } else {
          setStep(2);
        }
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Cliente não encontrado';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Lançar pontos
  const lancarPontos = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const valor = parseFloat(valorCompra.replace(',', '.'));

    if (isNaN(valor) || valor <= 0) {
      setError('Valor inválido');
      setLoading(false);
      return;
    }

    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const response = await partnersService.awardPoints(cpfLimpo, valor);
      setResultado({
        pontos: response.data.points_awarded,
        mensagem: response.data.message,
      });
      setStep(3);
    } catch (error) {
      const message = error.response?.data?.error || 'Erro ao lançar pontos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar
  const novaTransacao = () => {
    setStep(1);
    setCpf('');
    setCliente(null);
    setValorCompra('');
    setError('');
    setResultado(null);
  };

  // Calcular pontos estimados
  const pontosEstimados = Math.floor(parseFloat(valorCompra.replace(',', '.') || 0) / 10);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lançar Pontos</h1>
        <p className="text-gray-500">Registre uma compra e dê pontos ao cliente</p>
      </div>

      {/* Indicador de Passos */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((num) => (
          <div
            key={num}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step >= num
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step > num ? Icons.checkMark : num}
          </div>
        ))}
      </div>

      {/* Step 1: Buscar Cliente */}
      {step === 1 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Buscar Cliente</h2>

          <form onSubmit={buscarCliente} className="space-y-4">
            {error && (
              <div className="alert alert-error">
                {Icons.warning}
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="input-label">CPF do Cliente</label>
              <input
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="input text-center text-xl font-mono tracking-wider"
                maxLength={14}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || cpf.replace(/\D/g, '').length !== 11}
              className="btn-primary w-full"
            >
              {loading ? 'Buscando...' : 'Buscar Cliente'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Lançar Pontos */}
      {step === 2 && cliente && (
        <div className="card">
          {/* Info do Cliente */}
          <div className="bg-secondary-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center">
                {Icons.checkCircle}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{cliente.nome}</p>
                <p className="text-sm text-gray-500">
                  Saldo: <span className="font-medium text-primary-500">{cliente.saldo_pontos} pts</span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={lancarPontos} className="space-y-4">
            {error && (
              <div className="alert alert-error">
                {Icons.warning}
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="input-label">Valor da Compra (R$)</label>
              <input
                type="text"
                value={valorCompra}
                onChange={(e) => setValorCompra(e.target.value.replace(/[^0-9,]/g, ''))}
                placeholder="0,00"
                className="input text-center text-2xl"
                autoFocus
              />
            </div>

            {pontosEstimados > 0 && (
              <div className="bg-primary-500/5 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Cliente receberá</p>
                <p className="text-3xl font-bold text-primary-500">{pontosEstimados}</p>
                <p className="text-sm text-gray-500">pontos</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="btn-outline flex-1"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading || pontosEstimados <= 0}
                className="btn-primary flex-1"
              >
                {loading ? 'Lançando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Sucesso */}
      {step === 3 && resultado && (
        <div className="card text-center">
          <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {Icons.checkMark}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Pontos Lançados!</h2>
          <p className="text-gray-600 mb-4">{resultado.mensagem}</p>

          <div className="bg-primary-500/5 rounded-lg p-6 mb-6">
            <p className="text-4xl font-bold text-primary-500">+{resultado.pontos}</p>
            <p className="text-sm text-gray-500">pontos creditados</p>
          </div>

          <div className="text-left bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Cliente</p>
            <p className="font-medium text-gray-900">{cliente?.nome}</p>
            <p className="text-sm text-gray-500">{cpf}</p>
          </div>

          <button onClick={novaTransacao} className="btn-primary w-full">
            Nova Transação
          </button>
        </div>
      )}
    </div>
  );
}
