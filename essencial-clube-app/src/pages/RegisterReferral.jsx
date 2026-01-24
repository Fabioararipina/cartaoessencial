import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Box, Typography, TextField, Button, CircularProgress,
  Alert, Stepper, Step, StepLabel, Paper, Divider,
  Grid, InputAdornment
} from '@mui/material';
import { CheckCircle, Person, Home, Lock, CreditCard } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


const steps = ['Dados Pessoais', 'Endereço', 'Sua Senha', 'Pagamento'];
const stepIcons = {
  1: <Person />,
  2: <Home />,
  3: <Lock />,
  4: <CreditCard />,
};

function RegisterReferral() {
  const { referralCode } = useParams();
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    senha: '',
    confirmarSenha: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cepError, setCepError] = useState('');
  const [newUser, setNewUser] = useState(null); // Armazenar dados do usuário recém-criado
  const [paymentInfo, setPaymentInfo] = useState(null); // Armazenar dados do carnê gerado

  useEffect(() => {
    if (!referralCode) {
      setError('Código de indicação não encontrado. Por favor, use o link fornecido.');
    } else {
        localStorage.setItem('referral_code', referralCode);
    }
  }, [referralCode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCepChange = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep }));
    
    if (cep.length === 8) {
      setLoading(true);
      setCepError('');
      try {
        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (response.data.erro) {
          setCepError('CEP não encontrado.');
        } else {
          setFormData(prev => ({
            ...prev,
            logradouro: response.data.logradouro,
            bairro: response.data.bairro,
            cidade: response.data.localidade,
            estado: response.data.uf,
          }));
        }
      } catch (err) {
        setCepError('Erro ao buscar CEP. Verifique e tente novamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  const validateStep = () => {
    setError('');
    switch (activeStep) {
      case 0:
        if (!formData.nome || !formData.cpf || !formData.email || !formData.telefone) {
          setError('Por favor, preencha todos os campos.');
          return false;
        }
        return true;
      case 1:
        if (!formData.cep || !formData.logradouro || !formData.numero || !formData.bairro || !formData.cidade || !formData.estado) {
            setError('Por favor, preencha todos os campos de endereço.');
            return false;
        }
        return true;
      case 2:
        if (!formData.senha || !formData.confirmarSenha) {
          setError('Por favor, defina e confirme sua senha.');
          return false;
        }
        if (formData.senha !== formData.confirmarSenha) {
          setError('As senhas não coincidem.');
          return false;
        }
        if (formData.senha.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleRegister = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError('');

    const registrationData = {
        nome: formData.nome,
        cpf: formData.cpf,
        email: formData.email,
        telefone: formData.telefone,
        senha: formData.senha,
        referral_code: referralCode
    };

    try {
        const response = await publicApi.post('/auth/register', registrationData);
        setNewUser(response.data.user);
        handleNext();
    } catch (err) {
        setError(err.response?.data?.error || 'Ocorreu um erro ao registrar. Tente novamente.');
    } finally {
        setLoading(false);
    }
  };
  
  const handlePayment = async () => {
    setLoading(true);
    setError('');
    try {
        const response = await publicApi.post('/asaas/public/installments', {
            userId: newUser.id,
            description: `Plano Anual Essencial Saúde - ${newUser.nome}`
        });
        setPaymentInfo(response.data.installment);
        // Não ir para o próximo passo, o passo final já mostra as informações
    } catch (err) {
        setError(err.response?.data?.error || 'Ocorreu um erro ao gerar seu carnê. Por favor, contate o suporte.');
    } finally {
        setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0: // Dados Pessoais
        return (
          <>
            <Typography variant="h5" gutterBottom>Vamos começar!</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Preencha seus dados para garantir os benefícios exclusivos da sua indicação.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField fullWidth name="nome" label="Nome Completo" value={formData.nome} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth name="cpf" label="CPF" value={formData.cpf} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth name="email" label="E-mail" type="email" value={formData.email} onChange={handleInputChange} /></Grid>
              <Grid item xs={12}><TextField fullWidth name="telefone" label="Telefone / WhatsApp" value={formData.telefone} onChange={handleInputChange} /></Grid>
            </Grid>
          </>
        );
      case 1: // Endereço
        return (
            <>
                <Typography variant="h5" gutterBottom>Onde você mora?</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Precisamos do seu endereço para correspondência e validação.
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="cep" label="CEP" value={formData.cep} onChange={handleCepChange} 
                        error={!!cepError} helperText={cepError} InputProps={{ endAdornment: loading && <InputAdornment position="end"><CircularProgress size={20} /></InputAdornment> }} />
                    </Grid>
                    <Grid item xs={12} sm={6} />
                    <Grid item xs={12}><TextField fullWidth name="logradouro" label="Rua / Avenida" value={formData.logradouro} onChange={handleInputChange} InputLabelProps={{ shrink: !!formData.logradouro }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth name="numero" label="Número" value={formData.numero} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth name="complemento" label="Complemento (Opcional)" value={formData.complemento} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth name="bairro" label="Bairro" value={formData.bairro} onChange={handleInputChange} InputLabelProps={{ shrink: !!formData.bairro }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField fullWidth name="cidade" label="Cidade" value={formData.cidade} onChange={handleInputChange} InputLabelProps={{ shrink: !!formData.cidade }} /></Grid>
                    <Grid item xs={12} sm={2}><TextField fullWidth name="estado" label="UF" value={formData.estado} onChange={handleInputChange} InputLabelProps={{ shrink: !!formData.estado }} /></Grid>
                </Grid>
            </>
        );
      case 2: // Senha
        return (
            <>
                <Typography variant="h5" gutterBottom>Crie sua senha de acesso</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Ela será usada para você acessar seu painel e acompanhar seus benefícios.
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}><TextField fullWidth name="senha" label="Senha" type="password" value={formData.senha} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12}><TextField fullWidth name="confirmarSenha" label="Confirmar Senha" type="password" value={formData.confirmarSenha} onChange={handleInputChange} /></Grid>
                </Grid>
            </>
        );
      case 3: // Pagamento
        return (
            <>
                <Typography variant="h5" gutterBottom>Último passo: Pagamento</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Seu cadastro foi realizado com sucesso! Para ativar seus benefícios, gere seu carnê de pagamento anual.
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography fontWeight="bold">{newUser?.nome}</Typography>
                    <Typography color="text.secondary" variant="body2">{newUser?.email}</Typography>
                    <Typography color="text.secondary" variant="body2">CPF: {newUser?.cpf}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                     <Typography variant="h6">Plano Anual - Essencial Saúde</Typography>
                     <Typography variant="h4" color="primary" fontWeight="bold">12x de R$ 49,90</Typography>
                     <Typography variant="body2">Acesso a todos os benefícios por 1 ano.</Typography>
                </Paper>
                 {!paymentInfo && (
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        sx={{ mt: 3 }}
                        onClick={handlePayment}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Gerar Carnê e Finalizar'}
                    </Button>
                 )}
                 {paymentInfo && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Alert severity="success" icon={<CheckCircle />}>
                            <Typography fontWeight="bold">Parabéns! Seu carnê foi gerado.</Typography>
                        </Alert>
                        <Typography sx={{ mt: 2 }}>
                            Acesse o link abaixo para ver todas as parcelas e efetuar o pagamento da primeira para ativar seu plano.
                        </Typography>
                        <Button 
                            variant="contained"
                            color="secondary"
                            href={paymentInfo.bankSlipUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            sx={{ mt: 2 }}
                        >
                            Ver Meu Carnê
                        </Button>
                        <Typography variant="body2" sx={{ mt: 3 }}>
                            Após o pagamento da primeira parcela, seu acesso ao painel será liberado em alguns minutos.
                        </Typography>
                    </Box>
                 )}
            </>
        );
      default:
        return 'Passo desconhecido';
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ my: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          Cadastro de Indicado
        </Typography>
        <Stepper activeStep={activeStep} sx={{ my: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel StepIconComponent={(props) => stepIcons[props.icon]}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ minHeight: 300, p: 2 }}>
            {getStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0 || activeStep === 3}
            onClick={handleBack}
          >
            Voltar
          </Button>

          {activeStep < 2 && (
            <Button variant="contained" onClick={handleNext}>Próximo</Button>
          )}

          {activeStep === 2 && (
            <Button variant="contained" onClick={handleRegister} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Salvar e ir para Pagamento'}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default RegisterReferral;
