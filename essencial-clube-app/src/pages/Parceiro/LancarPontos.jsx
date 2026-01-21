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

  const steps = ['Buscar Cliente', 'Lançar Pontos', 'Concluído'];

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
          setStep(1);
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
      setStep(2);
    } catch (error) {
      const message = error.response?.data?.error || 'Erro ao lançar pontos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar
  const novaTransacao = () => {
    setStep(0);
    setCpf('');
    setCliente(null);
    setValorCompra('');
    setError('');
    setResultado(null);
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

      {/* Step 2: Sucesso */}
      {step === 2 && resultado && (
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
