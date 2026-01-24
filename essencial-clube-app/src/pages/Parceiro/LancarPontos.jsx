import React, { useState, useRef } from 'react';
import { partnersService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  TextField, Button, Alert, Stepper, Step, StepLabel, InputAdornment,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

export default function LancarPontos() {
  const [step, setStep] = useState(0); // 0: buscar cliente, 1: lançar pontos, 2: ativar cliente, 3: sucesso
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState(null);
  const [valorCompra, setValorCompra] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  
  // Estados de Pagamento
  const [paymentType, setPaymentType] = useState('installment'); // Padrão: Carnê 12x (boleto parcelado)
  const [paymentData, setPaymentData] = useState(null); // Dados da resposta do Asaas (assinatura ou carnê)
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const steps = ['Buscar Cliente', 'Lançar Pontos', 'Ativar Cliente', 'Concluído'];

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

  const buscarCliente = async (e) => {
    e.preventDefault();
    setError('');
    setPaymentError('');
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
          setError('Cliente inativo. Gere uma cobrança para ativá-lo.');
          setStep(2); // Vai para o passo de ativação
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

  const handleGeneratePayment = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    setPaymentData(null);

    const valorMensalidade = 49.90; // TODO: Definir valor da mensalidade (vir de uma config/DB)
    
    try {
      let response;
      if (paymentType === 'subscription') {
        response = await partnersService.createSubscription({
          userId: cliente.id,
          value: valorMensalidade,
          billingType: 'UNDEFINED',
          description: `Assinatura Essencial Saúde - ${cliente.nome} (12 meses)`,
        });
        setPaymentData({ ...response.data.subscription, type: 'subscription' });
      } else { // 'installment'
        response = await partnersService.createInstallment({
          userId: cliente.id,
          description: `Plano Anual (Carnê) Essencial Saúde - ${cliente.nome}`,
        });
        setPaymentData({ ...response.data.installment, type: 'installment' });
      }
    } catch (err) {
      console.error("Erro ao gerar cobrança:", err.response?.data || err.message);
      setPaymentError(err.response?.data?.error || 'Erro ao gerar cobrança.');
    } finally {
      setPaymentLoading(false);
    }
  };

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
      setStep(3); // Mudar para o step final
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
    setPaymentData(null);
    setPaymentError('');
    setPaymentLoading(false);
    setPaymentType('installment'); // Resetar para o padrão (Carnê 12x)
  };

  const pontosEstimados = Math.floor(parseFloat(valorCompra.replace(',', '.') || 0) / 10);

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Lançar Pontos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registre uma compra e dê pontos ao cliente
        </Typography>
      </Box>

      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {step === 0 && (
        <Card><CardContent>
          <Typography variant="h6" fontWeight="medium" gutterBottom>Buscar Cliente</Typography>
          <Box component="form" onSubmit={buscarCliente}>
            {error && <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>{error}</Alert>}
            <TextField
              fullWidth label="CPF do Cliente" value={cpf} onChange={handleCpfChange}
              placeholder="000.000.000-00" inputProps={{ maxLength: 14, style: { textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.1em' } }}
              sx={{ mb: 3 }} autoFocus
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || cpf.replace(/\D/g, '').length !== 11}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Buscar Cliente'}
            </Button>
          </Box>
        </CardContent></Card>
      )}

      {step === 1 && cliente && (
        <Card><CardContent>
          <Box sx={{ bgcolor: 'secondary.lighter', borderRadius: 2, p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, bgcolor: 'secondary.light', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon color="secondary" />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">{cliente.nome}</Typography>
              <Typography variant="body2" color="text.secondary">
                Saldo: <Typography component="span" fontWeight="medium" color="primary.main">{cliente.saldo_pontos} pts</Typography>
              </Typography>
            </Box>
          </Box>
          <Box component="form" onSubmit={lancarPontos}>
            {error && <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>{error}</Alert>}
            <TextField
              fullWidth label="Valor da Compra" value={valorCompra} onChange={(e) => setValorCompra(e.target.value.replace(/[^0-9,]/g, ''))}
              placeholder="0,00" InputProps={{ startAdornment: (<InputAdornment position="start">R$</InputAdornment>)}}
              inputProps={{ style: { textAlign: 'center', fontSize: '1.5rem' } }} sx={{ mb: 3 }} autoFocus
            />
            {pontosEstimados > 0 && (
              <Box sx={{ bgcolor: 'primary.lighter', borderRadius: 2, p: 3, textAlign: 'center', mb: 3 }}>
                <Typography variant="body2" color="text.secondary">Cliente receberá</Typography>
                <Typography variant="h3" fontWeight="bold" color="primary.main">{pontosEstimados}</Typography>
                <Typography variant="body2" color="text.secondary">pontos</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" fullWidth size="large" onClick={() => { setStep(0); setError(''); }}>Voltar</Button>
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || pontosEstimados <= 0}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar'}
              </Button>
            </Box>
          </Box>
        </CardContent></Card>
      )}

      {step === 2 && cliente && (
        <Card><CardContent>
          <Typography variant="h6" fontWeight="medium" gutterBottom>Ativar Cliente Inativo</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            O cliente <strong>{cliente.nome}</strong> está inativo. Escolha o método de cobrança para ativá-lo.
          </Typography>

          {paymentError && <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>{paymentError}</Alert>}

          {!paymentData ? (
            <>
              <ToggleButtonGroup
                color="primary" value={paymentType} exclusive fullWidth
                onChange={(e, newValue) => { if (newValue) setPaymentType(newValue); }} sx={{ mb: 2 }}
              >
                <ToggleButton value="installment">Carnê 12x (Recomendado)</ToggleButton>
                <ToggleButton value="subscription">Assinatura Mensal</ToggleButton>
              </ToggleButtonGroup>
              <Button variant="contained" fullWidth size="large" onClick={handleGeneratePayment} disabled={paymentLoading} startIcon={paymentLoading ? <CircularProgress size={24} color="inherit" /> : <PersonIcon />}>
                Gerar Cobrança
              </Button>
            </>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6" fontWeight="medium">
                  {paymentData.type === 'subscription' ? 'Assinatura Criada!' : 'Carnê Gerado!'}
                </Typography>
              </Box>

              {paymentData.type === 'subscription' ? (
                // Assinatura - mostra QR Code PIX
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Mostre o QR Code ou envie o link da fatura para o cliente pagar a primeira mensalidade.
                  </Alert>
                  {paymentData.pixQrCode && (
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <img src={`data:image/png;base64,${paymentData.pixQrCode}`} alt="QR Code PIX" style={{ maxWidth: 200, height: 'auto' }} />
                      <Typography variant="caption" color="text.secondary" display="block">Escaneie o QR Code</Typography>
                    </Box>
                  )}
                  <Button variant="outlined" fullWidth target="_blank" href={paymentData.invoiceUrl} sx={{ mb: 2 }}>
                    Abrir Fatura Asaas
                  </Button>
                </>
              ) : (
                // Carnê - mostra lista de parcelas
                <>
                  <Alert severity="success" icon={<ReceiptLongIcon />} sx={{ mb: 2 }}>
                    <strong>{paymentData.installmentCount || 12} parcelas</strong> de <strong>R$ {(paymentData.installmentValue || 49.90).toFixed(2)}</strong> geradas.
                    Imprima o carnê para entregar ao cliente.
                  </Alert>

                  {/* Botão de imprimir todos os boletos */}
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<PrintIcon />}
                    onClick={() => {
                      // Abre todas as URLs de boleto em abas para impressão
                      if (paymentData.payments && paymentData.payments.length > 0) {
                        paymentData.payments.forEach((p, index) => {
                          setTimeout(() => {
                            window.open(p.invoiceUrl, '_blank');
                          }, index * 300); // Delay para não bloquear popup
                        });
                      }
                    }}
                    sx={{ mb: 2 }}
                  >
                    Abrir Todos os Boletos para Impressão
                  </Button>

                  {/* Tabela de parcelas */}
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Parcela</strong></TableCell>
                          <TableCell><strong>Vencimento</strong></TableCell>
                          <TableCell align="right"><strong>Valor</strong></TableCell>
                          <TableCell align="center"><strong>Boleto</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentData.payments && paymentData.payments.map((parcela, index) => (
                          <TableRow key={parcela.id} hover>
                            <TableCell>
                              <Chip label={`${index + 1}/${paymentData.payments.length}`} size="small" />
                            </TableCell>
                            <TableCell>
                              {parcela.dueDate
                                ? new Date(parcela.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              R$ {parseFloat(parcela.value).toFixed(2)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => window.open(parcela.invoiceUrl, '_blank')}
                                title="Abrir boleto"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center' }}>
                    Clique no ícone para abrir cada boleto individualmente ou use o botão acima para abrir todos.
                  </Typography>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Button variant="outlined" fullWidth onClick={novaTransacao}>Nova Transação</Button>
            </Box>
          )}

          <Button variant="text" fullWidth sx={{ mt: 2 }} onClick={() => novaTransacao()}>Voltar</Button>
        </CardContent></Card>
      )}

      {step === 3 && resultado && (
        <Card sx={{ textAlign: 'center' }}><CardContent sx={{ py: 4 }}>
          <Box sx={{ width: 80, height: 80, bgcolor: 'secondary.lighter', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 40 }} color="secondary" />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Pontos Lançados!</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{resultado.mensagem}</Typography>
          <Box sx={{ bgcolor: 'primary.lighter', borderRadius: 2, p: 3, mb: 3 }}>
            <Typography variant="h2" fontWeight="bold" color="primary.main">{resultado.pontos}</Typography>
            <Typography variant="body2" color="text.secondary">pontos creditados</Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2, textAlign: 'left', mb: 3 }}>
            <Typography variant="caption" color="text.secondary">Cliente</Typography>
            <Typography variant="subtitle1" fontWeight="medium">{cliente?.nome}</Typography>
            <Typography variant="body2" color="text.secondary">{cpf}</Typography>
          </Box>
          <Button variant="contained" fullWidth size="large" onClick={novaTransacao}>Nova Transação</Button>
        </CardContent></Card>
      )}
    </Container>
  );
}