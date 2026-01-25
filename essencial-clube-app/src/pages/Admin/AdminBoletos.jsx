import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  TextField, Button, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Tabs, Tab, Pagination, Grid, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SyncIcon from '@mui/icons-material/Sync';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import PendingIcon from '@mui/icons-material/Pending';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ClearIcon from '@mui/icons-material/Clear';

export default function AdminBoletos() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pendentes: 0,
    pagos: 0,
    vencidos: 0,
    valorPendente: 0,
    valorPago: 0,
    valorVencido: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    carregarBoletos();
  }, [statusFilter, searchQuery, page]);

  const carregarBoletos = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        limit: itemsPerPage,
        offset: (page - 1) * itemsPerPage
      };

      if (statusFilter !== 'todos') {
        params.status = statusFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await adminService.getAllPayments(params);

      setPayments(response.data.payments || []);
      setSummary(response.data.summary || {});
      setTotalItems(response.data.pagination?.total || 0);
      setTotalPages(Math.ceil((response.data.pagination?.total || 0) / itemsPerPage));
    } catch (err) {
      console.error('Erro ao carregar boletos:', err);
      setError(err.response?.data?.error || 'Erro ao carregar boletos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const handleStatusChange = (event, newValue) => {
    setStatusFilter(newValue);
    setPage(1);
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      await adminService.deletePayment(paymentId);
      setSuccess('Pagamento deletado com sucesso!');
      setDeleteConfirm(null);
      await carregarBoletos();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar pagamento.');
    }
  };

  const sincronizarBoletos = async (userId) => {
    try {
      setSyncing(userId);
      setError('');
      setSuccess('');
      const response = await adminService.syncUserPayments(userId);
      setSuccess(`Sincronizado! ${response.data.inserted} novos, ${response.data.updated} atualizados, ${response.data.deleted || 0} removidos.`);
      await carregarBoletos();
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setError(err.response?.data?.error || 'Erro ao sincronizar com o Asaas.');
    } finally {
      setSyncing(null);
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

  const formatCPF = (cpf) => {
    if (!cpf) return 'N/A';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLongIcon color="primary" />
          Gestão de Boletos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visão geral de todos os boletos do sistema
        </Typography>
      </Box>

      {/* Cards de Resumo */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #5287fb 0%, #3d6fd9 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ReceiptLongIcon sx={{ fontSize: 32, opacity: 0.8, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{summary.total}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Total de Boletos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <PendingIcon sx={{ fontSize: 32, opacity: 0.8, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{summary.pendentes}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Pendentes</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{formatCurrency(summary.valorPendente)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #74ca4f 0%, #4caf50 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 32, opacity: 0.8, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{summary.pagos}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Pagos</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{formatCurrency(summary.valorPago)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ErrorOutlineIcon sx={{ fontSize: 32, opacity: 0.8, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{summary.vencidos}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Vencidos</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{formatCurrency(summary.valorVencido)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Tabs de Status */}
          <Tabs
            value={statusFilter}
            onChange={handleStatusChange}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Todos (${summary.total})`} value="todos" />
            <Tab label={`Pendentes (${summary.pendentes})`} value="pending" />
            <Tab label={`Pagos (${summary.pagos})`} value="pagos" />
            <Tab label={`Vencidos (${summary.vencidos})`} value="overdue" />
          </Tabs>

          {/* Busca */}
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Buscar por nome, CPF ou email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ex: João Silva, 12345678900, email@email.com"
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ flex: 1, maxWidth: 400 }}
              size="small"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={<SearchIcon />}
            >
              Buscar
            </Button>
            {searchQuery && (
              <Chip
                label={`Filtrando: "${searchQuery}"`}
                onDelete={handleClearSearch}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Mensagens */}
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Tabela de Boletos */}
      {!loading && (
        <>
          {payments.length === 0 ? (
            <Alert severity="info">Nenhum boleto encontrado com os filtros selecionados.</Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Cliente</strong></TableCell>
                      <TableCell><strong>CPF</strong></TableCell>
                      <TableCell><strong>Vencimento</strong></TableCell>
                      <TableCell><strong>Tipo</strong></TableCell>
                      <TableCell align="right"><strong>Valor</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Ações</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {payment.cliente_nome || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {payment.user_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatCPF(payment.cliente_cpf)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(payment.due_date)}
                          </Typography>
                          {payment.payment_date && (
                            <Typography variant="caption" display="block" color="success.main">
                              Pago: {formatDate(payment.payment_date)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.billing_type || 'N/A'}
                            size="small"
                            variant="outlined"
                            color={payment.billing_type === 'BOLETO' ? 'info' : payment.billing_type === 'PIX' ? 'secondary' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="medium" color={payment.status === 'overdue' ? 'error.main' : 'text.primary'}>
                            {formatCurrency(payment.valor)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {getStatusChip(payment.status)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            {payment.invoice_url && (
                              <Tooltip title="Abrir boleto">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => window.open(payment.invoice_url, '_blank')}
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Sincronizar com Asaas">
                              <IconButton
                                color="secondary"
                                size="small"
                                onClick={() => sincronizarBoletos(payment.user_id)}
                                disabled={syncing === payment.user_id}
                              >
                                {syncing === payment.user_id ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <SyncIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            {user?.tipo === 'admin' && payment.status === 'pending' && (
                              <Tooltip title="Deletar boleto">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => setDeleteConfirm(payment.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Paginação */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {Math.min((page - 1) * itemsPerPage + 1, totalItems)} a {Math.min(page * itemsPerPage, totalItems)} de {totalItems} boletos
                </Typography>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </>
          )}
        </>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
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
