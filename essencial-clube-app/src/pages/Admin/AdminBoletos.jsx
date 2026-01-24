import React, { useState } from 'react';
import { adminService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext'; // Importar useAuth
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  TextField, Button, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, Divider, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PrintIcon from '@mui/icons-material/Print';
import SyncIcon from '@mui/icons-material/Sync';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import PendingIcon from '@mui/icons-material/Pending';
import DeleteIcon from '@mui/icons-material/Delete';

export default function AdminBoletos() {
  const { user } = useAuth(); // Obter o usuário do contexto
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUserId, setFoundUserId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searched, setSearched] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDeletePayment = async (paymentId) => {
      try {
          await adminService.deletePayment(paymentId);
          setSuccess('Pagamento deletado com sucesso!');
          setDeleteConfirm(null);
          await buscarBoletos(); // Recarregar lista
      } catch (err) {
          setError(err.response?.data?.error || 'Erro ao deletar pagamento.');
      }
  };

  const sincronizarBoletos = async () => {
    if (!foundUserId) return;

    try {
      setSyncing(true);
      setError('');
      setSuccess('');
      const response = await adminService.syncUserPayments(foundUserId);
      setSuccess(`Sincronizado! ${response.data.inserted} novos, ${response.data.updated} atualizados de ${response.data.totalFromAsaas} boletos no Asaas.`);
      // Recarregar a lista
      await buscarBoletos();
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setError(err.response?.data?.error || 'Erro ao sincronizar com o Asaas.');
    } finally {
      setSyncing(false);
    }
  };

  const buscarBoletos = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      setError('Informe o ID, CPF ou Email do usuário');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSearched(true);
      const response = await adminService.searchUserPayments(searchQuery);
      setPayments(response.data.payments || []);
      setFoundUserId(response.data.user?.id || null);

      // Pegar info do cliente da resposta
      if (response.data.user) {
        setClienteInfo({
          id: response.data.user.id,
          nome: response.data.user.nome,
          cpf: response.data.user.cpf,
          email: response.data.user.email
        });
      } else {
        setClienteInfo(null);
      }
    } catch (err) {
      console.error('Erro ao buscar boletos:', err);
      setError(err.response?.data?.error || 'Erro ao buscar boletos do usuário.');
      setPayments([]);
      setClienteInfo(null);
      setFoundUserId(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const statusMap = {
      pending: { label: 'Pendente', color: 'warning', icon: <PendingIcon fontSize="small" /> },
      received: { label: 'Pago', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
      confirmed: { label: 'Confirmado', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
      overdue: { label: 'Vencido', color: 'error', icon: <WarningIcon fontSize="small" /> },
    };
    const config = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
  };

  const handlePrintAll = () => {
    const pendingPayments = payments.filter(p => p.status === 'pending' && p.invoice_url);
    if (pendingPayments.length === 0) {
      alert('Nenhum boleto pendente para imprimir.');
      return;
    }
    pendingPayments.forEach((payment, index) => {
      setTimeout(() => {
        window.open(payment.invoice_url, '_blank');
      }, index * 300);
    });
  };

  const summary = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    paid: payments.filter(p => ['received', 'confirmed'].includes(p.status)).length,
    overdue: payments.filter(p => p.status === 'overdue').length,
    totalPending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.valor), 0)
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLongIcon color="primary" />
          Consultar Boletos de Cliente
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Busque e imprima os boletos/carnê de qualquer cliente
        </Typography>
      </Box>

      {/* Formulário de busca */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box component="form" onSubmit={buscarBoletos} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="ID, CPF ou Email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: 23, 12345678900 ou email@email.com"
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
              }}
              sx={{ minWidth: 300 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !searchQuery.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              Buscar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {searched && !loading && payments.length === 0 && !error && (
        <Alert severity="info">Nenhum boleto encontrado para este usuário.</Alert>
      )}

      {clienteInfo && (
        <>
          {/* Info do Cliente */}
          <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6">{clienteInfo.nome}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    CPF: {clienteInfo.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')} | ID: {clienteInfo.id}
                  </Typography>
                  {clienteInfo.email && (
                    <Typography variant="body2" color="text.secondary">
                      Email: {clienteInfo.email}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                    onClick={sincronizarBoletos}
                    disabled={syncing}
                  >
                    Sincronizar com Asaas
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PrintIcon />}
                    onClick={handlePrintAll}
                    disabled={summary.pending === 0}
                  >
                    Imprimir {summary.pending} Boleto(s)
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 120 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary.main" fontWeight="bold">{summary.total}</Typography>
                <Typography variant="caption" color="text.secondary">Total</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 120 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">{summary.pending}</Typography>
                <Typography variant="caption" color="text.secondary">Pendentes</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 120 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">{summary.paid}</Typography>
                <Typography variant="caption" color="text.secondary">Pagos</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 120 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="error.main" fontWeight="bold">
                  R$ {summary.totalPending.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">A Receber</Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Tabela de boletos */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>#</strong></TableCell>
                  <TableCell><strong>Vencimento</strong></TableCell>
                  <TableCell><strong>Tipo</strong></TableCell>
                  <TableCell align="right"><strong>Valor</strong></TableCell>
                  <TableCell align="center"><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Ação</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      <Chip label={index + 1} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {payment.due_date
                        ? new Date(payment.due_date).toLocaleDateString('pt-BR')
                        : 'N/A'}
                      {payment.payment_date && (
                        <Typography variant="caption" display="block" color="success.main">
                          Pago: {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.billing_type || 'N/A'}
                        size="small"
                        variant="outlined"
                        color={payment.billing_type === 'BOLETO' ? 'info' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        R$ {parseFloat(payment.valor).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(payment.status)}
                    </TableCell>
                    <TableCell align="center">
                      {payment.invoice_url && (
                        <IconButton
                          color="primary"
                          onClick={() => window.open(payment.invoice_url, '_blank')}
                          title="Abrir boleto"
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      )}
                      {user?.tipo === 'admin' && payment.status === 'pending' && (
                          <IconButton
                              color="error"
                              onClick={() => setDeleteConfirm(payment.id)}
                              title="Deletar boleto"
                          >
                              <DeleteIcon />
                          </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

        {/* Dialog de confirmação */}
        <Dialog
            open={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
        >
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Tem certeza que deseja deletar este boleto? Esta ação também o removerá
                    do Asaas (se pendente) e não pode ser desfeita.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                <Button onClick={() => handleDeletePayment(deleteConfirm)} color="error" autoFocus>
                    Deletar
                </Button>
            </DialogActions>
        </Dialog>
    </Container>
  );
}
