import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Pagination,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  AccountBalanceWallet,
  ShoppingCart,
  CardGiftcard,
  Receipt,
  History,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { userService, pointsService } from '../services/api';
import { format } from 'date-fns';

const statusColors = {
  // Pagamentos
  pending: 'warning',
  received: 'success',
  confirmed: 'success',
  overdue: 'error',
  // Resgates
  pendente: 'warning',
  aprovado: 'success',
  rejeitado: 'error',
  // Pontos
  purchase: 'secondary',
  referral: 'primary',
  redemption: 'error',
  bonus: 'info',
  // Compra
  concluida: 'success',
};

const entryIcons = {
  pontos: <AccountBalanceWallet />,
  pagamento: <Receipt />,
  resgate: <CardGiftcard />,
  compra: <ShoppingCart />,
};

const StatementPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('todos');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 15,
    offset: 0,
  });
  const [page, setPage] = useState(1);

  const fetchBalance = useCallback(async () => {
    if (user?.id) {
      try {
        const response = await pointsService.getBalance(user.id);
        setBalance(response.data.balance || 0);
      } catch (err) {
        console.error('Erro ao buscar saldo:', err);
      }
    }
  }, [user]);

  const fetchStatement = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (user?.id) {
      try {
        const params = {
          type: tab === 'todos' ? null : tab,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
        };
        const response = await userService.getMyStatement(params);
        setEntries(response.data.entries);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error('Erro ao buscar extrato:', err);
        setError('Não foi possível carregar o extrato. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    }
  }, [user, tab, page, pagination.limit]);

  useEffect(() => {
    fetchBalance();
    fetchStatement();
  }, [fetchBalance, fetchStatement]);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setPage(1); // Reset page when changing filter
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const renderValue = (entry) => {
    const isNegative = entry.entry_type === 'resgate' || (entry.entry_type === 'pontos' && entry.valor < 0);
    const value = Math.abs(entry.valor);
    const prefix = isNegative ? '-' : '+';
    const color = isNegative ? 'error.main' : 'success.main';

    let formattedValue;
    if (entry.entry_type === 'pagamento') {
      formattedValue = `R$ ${parseFloat(value).toFixed(2)}`;
    } else {
      formattedValue = `${parseInt(value)} pontos`;
    }

    return (
      <Typography variant="body2" sx={{ color, fontWeight: 'bold' }}>
        {prefix} {formattedValue}
      </Typography>
    );
  };
  
  const getStatusLabel = (subtipo) => {
    // Custom labels for better readability
    const labels = {
        pending: 'Pendente',
        received: 'Recebido',
        confirmed: 'Confirmado',
        overdue: 'Vencido',
        pendente: 'Pendente',
        aprovado: 'Aprovado',
        rejeitado: 'Rejeitado',
        purchase: 'Compra',
        referral: 'Indicação',
        redemption: 'Resgate',
        bonus: 'Bônus',
        concluida: 'Concluída',
    };
    return labels[subtipo] || subtipo;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper
        elevation={4}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 4,
          background: 'linear-gradient(45deg, #5287fb 30%, #74ca4f 90%)',
          color: 'white',
        }}
      >
        <Typography variant="h5" gutterBottom>
          Meu Saldo de Pontos
        </Typography>
        <Typography variant="h3" component="p" sx={{ fontWeight: 'bold' }}>
          {balance.toLocaleString('pt-BR')} Pontos
        </Typography>
      </Paper>

      <Paper elevation={3} sx={{ borderRadius: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab label="Todos" value="todos" />
            <Tab label="Pontos" value="pontos" />
            <Tab label="Pagamentos" value="pagamentos" />
            <Tab label="Resgates" value="resgates" />
            <Tab label="Compras" value="compras" />
          </Tabs>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        )}

        {!loading && !error && entries.length === 0 && (
          <Alert severity="info" sx={{ m: 2 }}>
            Nenhuma movimentação encontrada para este filtro.
          </Alert>
        )}

        {!loading && !error && entries.length > 0 && (
          <List sx={{ p: 0 }}>
            {entries.map((entry) => (
              <ListItem key={`${entry.entry_type}-${entry.id}`} divider>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {entryIcons[entry.entry_type] || <History />}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1">
                      {entry.description}
                      {entry.parceiro && (
                        <Typography component="span" variant="body2" color="text.secondary">
                          {' '}
                          - {entry.parceiro}
                        </Typography>
                      )}
                    </Typography>
                  }
                  secondary={format(new Date(entry.data), 'dd/MM/yyyy HH:mm')}
                />
                <Grid container spacing={1} alignItems="center" justifyContent="flex-end" sx={{ maxWidth: '40%' }}>
                    <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                        {renderValue(entry)}
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                         {entry.subtipo && (
                            <Chip
                                label={getStatusLabel(entry.subtipo)}
                                color={statusColors[entry.subtipo] || 'default'}
                                size="small"
                                sx={{ ml: 1, textTransform: 'capitalize' }}
                            />
                        )}
                    </Grid>
                </Grid>
              </ListItem>
            ))}
          </List>
        )}

        {pagination.total > pagination.limit && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={Math.ceil(pagination.total / pagination.limit)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default StatementPage;
