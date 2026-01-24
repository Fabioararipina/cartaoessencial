import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Alert, Tabs, Tab, Divider
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import PendingIcon from '@mui/icons-material/Pending';

export default function MeusBoletos() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0: Todos, 1: Pendentes, 2: Pagos, 3: Vencidos

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await userService.getMyPayments();
      setPayments(response.data.payments || []);
      setSummary(response.data.summary || null);
    } catch (err) {
      console.error('Erro ao buscar boletos:', err);
      setError('Erro ao carregar seus boletos.');
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

  const filteredPayments = () => {
    switch (tabValue) {
      case 1: return payments.filter(p => p.status === 'pending');
      case 2: return payments.filter(p => ['received', 'confirmed'].includes(p.status));
      case 3: return payments.filter(p => p.status === 'overdue');
      default: return payments;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando boletos...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          Meus Boletos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Acompanhe seus boletos e parcelas do carnê
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Resumo */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: 140 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {summary.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">Total de Boletos</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, minWidth: 140 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {summary.pending}
              </Typography>
              <Typography variant="caption" color="text.secondary">Pendentes</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, minWidth: 140 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {summary.paid}
              </Typography>
              <Typography variant="caption" color="text.secondary">Pagos</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, minWidth: 140 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" color="error.main" fontWeight="bold">
                R$ {(summary.totalPending || 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">A Pagar</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tabs de filtro */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label={`Todos (${payments.length})`} />
        <Tab label={`Pendentes (${summary?.pending || 0})`} />
        <Tab label={`Pagos (${summary?.paid || 0})`} />
        <Tab label={`Vencidos (${summary?.overdue || 0})`} />
      </Tabs>

      {/* Lista de boletos */}
      {filteredPayments().length === 0 ? (
        <Alert severity="info">
          {tabValue === 0
            ? 'Nenhum boleto encontrado.'
            : 'Nenhum boleto nesta categoria.'}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><strong>#</strong></TableCell>
                <TableCell><strong>Vencimento</strong></TableCell>
                <TableCell align="right"><strong>Valor</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Ação</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments().map((payment, index) => (
                <TableRow key={payment.id} hover>
                  <TableCell>
                    <Chip label={index + 1} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {payment.due_date
                      ? new Date(payment.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
                      : 'N/A'}
                    {payment.payment_date && (
                      <Typography variant="caption" display="block" color="success.main">
                        Pago em {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                      </Typography>
                    )}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
        Clique no ícone de link para abrir e imprimir cada boleto.
        Em caso de dúvidas, entre em contato com o suporte.
      </Typography>
    </Container>
  );
}
