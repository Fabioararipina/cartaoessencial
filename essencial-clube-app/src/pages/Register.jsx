import React, { useState } from 'react';
import {
  Container, Box, Typography, TextField, Button, CircularProgress,
  Alert, Link as MuiLink, Stepper, Step, StepLabel, ToggleButtonGroup,
  ToggleButton, Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { authService, partnersService } from '../services/api'; // Usar partnersService que já tem as funções
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function Register() {
  const navigate = useNavigate();
  
  // State for multi-step form
  const [step, setStep] = useState(0); // 0: form, 1: payment, 2: success
  const [newUser, setNewUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    telefone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment state
  const [paymentType, setPaymentType] = useState('installment'); // Padrão: Carnê 12x (boleto parcelado)
  const [paymentData, setPaymentData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  const steps = ['Dados Pessoais', 'Plano de Pagamento', 'Concluído'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateCpf = (cpf) => {
    if (!cpf || !/^\d{11}$/.test(cpf)) {
      return 'CPF inválido. Deve conter 11 dígitos.';
    }
    return '';
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cpfError = validateCpf(formData.cpf);
    if (cpfError) {
      setError(cpfError);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.register(formData);
      setNewUser(response.data.user);
      setStep(1); // Move to payment step
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao realizar cadastro. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayment = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    setPaymentData(null);

    const valorMensalidade = 49.90; // TODO: Buscar de config
    
    try {
      let response;
      if (paymentType === 'subscription') {
        response = await partnersService.createSubscription({
          userId: newUser.id,
          value: valorMensalidade,
          billingType: 'UNDEFINED',
          description: `Assinatura Essencial Saúde - ${newUser.nome} (12 meses)`,
        });
        setPaymentData({ ...response.data.subscription, type: 'subscription' });
      } else { // 'installment'
        response = await partnersService.createInstallment({
          userId: newUser.id,
          description: `Plano Anual (Carnê) Essencial Saúde - ${newUser.nome}`,
        });
        setPaymentData({ ...response.data.installment, type: 'installment' });
      }
      setStep(2); // Move to success step
    } catch (err) {
      console.error("Erro ao gerar cobrança:", err.response?.data || err.message);
      setPaymentError(err.response?.data?.error || 'Erro ao gerar cobrança.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const renderStep0 = () => (
    <Box>
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
          Cadastre-se
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Crie sua conta para começar a ganhar pontos!
        </Typography>
      </Box>

      <form onSubmit={handleRegisterSubmit}>
        <TextField fullWidth required label="Nome Completo" name="nome" value={formData.nome} onChange={handleChange} margin="normal" />
        <TextField fullWidth required label="Email" type="email" name="email" value={formData.email} onChange={handleChange} margin="normal" />
        <TextField fullWidth required label="CPF (apenas números)" name="cpf" value={formData.cpf} onChange={handleChange} margin="normal" inputProps={{ maxLength: 11 }} error={!!error && error.includes('CPF')} helperText={error.includes('CPF') ? error : ''} />
        <TextField fullWidth label="Telefone (opcional)" name="telefone" value={formData.telefone} onChange={handleChange} margin="normal" inputProps={{ maxLength: 11 }} />
        <TextField fullWidth required label="Senha" type="password" name="senha" value={formData.senha} onChange={handleChange} margin="normal" />

        {error && !error.includes('CPF') && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, py: 1.5 }} disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Continuar para Pagamento'}
        </Button>
      </form>

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2">
          Já tem uma conta?{' '}
          <MuiLink component={Link} to="/login" variant="body2">
            Faça Login
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );

  const renderStep1 = () => (
    <Box>
       <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
          Escolha seu Plano
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Selecione a forma de pagamento para ativar sua conta.
        </Typography>
      </Box>
      
      {paymentError && <Alert severity="error" sx={{ mb: 3 }}>{paymentError}</Alert>}

      <ToggleButtonGroup
        color="primary" value={paymentType} exclusive fullWidth
        onChange={(e, newValue) => { if (newValue) setPaymentType(newValue); }} sx={{ mb: 2 }}
      >
        <ToggleButton value="installment">Carnê 12x R$ 49,90 (Recomendado)</ToggleButton>
        <ToggleButton value="subscription">Assinatura Mensal</ToggleButton>
      </ToggleButtonGroup>
      <Button variant="contained" fullWidth size="large" onClick={handleGeneratePayment} disabled={paymentLoading}>
        {paymentLoading ? <CircularProgress size={24} color="inherit" /> : 'Gerar Cobrança'}
      </Button>
    </Box>
  );
  
  const renderStep2 = () => (
     <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6" fontWeight="medium">
              {paymentData.type === 'subscription' ? 'Assinatura Criada!' : 'Carnê Gerado!'}
            </Typography>
        </Box>

        {paymentData.type === 'subscription' ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Mostre o QR Code ou envie o link da fatura para pagar a primeira mensalidade e ativar sua conta.
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
          <>
            <Alert severity="success" icon={<ReceiptLongIcon />} sx={{ mb: 2 }}>
              <strong>{paymentData.installmentCount || 12} parcelas</strong> de <strong>R$ {(paymentData.installmentValue || 49.90).toFixed(2)}</strong> geradas.
              Imprima o carnê para pagamento.
            </Alert>
            <Button variant="contained" color="primary" fullWidth startIcon={<PrintIcon />}
              onClick={() => { if (paymentData.payments) paymentData.payments.forEach((p, i) => setTimeout(() => window.open(p.invoiceUrl, '_blank'), i * 300)); }} sx={{ mb: 2 }}
            >
              Abrir Todos os Boletos para Impressão
            </Button>
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
                      <TableCell><Chip label={`${index + 1}/${paymentData.payments.length}`} size="small" /></TableCell>
                      <TableCell>{parcela.dueDate ? new Date(parcela.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                      <TableCell align="right">R$ {parseFloat(parcela.value).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => window.open(parcela.invoiceUrl, '_blank')} title="Abrir boleto">
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
        <Divider sx={{ my: 2 }} />
        <Button variant="contained" fullWidth onClick={() => navigate('/login')}>
            Ir para o Login
        </Button>
    </Box>
  );


  return (
    <Container maxWidth="sm" sx={{ mt: 5, p: 3, borderRadius: 2, boxShadow: 3, bgcolor: 'background.paper' }}>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      
      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}

    </Container>
  );
}