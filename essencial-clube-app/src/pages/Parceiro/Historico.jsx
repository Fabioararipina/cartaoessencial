import React, { useState, useEffect, useMemo } from 'react';
import { partnersService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Grid, Card,
  List, ListItem, ListItemText, Divider, Button, TextField, InputAdornment,
  Collapse, Chip, Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export default function Historico() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [showFilters, setShowFilters] = useState(true);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroCpf, setFiltroCpf] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Paginação
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await partnersService.getMyTransactions({ limit: 1000 });
      setAllTransactions(response.data.transactions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar transações
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((item) => {
      // Filtro por nome
      if (filtroNome) {
        const nome = item.cliente_nome?.toLowerCase() || '';
        if (!nome.includes(filtroNome.toLowerCase())) {
          return false;
        }
      }

      // Filtro por CPF
      if (filtroCpf) {
        const cpfLimpo = filtroCpf.replace(/\D/g, '');
        const itemCpf = item.cliente_cpf?.replace(/\D/g, '') || '';
        if (!itemCpf.includes(cpfLimpo)) {
          return false;
        }
      }

      // Filtro por data início
      if (filtroDataInicio) {
        const dataItem = new Date(item.data_compra).toISOString().split('T')[0];
        if (dataItem < filtroDataInicio) {
          return false;
        }
      }

      // Filtro por data fim
      if (filtroDataFim) {
        const dataItem = new Date(item.data_compra).toISOString().split('T')[0];
        if (dataItem > filtroDataFim) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, filtroNome, filtroCpf, filtroDataInicio, filtroDataFim]);

  // Paginação
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, page]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const hasActiveFilters = filtroNome || filtroCpf || filtroDataInicio || filtroDataFim;

  const clearFilters = () => {
    setFiltroNome('');
    setFiltroCpf('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setPage(1);
  };

  // Resetar página quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [filtroNome, filtroCpf, filtroDataInicio, filtroDataFim]);

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCpf = (cpf) => {
    return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
  };

  // Calcular totais filtrados
  const totaisFiltrados = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, item) => ({
        transacoes: acc.transacoes + 1,
        pontos: acc.pontos + (item.points_awarded || 0),
        valor: acc.valor + parseFloat(item.valor_compra || 0),
      }),
      { transacoes: 0, pontos: 0, valor: 0 }
    );
  }, [filteredTransactions]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Histórico de Transações
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Consulte todas as transações realizadas
        </Typography>
      </Box>

      {/* Card de Filtros */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon color="action" />
            <Typography variant="subtitle1" fontWeight="medium">
              Filtros
            </Typography>
            {hasActiveFilters && (
              <Chip
                label={`${filteredTransactions.length} resultados`}
                size="small"
                color="primary"
              />
            )}
          </Box>
          <Button
            size="small"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </Button>
        </Box>

        <Collapse in={showFilters}>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Buscar por nome"
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Buscar por CPF"
                  value={filtroCpf}
                  onChange={(e) => setFiltroCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data inicial"
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data final"
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            {hasActiveFilters && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      </Card>

      {/* Resumo dos Filtros */}
      {hasActiveFilters && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.lighter' }}>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {totaisFiltrados.transacoes}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Transações
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.lighter' }}>
              <Typography variant="h5" fontWeight="bold" color="secondary.main">
                {totaisFiltrados.pontos.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pontos
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(totaisFiltrados.valor)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Valor Total
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Lista de Transações */}
      <Card>
        {paginatedTransactions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {hasActiveFilters
                ? 'Nenhuma transação encontrada com os filtros aplicados'
                : 'Nenhuma transação realizada'
              }
            </Typography>
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={clearFilters}
                sx={{ mt: 1 }}
              >
                Limpar filtros
              </Button>
            )}
          </Box>
        ) : (
          <>
            <List disablePadding>
              {paginatedTransactions.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemText
                      primary={item.cliente_nome}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" component="span">
                            CPF: {formatCpf(item.cliente_cpf)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                            <Typography variant="caption" component="span" color="text.disabled">
                              {formatDate(item.data_compra)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      primaryTypographyProps={{ fontWeight: 'medium' }}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle1" fontWeight="bold" color="secondary.main">
                        +{item.points_awarded} pts
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(item.valor_compra)}
                      </Typography>
                    </Box>
                  </ListItem>
                  {index < paginatedTransactions.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>

            {/* Paginação */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </>
        )}
      </Card>
    </Container>
  );
}
