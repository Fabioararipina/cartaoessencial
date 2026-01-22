import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Button, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [processing, setProcessing] = useState(false);

  const statusMap = {
    0: null, // Todos
    1: 'pending',
    2: 'approved',
    3: 'rejected'
  };

  useEffect(() => {
    loadPayouts();
  }, [tabValue]);

  const loadPayouts = async () => {
    setLoading(true);
    setError('');
    try {
      const status = statusMap[tabValue];
      const response = await adminService.getPayouts(status);
      setPayouts(response.data.payoutRequests || []);
    } catch (err) {
      console.error('Erro ao carregar solicitações de saque:', err);
      setError(err.response?.data?.error || 'Erro ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payoutId) => {
    if (!window.confirm('Confirma a aprovação deste saque? Isso marcará as comissões como pagas.')) return;

    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      await adminService.approvePayoutRequest(payoutId);
      setSuccess('Saque aprovado com sucesso!');
      loadPayouts();
    } catch (err) {
      console.error('Erro ao aprovar saque:', err);
      setError(err.response?.data?.error || 'Erro ao aprovar saque.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (payout) => {
    setSelectedPayout(payout);
    setRejectMotivo('');
    setRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedPayout) return;

    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      await adminService.rejectPayoutRequest(selectedPayout.id, rejectMotivo);
      setSuccess('Saque rejeitado. As comissões foram liberadas para nova solicitação.');
      setRejectOpen(false);
      loadPayouts();
    } catch (err) {
      console.error('Erro ao rejeitar saque:', err);
      setError(err.response?.data?.error || 'Erro ao rejeitar saque.');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = (payout) => {
    setSelectedPayout(payout);
    setDetailsOpen(true);
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { color: 'warning', label: 'Pendente' },
      approved: { color: 'success', label: 'Aprovado' },
      rejected: { color: 'error', label: 'Rejeitado' },
      paid: { color: 'info', label: 'Pago' },
      cancelled: { color: 'default', label: 'Cancelado' }
    };
    const { color, label } = config[status] || { color: 'default', label: status };
    return <Chip label={label} color={color} size="small" />;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const renderPayoutInfo = (payoutMethod) => {
    if (!payoutMethod) return 'Não informado';
    return (
      <Box>
        {payoutMethod.tipo_chave && (
          <Typography variant="body2"><strong>Tipo:</strong> {payoutMethod.tipo_chave}</Typography>
        )}
        {payoutMethod.chave_pix && (
          <Typography variant="body2"><strong>Chave PIX:</strong> {payoutMethod.chave_pix}</Typography>
        )}
        {payoutMethod.nome_titular && (
          <Typography variant="body2"><strong>Titular:</strong> {payoutMethod.nome_titular}</Typography>
        )}
        {payoutMethod.banco && (
          <Typography variant="body2"><strong>Banco:</strong> {payoutMethod.banco}</Typography>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight="bold">
            Gestão de Saques
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadPayouts}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Todos" />
          <Tab label="Pendentes" />
          <Tab label="Aprovados" />
          <Tab label="Rejeitados" />
        </Tabs>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : payouts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhuma solicitação de saque encontrada.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Solicitante</strong></TableCell>
                    <TableCell><strong>Valor</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Data Solicitação</strong></TableCell>
                    <TableCell><strong>Data Processamento</strong></TableCell>
                    <TableCell align="center"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id} hover>
                      <TableCell>#{payout.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {payout.user_nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {payout.user_email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold" color="success.main">
                          {formatCurrency(payout.request_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(payout.status)}</TableCell>
                      <TableCell>{formatDate(payout.created_at)}</TableCell>
                      <TableCell>{formatDate(payout.processed_at)}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver detalhes">
                            <IconButton size="small" onClick={() => handleViewDetails(payout)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {payout.status === 'pending' && (
                            <>
                              <Tooltip title="Aprovar saque">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleApprove(payout.id)}
                                  disabled={processing}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Rejeitar saque">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRejectClick(payout)}
                                  disabled={processing}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Detalhes do Saque */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes da Solicitação #{selectedPayout?.id}</DialogTitle>
        <DialogContent dividers>
          {selectedPayout && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Solicitante</Typography>
                <Typography variant="body1">{selectedPayout.user_nome}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedPayout.user_email}</Typography>
                <Chip label={selectedPayout.user_tipo} size="small" sx={{ mt: 0.5, textTransform: 'capitalize' }} />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">Valor Solicitado</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatCurrency(selectedPayout.request_amount)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                {getStatusChip(selectedPayout.status)}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">Dados para Pagamento (PIX)</Typography>
                {renderPayoutInfo(selectedPayout.payout_method)}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">Data da Solicitação</Typography>
                <Typography variant="body1">{formatDate(selectedPayout.created_at)}</Typography>
              </Box>

              {selectedPayout.processed_at && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Data do Processamento</Typography>
                  <Typography variant="body1">{formatDate(selectedPayout.processed_at)}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
          {selectedPayout?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  setDetailsOpen(false);
                  handleApprove(selectedPayout.id);
                }}
                disabled={processing}
              >
                Aprovar
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setDetailsOpen(false);
                  handleRejectClick(selectedPayout);
                }}
                disabled={processing}
              >
                Rejeitar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog: Rejeitar Saque */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rejeitar Solicitação de Saque</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Ao rejeitar, as comissões vinculadas serão liberadas para o parceiro solicitar novamente.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Solicitação #{selectedPayout?.id} - {selectedPayout?.user_nome} - {formatCurrency(selectedPayout?.request_amount || 0)}
          </Typography>
          <TextField
            fullWidth
            label="Motivo da Rejeição (opcional)"
            multiline
            rows={3}
            value={rejectMotivo}
            onChange={(e) => setRejectMotivo(e.target.value)}
            placeholder="Informe o motivo da rejeição..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectConfirm}
            disabled={processing}
          >
            {processing ? <CircularProgress size={24} /> : 'Confirmar Rejeição'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
