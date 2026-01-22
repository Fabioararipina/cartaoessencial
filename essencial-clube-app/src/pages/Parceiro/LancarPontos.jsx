import React, { useState } from 'react';
import { partnersService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  TextField, Button, Alert, Stepper, Step, StepLabel, InputAdornment
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';

export default function LancarPontos() {
  const [step, setStep] = useState(0); // 0: buscar cliente, 1: lançar pontos, 2: sucesso
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState(null);
  const [valorCompra, setValorCompra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [pixData, setPixData] = useState(null); // Dados do PIX (QR Code, URL)
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState('');

  const steps = ['Buscar Cliente', 'Lançar Pontos', 'Pagamento PIX', 'Concluído'];

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
    setPixError(''); // Limpar erro de PIX anterior
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

        if (response.data.client.status === 'inativo') {
          setError('Cliente inativo. Gere um pagamento PIX para ativá-lo.');
          setStep(2); // Vai para o passo de PIX (novo step)
        } else if (response.data.client.status === 'ativo') {
          setStep(1); // Continua para lançar pontos
        } else {
          setError(`Cliente com status "${response.data.client.status}". Não é possível lançar pontos ou ativar.`);
        }
      } else {
        setError('Cliente não encontrado.');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Erro ao buscar cliente';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePixPayment = async () => {
    setPixLoading(true);
    setPixError('');
    setPixData(null);

    const valorMensalidade = 49.90; // TODO: Definir valor da mensalidade (vir de uma config/DB)

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Vencimento para amanhã
    const formattedDueDate = dueDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    try {
      const response = await partnersService.createCharge({
        userId: cliente.id,
        value: valorMensalidade,
        dueDate: formattedDueDate,
        description: `Mensalidade Essencial Saúde - Cliente ${cliente.nome}`,
      });
      setPixData(response.data.charge);
      // Permanece no step 2 para exibir o QR Code
    } catch (err) {
      setPixError(err.response?.data?.error || 'Erro ao gerar pagamento PIX.');
    } finally {
      setPixLoading(false);
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
      setStep(2);
    } catch (error) {
      const message = error.response?.data?.error || 'Erro ao lançar pontos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const novaTransacao = () => {
    setStep(0);
    setCpf('');
    setCliente(null);
    setValorCompra('');
    setError('');
    setResultado(null);
    setPixData(null); // Limpar dados do PIX
    setPixError(''); // Limpar erro do PIX
    setPixLoading(false); // Limpar loading do PIX
  };

  // Calcular pontos estimados
  const pontosEstimados = Math.floor(parseFloat(valorCompra.replace(',', '.') || 0) / 10);

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Lançar Pontos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registre uma compra e dê pontos ao cliente
        </Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 0: Buscar Cliente */}
      {step === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Buscar Cliente
            </Typography>

            <Box component="form" onSubmit={buscarCliente}>
              {error && (
                <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="CPF do Cliente"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                inputProps={{
                  maxLength: 14,
                  style: { textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.1em' }
                }}
                sx={{ mb: 3 }}
                autoFocus
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading || cpf.replace(/\D/g, '').length !== 11}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Buscar Cliente'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Lançar Pontos */}
      {step === 1 && cliente && (
        <Card>
          <CardContent>
            {/* Info do Cliente */}
            <Box
              sx={{
                bgcolor: 'secondary.lighter',
                borderRadius: 2,
                p: 2,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'secondary.light',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircleIcon color="secondary" />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight="medium">
                  {cliente.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Saldo: <Typography component="span" fontWeight="medium" color="primary.main">{cliente.saldo_pontos} pts</Typography>
                </Typography>
              </Box>
            </Box>

            <Box component="form" onSubmit={lancarPontos}>
              {error && (
                <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Valor da Compra"
                value={valorCompra}
                onChange={(e) => setValorCompra(e.target.value.replace(/[^0-9,]/g, ''))}
                placeholder="0,00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                inputProps={{
                  style: { textAlign: 'center', fontSize: '1.5rem' }
                }}
                sx={{ mb: 3 }}
                autoFocus
              />

              {pontosEstimados > 0 && (
                <Box
                  sx={{
                    bgcolor: 'primary.lighter',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    mb: 3
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Cliente receberá
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="primary.main">
                    {pontosEstimados}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    pontos
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={() => { setStep(0); setError(''); }}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || pontosEstimados <= 0}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pagamento PIX */}
      {step === 2 && cliente && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Ativar Cliente Inativo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              O cliente <strong>{cliente.nome}</strong> está inativo. Gere um pagamento PIX para ativá-lo e liberar o lançamento de pontos.
            </Typography>

            {pixError && (
              <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
                {pixError}
              </Alert>
            )}

            {!pixData ? (
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleGeneratePixPayment}
                disabled={pixLoading}
                startIcon={pixLoading ? <CircularProgress size={24} color="inherit" /> : <PersonIcon />}
              >
                Gerar Pagamento PIX
              </Button>
            ) : (
              <Box>
                <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                  Pagamento PIX Gerado!
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Mostre o QR Code para o cliente ou envie o link da fatura. O status será atualizado automaticamente após o pagamento.
                </Alert>

                {pixData.pix_qrcode && (
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <img src={`data:image/png;base64,${pixData.pix_qrcode}`} alt="QR Code PIX" style={{ maxWidth: 200, height: 'auto' }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Escaneie o QR Code
                    </Typography>
                  </Box>
                )}

                {pixData.invoiceUrl && (
                  <Button
                    variant="outlined"
                    fullWidth
                    target="_blank"
                    href={pixData.invoiceUrl}
                    sx={{ mb: 2 }}
                  >
                    Abrir Fatura Asaas
                  </Button>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  onClick={novaTransacao}
                >
                  Voltar para Nova Transação
                </Button>
              </Box>
            )}

            <Button
              variant="text"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => novaTransacao()} // Permite voltar sem gerar PIX
            >
              Voltar (sem gerar PIX)
            </Button>
          </CardContent>
        </Card>
      )}


      {/* Step 2: Sucesso */}
      {step === 3 && resultado && (
        <Card sx={{ textAlign: 'center' }}>
          <CardContent sx={{ py: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'secondary.lighter',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 40 }} color="secondary" />
            </Box>

            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Pontos Lançados!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {resultado.mensagem}
            </Typography>

            <Box
              sx={{
                bgcolor: 'primary.lighter',
                borderRadius: 2,
                p: 3,
                mb: 3
              }}
            >
              <Typography variant="h2" fontWeight="bold" color="primary.main">
                +{resultado.pontos}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                pontos creditados
              </Typography>
            </Box>

            <Box
              sx={{
                bgcolor: 'grey.100',
                borderRadius: 2,
                p: 2,
                textAlign: 'left',
                mb: 3
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Cliente
              </Typography>
              <Typography variant="subtitle1" fontWeight="medium">
                {cliente?.nome}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {cpf}
              </Typography>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={novaTransacao}
            >
              Nova Transação
            </Button>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
