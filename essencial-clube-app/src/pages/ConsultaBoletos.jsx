import React, { useState } from 'react';
import {
  Container, Box, Typography, TextField, Button, Card, CardContent,
  CircularProgress, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import api from '../services/api';

// Logo
const Logo = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <FavoriteIcon sx={{ color: '#74ca4f', fontSize: 36 }} />
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ color: '#5287fb', lineHeight: 1 }}>
        Essencial
      </Typography>
      <Typography variant="caption" sx={{ color: '#74ca4f', fontWeight: 600 }}>
        SAUDE
      </Typography>
    </Box>
  </Box>
);

export default function ConsultaBoletos() {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

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

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      setError('CPF invalido. Digite os 11 numeros.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/users/public/boletos/${cpfLimpo}`);
      setResult(response.data);
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao buscar boletos.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', py: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <Container maxWidth="sm">
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Logo />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {/* Card de Busca */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <ReceiptIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Consulta de Boletos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Digite seu CPF para visualizar seus boletos pendentes
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSearch}>
              <TextField
                fullWidth
                label="CPF"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                inputProps={{
                  maxLength: 14,
                  style: { textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.1em' }
                }}
                sx={{ mb: 2 }}
                autoFocus
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading || cpf.replace(/\D/g, '').length !== 11}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              >
                {loading ? 'Buscando...' : 'Consultar Boletos'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Mensagem de Erro */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorOutlineIcon />}>
            {error}
          </Alert>
        )}

        {/* Resultado da Busca */}
        {result && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              {/* Info do Cliente */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Cliente</Typography>
                  <Typography variant="h6" fontWeight="bold">{result.client.nome}</Typography>
                </Box>
                <Chip
                  label={result.client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  color={result.client.status === 'ativo' ? 'success' : 'warning'}
                  icon={result.client.status === 'ativo' ? <CheckCircleIcon /> : <WarningAmberIcon />}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {result.payments.length === 0 ? (
                // Sem boletos pendentes
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Nenhum boleto pendente!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Voce esta em dia com seus pagamentos.
                  </Typography>
                </Box>
              ) : (
                // Lista de boletos
                <>
                  {/* Resumo */}
                  <Box sx={{
                    bgcolor: result.summary.overdue > 0 ? 'error.lighter' : 'warning.lighter',
                    borderRadius: 2,
                    p: 2,
                    mb: 3,
                    textAlign: 'center'
                  }}>
                    {result.summary.overdue > 0 ? (
                      <>
                        <WarningAmberIcon sx={{ color: 'error.main', fontSize: 32, mb: 1 }} />
                        <Typography variant="h6" color="error.main">
                          Voce tem {result.summary.overdue} boleto(s) vencido(s)
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="h6" color="warning.dark">
                        Voce tem {result.summary.pending} boleto(s) pendente(s)
                      </Typography>
                    )}
                    <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
                      {formatCurrency(result.summary.totalValue)}
                    </Typography>
                  </Box>

                  {/* Proximo boleto a pagar */}
                  {result.nextPayment && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {result.nextPayment.status === 'overdue' ? 'Boleto vencido - pague agora:' : 'Proximo vencimento:'}
                      </Typography>
                      <Box sx={{
                        border: '2px solid',
                        borderColor: result.nextPayment.status === 'overdue' ? 'error.main' : 'primary.main',
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <Box>
                          <Typography variant="h5" fontWeight="bold">
                            {formatCurrency(result.nextPayment.valor)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Vencimento: {formatDate(result.nextPayment.due_date)}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color={result.nextPayment.status === 'overdue' ? 'error' : 'primary'}
                          startIcon={<OpenInNewIcon />}
                          onClick={() => window.open(result.nextPayment.invoice_url, '_blank')}
                          disabled={!result.nextPayment.invoice_url}
                        >
                          Pagar Agora
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {/* Lista completa */}
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Todos os boletos:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Vencimento</TableCell>
                          <TableCell>Valor</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Acao</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.payments.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>{formatDate(payment.due_date)}</TableCell>
                            <TableCell>{formatCurrency(payment.valor)}</TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                                color={payment.status === 'overdue' ? 'error' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                color="primary"
                                onClick={() => window.open(payment.invoice_url, '_blank')}
                                disabled={!payment.invoice_url}
                                title="Abrir boleto"
                              >
                                <OpenInNewIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Alert severity="info" sx={{ mt: 3 }}>
                    Apos o pagamento, seu acesso sera reativado automaticamente em alguns minutos.
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Duvidas? Entre em contato pelo WhatsApp
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
          >
            Falar com Suporte
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
