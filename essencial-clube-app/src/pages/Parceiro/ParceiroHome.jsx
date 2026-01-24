import React, { useState, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { partnersService, authService } from '../../services/api'; // authService foi adicionado aqui
import {
  Container, Box, Typography, CircularProgress, Grid, Card, CardContent,
  List, ListItem, ListItemText, Divider, Button, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StarIcon from '@mui/icons-material/Star';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HistoryIcon from '@mui/icons-material/History';
import PersonAddIcon from '@mui/icons-material/PersonAdd'; // Importar PersonAddIcon

export default function ParceiroHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_transacoes: 0,
    valor_total: 0,
    pontos_total: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para o diálogo de novo cliente
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    tipo: 'cliente', // Parceiros só podem cadastrar clientes
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await partnersService.getMyTransactions({ limit: 100 });
      setStats(response.data.stats);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas derivadas
  const metrics = useMemo(() => {
    const ticketMedio = stats.total_transacoes > 0
      ? stats.valor_total / stats.total_transacoes
      : 0;

    // Transações dos últimos 7 dias
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

    const transacoesUltimos7Dias = transactions.filter(t =>
      new Date(t.data_compra) >= seteDiasAtras
    );

    // Transações dos 7 dias anteriores (para comparação)
    const quatorzeDiasAtras = new Date(hoje.getTime() - 14 * 24 * 60 * 60 * 1000);
    const transacoes7a14Dias = transactions.filter(t => {
      const data = new Date(t.data_compra);
      return data >= quatorzeDiasAtras && data < seteDiasAtras;
    });

    const crescimento = transacoes7a14Dias.length > 0
      ? ((transacoesUltimos7Dias.length - transacoes7a14Dias.length) / transacoes7a14Dias.length) * 100
      : transacoesUltimos7Dias.length > 0 ? 100 : 0;

    // Clientes únicos
    const clientesUnicos = new Set(transactions.map(t => t.cliente_cpf)).size;

    // Dados para gráfico de barras (últimos 7 dias)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
      const diaStr = dia.toISOString().split('T')[0];
      const count = transactions.filter(t =>
        t.data_compra.split('T')[0] === diaStr
      ).length;
      chartData.push({
        dia: dia.toLocaleDateString('pt-BR', { weekday: 'short' }),
        count,
      });
    }

    const maxCount = Math.max(...chartData.map(d => d.count), 1);

    return {
      ticketMedio,
      transacoesUltimos7Dias: transacoesUltimos7Dias.length,
      crescimento,
      clientesUnicos,
      chartData,
      maxCount,
    };
  }, [stats, transactions]);

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

  const handleNewClientChange = (field) => (e) => {
    setNewClientData({ ...newClientData, [field]: e.target.value });
  };

  // Estado para mostrar resultado do cadastro com assinatura
  const [newClientResult, setNewClientResult] = useState(null);

  const handleCreateClient = async () => {
    setSaving(true);
    setFormError('');
    setNewClientResult(null);

    if (!newClientData.nome || !newClientData.email || !newClientData.senha || !newClientData.cpf) {
      setFormError('Preencha todos os campos obrigatórios');
      setSaving(false);
      return;
    }

    try {
      // 1. Cadastrar o cliente
      const registerResponse = await authService.register(newClientData);
      const newUserId = registerResponse.data.user.id;

      // 2. Criar carnê de 12 parcelas (boletos)
      const installmentResponse = await partnersService.createInstallment({
        userId: newUserId,
        description: `Plano Anual (Carnê) Essencial Saúde - ${newClientData.nome}`,
      });

      setNewClientResult({
        success: true,
        cliente: newClientData.nome,
        installment: installmentResponse.data.installment
      });

      // Reset form mas mantém dialog aberto para mostrar resultado
      setNewClientData({ nome: '', email: '', cpf: '', senha: '', tipo: 'cliente' });
    } catch (error) {
      setFormError(error.response?.data?.error || 'Erro ao cadastrar cliente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            Olá, {user?.nome?.split(' ')[0]}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o desempenho da sua parceria
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => setNewClientDialog(true)}
            sx={{ px: 3, py: 1.5 }}
          >
            Cadastrar Cliente
          </Button>
          <Button
            component={RouterLink}
            to="/parceiro/lancar"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              background: 'linear-gradient(45deg, #5287fb 30%, #74ca4f 90%)',
              px: 3,
              py: 1.5,
            }}
          >
            Nova Transação
          </Button>
        </Box>
      </Box>

      {/* KPIs Principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <ReceiptIcon color="primary" />
                {metrics.crescimento !== 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {metrics.crescimento > 0 ? (
                      <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                    )}
                    <Typography variant="caption" color={metrics.crescimento > 0 ? 'success.main' : 'error.main'}>
                      {metrics.crescimento > 0 ? '+' : ''}{metrics.crescimento.toFixed(0)}%
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {stats.total_transacoes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Transações
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StarIcon color="secondary" />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">
                {stats.pontos_total.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pontos Lançados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoneyIcon color="action" />
              </Box>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(stats.valor_total)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Valor Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="info" />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {metrics.clientesUnicos}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clientes Atendidos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Gráfico de Transações */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="medium" gutterBottom>
                Transações - Últimos 7 dias
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {metrics.transacoesUltimos7Dias} transações realizadas
              </Typography>

              {/* Gráfico de Barras Simples */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, gap: 1 }}>
                {metrics.chartData.map((item, index) => (
                  <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      {item.count}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 40,
                        height: `${(item.count / metrics.maxCount) * 100}%`,
                        minHeight: item.count > 0 ? 8 : 4,
                        bgcolor: item.count > 0 ? 'primary.main' : 'grey.200',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textTransform: 'capitalize' }}>
                      {item.dia}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Métricas Adicionais */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="medium" gutterBottom>
                Indicadores
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Ticket Médio
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {formatCurrency(metrics.ticketMedio)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((metrics.ticketMedio / 200) * 100, 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Média de Pontos/Transação
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {stats.total_transacoes > 0
                        ? Math.round(stats.pontos_total / stats.total_transacoes)
                        : 0} pts
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(((stats.pontos_total / Math.max(stats.total_transacoes, 1)) / 50) * 100, 100)}
                    color="secondary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Transações/Cliente
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {metrics.clientesUnicos > 0
                        ? (stats.total_transacoes / metrics.clientesUnicos).toFixed(1)
                        : 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(((stats.total_transacoes / Math.max(metrics.clientesUnicos, 1)) / 5) * 100, 100)}
                    color="info"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Últimas Transações */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Typography variant="h6" fontWeight="medium">
                Últimas Transações
              </Typography>
              <Button
                component={RouterLink}
                to="/parceiro/historico"
                size="small"
                startIcon={<HistoryIcon />}
              >
                Ver histórico completo
              </Button>
            </Box>
            <Divider />

            {transactions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma transação realizada ainda
                </Typography>
                <Button
                  component={RouterLink}
                  to="/parceiro/lancar"
                  variant="outlined"
                  sx={{ mt: 2 }}
                >
                  Fazer primeira transação
                </Button>
              </Box>
            ) : (
              <List disablePadding>
                {transactions.slice(0, 5).map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemText
                        primary={item.cliente_nome}
                        secondary={formatDate(item.data_compra)}
                        primaryTypographyProps={{ fontWeight: 'medium', variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="secondary.main">
                          +{item.points_awarded} pts
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(item.valor_compra)}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < Math.min(transactions.length, 5) - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Dialog Novo Cliente */}
      <Dialog open={newClientDialog} onClose={() => { setNewClientDialog(false); setNewClientResult(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{newClientResult ? 'Cliente Cadastrado!' : 'Cadastrar Novo Cliente'}</DialogTitle>
        <DialogContent>
          {newClientResult ? (
            // Mostrar resultado do cadastro com carnê
            <Box sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Cliente <strong>{newClientResult.cliente}</strong> cadastrado com sucesso! Carnê de 12 parcelas gerado.
              </Alert>

              {newClientResult.installment?.payments && newClientResult.installment.payments.length > 0 && (
                <>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mb: 2 }}
                    onClick={() => {
                      newClientResult.installment.payments.forEach((p, index) => {
                        setTimeout(() => window.open(p.invoiceUrl, '_blank'), index * 300);
                      });
                    }}
                  >
                    Abrir Todos os Boletos para Impressão
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {newClientResult.installment.payments.length} parcelas de R$ {newClientResult.installment.installmentValue?.toFixed(2)}
                  </Typography>
                </>
              )}
            </Box>
          ) : (
            // Formulário de cadastro
            <Box component="form" sx={{ pt: 1 }}>
              {formError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {formError}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Nome Completo"
                    value={newClientData.nome}
                    onChange={handleNewClientChange('nome')}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Email"
                    type="email"
                    value={newClientData.email}
                    onChange={handleNewClientChange('email')}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="CPF (apenas números)"
                    value={newClientData.cpf}
                    onChange={handleNewClientChange('cpf')}
                    margin="normal"
                    inputProps={{ maxLength: 11 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Senha"
                    type="password"
                    value={newClientData.senha}
                    onChange={handleNewClientChange('senha')}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {newClientResult ? (
            <Button onClick={() => { setNewClientDialog(false); setNewClientResult(null); }} variant="contained">
              Fechar
            </Button>
          ) : (
            <>
              <Button onClick={() => setNewClientDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleCreateClient}
                variant="contained"
                disabled={saving}
              >
                {saving ? <CircularProgress size={20} /> : 'Cadastrar Cliente'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
