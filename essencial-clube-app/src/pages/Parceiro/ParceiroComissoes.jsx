import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // NOVO: Importar useAuth
import { partnersService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Chip, Divider, List, ListItem, ListItemText, Grid, Button
} from '@mui/material'; // NOVO: Adicionar Button
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import PaidIcon from '@mui/icons-material/Paid';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import SendIcon from '@mui/icons-material/Send'; // NOVO: Ícone para solicitar saque

export default function ParceiroComissoes() {
  const { user } = useAuth(); // NOVO: Obter usuário do contexto
  const [commissionReport, setCommissionReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payoutRequestStatus, setPayoutRequestStatus] = useState(''); // NOVO: Estado para feedback do saque

  useEffect(() => {
    loadCommissionReport();
  }, []);

  const loadCommissionReport = async () => {
    setLoading(true);
    setError('');
    setPayoutRequestStatus(''); // Limpar status ao recarregar
    try {
      const response = await partnersService.getMyReferredClients();
      setCommissionReport(response.data);
    } catch (err) {
      console.error('Erro ao carregar relatório de comissões:', err);
      setError(err.response?.data?.error || 'Erro ao carregar relatório de comissões.');
    } finally {
      setLoading(false);
    }
  };

  // NOVO: Função para solicitar saque
  const handleRequestPayout = async () => {
    setError('');
    setPayoutRequestStatus('pending');
    try {
      const response = await partnersService.requestPayout();
      setPayoutRequestStatus('success');
      loadCommissionReport(); // Recarregar para atualizar o status das comissões
      alert(response.data.message);
    } catch (err) {
      console.error('Erro ao solicitar saque:', err);
      setPayoutRequestStatus('error');
      setError(err.response?.data?.error || 'Erro ao solicitar saque.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const summary = commissionReport?.summary || {};
  const referrals = commissionReport?.referrals || [];

  // NOVO: Lógica para habilitar/desabilitar botão de saque
  const canRequestPayout = summary.pending_commission >= summary.min_payout_amount && summary.pending_commission > 0;
  const requestPayoutButtonText = `Solicitar Saque (Mín: R$ ${summary.min_payout_amount?.toFixed(2)})`;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> {/* NOVO: Flexbox para alinhar título e botão */}
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            Meu Painel de Comissões
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe suas indicações e comissões recebidas
          </Typography>
        </Box>
        {user && user.tipo === 'parceiro' && ( // Apenas parceiros podem solicitar saque
          <Button
            variant="contained"
            color="primary"
            startIcon={payoutRequestStatus === 'pending' ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            onClick={handleRequestPayout}
            disabled={!canRequestPayout || payoutRequestStatus === 'pending'}
          >
            {requestPayoutButtonText}
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {payoutRequestStatus === 'success' && <Alert severity="success" sx={{ mb: 2 }}>Solicitação de saque enviada com sucesso!</Alert>}


      {/* Sumário de Comissões */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Total Indicações</Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">{summary.total_referrals}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AttachMoneyIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Comissão Total</Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">R$ {summary.total_commission?.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PendingActionsIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Total a Receber</Typography> {/* Título atualizado */}
              </Box>
              <Typography variant="h5" fontWeight="bold">R$ {summary.pending_commission?.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PaidIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Já Pago</Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">R$ {summary.paid_commission?.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Lista de Clientes Indicados */}
      <Card>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" component="h2">
            Meus Clientes Indicados
          </Typography>
        </Box>
        <Divider />

        {referrals.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Você ainda não indicou nenhum cliente ou eles ainda não fizeram pagamentos.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>CPF</TableCell>
                  <TableCell>Indicação</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Comissão 1ª Venda</TableCell>
                  <TableCell>Comissão Recorrente</TableCell>
                  <TableCell>Comissão Total</TableCell>
                  <TableCell>Detalhes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {referrals.map((client) => (
                  <React.Fragment key={client.client_id}>
                    <TableRow hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">{client.client_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{client.client_email}</Typography> {/* Assuming email will be part of client object from backend */}
                      </TableCell>
                      <TableCell>{client.client_cpf}</TableCell>
                      <TableCell>{new Date(client.referral_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={client.client_status} color={client.client_status === 'ativo' ? 'success' : 'warning'} size="small" />
                      </TableCell>
                      <TableCell>R$ {client.first_commission?.toFixed(2)}</TableCell>
                      <TableCell>R$ {client.recurring_commission?.toFixed(2)}</TableCell>
                      <TableCell>R$ {client.total_commission?.toFixed(2)}</TableCell>
                      <TableCell>
                        {client.payments && client.payments.length > 0 && (
                          <List dense disablePadding>
                            {client.payments.map((payment, idx) => (
                              <ListItem key={idx} disableGutters>
                                <ListItemText
                                  primary={`Pagamento de R$ ${payment.value?.toFixed(2)} (${payment.type === 'first' ? '1ª' : 'Rec.'})`}
                                  secondary={`Comissão: R$ ${payment.commission?.toFixed(2)} em ${new Date(payment.date).toLocaleDateString()}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Container>
  );
}
