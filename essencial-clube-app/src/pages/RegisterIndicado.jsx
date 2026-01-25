import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, TextField, Button, CircularProgress,
  Alert, Stepper, Step, StepLabel, Paper, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Card, CardContent, Grid, LinearProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// Ícones
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SecurityIcon from '@mui/icons-material/Security';
import TimerIcon from '@mui/icons-material/Timer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Logo
const Logo = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 2 }}>
    <FavoriteIcon sx={{ color: '#74ca4f', fontSize: 32 }} />
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ color: '#5287fb', lineHeight: 1 }}>
        Essencial
      </Typography>
      <Typography variant="caption" sx={{ color: '#74ca4f', fontWeight: 600 }}>
        SAÚDE
      </Typography>
    </Box>
  </Box>
);

export default function RegisterIndicado() {
  const navigate = useNavigate();
  const { code } = useParams(); // Código de indicação da URL

  // States
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referrerName, setReferrerName] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: ''
  });

  // User e Payment data
  const [newUserId, setNewUserId] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  const steps = ['Seus Dados', 'Ativação', 'Pronto!'];

  // Buscar nome de quem indicou
  useEffect(() => {
    if (code) {
      axios.post(`${API_URL}/referrals/validate/${code}`)
        .then(res => {
          if (res.data.valid) {
            setReferrerName(res.data.referrerName || '');
          }
        })
        .catch(() => {});
    }
  }, [code]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData({ ...formData, [name]: value.replace(/\D/g, '').slice(0, 11) });
    } else if (name === 'telefone') {
      setFormData({ ...formData, [name]: value.replace(/\D/g, '').slice(0, 11) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // ETAPA 1: Cadastrar usuário
  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.cpf.length !== 11) {
      setError('CPF deve ter 11 dígitos.');
      return;
    }

    if (formData.senha.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // Registrar usuário (endpoint público)
      const response = await axios.post(`${API_URL}/auth/register`, {
        ...formData,
        referral_code: code || null
      });

      setNewUserId(response.data.user.id);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ETAPA 2: Gerar carnê
  const handleGeneratePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Endpoint público para gerar carnê de novo usuário
      const response = await axios.post(`${API_URL}/public/generate-installment`, {
        userId: newUserId
      });

      setPaymentData(response.data.installment);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar carnê. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ETAPA 1: Formulário de dados
  const renderStep0 = () => (
    <Box>
      {/* Header persuasivo */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Logo />

        {referrerName && (
          <Chip
            icon={<VerifiedIcon />}
            label={`${referrerName} indicou você!`}
            sx={{
              bgcolor: '#e8f5e9',
              color: '#2e7d32',
              fontWeight: 600,
              mb: 2
            }}
          />
        )}

        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Falta pouco para você <Box component="span" sx={{ color: '#74ca4f' }}>economizar</Box>!
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Preencha seus dados e garanta acesso a descontos exclusivos em saúde
        </Typography>
      </Box>

      {/* Benefícios rápidos */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
        {[
          { icon: <LocalHospitalIcon />, text: 'Até 70% OFF' },
          { icon: <TimerIcon />, text: 'Sem carência' },
          { icon: <SecurityIcon />, text: 'Cancele quando quiser' }
        ].map((item, i) => (
          <Chip
            key={i}
            icon={item.icon}
            label={item.text}
            variant="outlined"
            sx={{ borderColor: '#5287fb', color: '#5287fb' }}
          />
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmitStep1}>
        <TextField
          fullWidth
          required
          label="Seu nome completo"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          margin="normal"
          placeholder="Como está no documento"
        />

        <TextField
          fullWidth
          required
          label="E-mail"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
          placeholder="Seu melhor e-mail"
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              label="CPF"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              margin="normal"
              placeholder="Apenas números"
              inputProps={{ maxLength: 11 }}
              helperText={formData.cpf.length === 11 ? formatCPF(formData.cpf) : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Telefone/WhatsApp"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              margin="normal"
              placeholder="(00) 00000-0000"
              inputProps={{ maxLength: 11 }}
            />
          </Grid>
        </Grid>

        <TextField
          fullWidth
          required
          label="Crie uma senha"
          type="password"
          name="senha"
          value={formData.senha}
          onChange={handleChange}
          margin="normal"
          placeholder="Mínimo 6 caracteres"
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          endIcon={loading ? null : <ArrowForwardIcon />}
          sx={{
            mt: 3,
            py: 1.5,
            bgcolor: '#74ca4f',
            '&:hover': { bgcolor: '#5eb33a' },
            fontWeight: 700,
            fontSize: '1.1rem'
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Continuar'}
        </Button>
      </form>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
      </Typography>
    </Box>
  );

  // ETAPA 2: Ativação
  const renderStep1 = () => (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Logo />

        <Box sx={{ mb: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: '#74ca4f', mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Cadastro realizado!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Agora é só ativar seu cartão para começar a economizar
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Card de preço */}
      <Card sx={{ mb: 3, border: '2px solid #74ca4f', borderRadius: 3 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Chip label="MAIS ESCOLHIDO" color="success" size="small" sx={{ mb: 2 }} />

          <Typography variant="h6" color="text.secondary" gutterBottom>
            Plano Anual
          </Typography>

          <Typography variant="h3" fontWeight="800" color="primary">
            12x R$ 49,90
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Total: R$ 598,80 por ano
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'left' }}>
            {[
              'Consultas médicas com até 70% OFF',
              'Descontos em farmácias e óticas',
              'Programa de pontos e prêmios',
              'Acesso a +200 parceiros',
              'Sem taxa de adesão',
              'Cancele quando quiser'
            ].map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: '#74ca4f', fontSize: 18 }} />
                <Typography variant="body2">{item}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={handleGeneratePayment}
        disabled={loading}
        endIcon={loading ? null : <ArrowForwardIcon />}
        sx={{
          py: 1.5,
          bgcolor: '#74ca4f',
          '&:hover': { bgcolor: '#5eb33a' },
          fontWeight: 700,
          fontSize: '1.1rem'
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Gerar Meu Carnê'}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
        Você receberá 12 boletos para pagar mensalmente
      </Typography>
    </Box>
  );

  // ETAPA 3: Sucesso
  const renderStep2 = () => (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Logo />

        <Box sx={{ mb: 3 }}>
          <CelebrationIcon sx={{ fontSize: 48, color: '#74ca4f', mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Seu cartão está quase pronto!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Pague o primeiro boleto para ativar todos os benefícios
          </Typography>
        </Box>
      </Box>

      <Alert severity="success" icon={<ReceiptLongIcon />} sx={{ mb: 3 }}>
        <strong>{paymentData?.installmentCount || 12} boletos</strong> de <strong>R$ {(paymentData?.installmentValue || 49.90).toFixed(2)}</strong> gerados com sucesso!
      </Alert>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        startIcon={<PrintIcon />}
        onClick={() => {
          if (paymentData?.payments) {
            paymentData.payments.forEach((p, i) =>
              setTimeout(() => window.open(p.invoiceUrl, '_blank'), i * 300)
            );
          }
        }}
        sx={{ mb: 3 }}
      >
        Abrir Todos os Boletos
      </Button>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 280 }}>
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
            {paymentData?.payments?.map((parcela, index) => (
              <TableRow key={parcela.id} hover>
                <TableCell>
                  <Chip
                    label={`${index + 1}/${paymentData.payments.length}`}
                    size="small"
                    color={index === 0 ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {parcela.dueDate
                    ? new Date(parcela.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')
                    : 'N/A'}
                </TableCell>
                <TableCell align="right">R$ {parseFloat(parcela.value).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => window.open(parcela.invoiceUrl, '_blank')}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mb: 3 }}>
        Após o pagamento do primeiro boleto, sua conta será ativada automaticamente em até 24 horas.
      </Alert>

      <Divider sx={{ my: 3 }} />

      <Button
        fullWidth
        variant="outlined"
        onClick={() => navigate('/login')}
        sx={{ mb: 2 }}
      >
        Ir para o Login
      </Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {/* Stepper */}
          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Progress */}
          <LinearProgress
            variant="determinate"
            value={((step + 1) / steps.length) * 100}
            sx={{ mb: 3, borderRadius: 1, height: 6 }}
          />

          {/* Conteúdo */}
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </Paper>
      </Container>
    </Box>
  );
}
