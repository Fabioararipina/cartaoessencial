import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { adminService, redemptionsService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Grid, Card, CardContent,
  List, ListItem, ListItemText, Divider, Button, Chip, Avatar
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [pendingRedemptions, setPendingRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, redemptionsRes] = await Promise.all([
        adminService.getDashboard(),
        redemptionsService.getPending(),
      ]);
      setDashboard(dashRes.data);
      setPendingRedemptions(redemptionsRes.data.redemptions || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = dashboard || {};

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Painel Administrativo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visão geral do sistema
        </Typography>
      </Box>

      {/* KPIs Principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="primary" />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {stats.total_clientes || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clientes
              </Typography>
              <Chip
                label={`${stats.clientes_ativos || 0} ativos`}
                size="small"
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StarIcon color="secondary" />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">
                {(stats.pontos_circulacao || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pontos em Circulação
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CardGiftcardIcon color="info" />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {stats.resgates_pendentes || pendingRedemptions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Resgates Pendentes
              </Typography>
              {(stats.resgates_pendentes || pendingRedemptions.length) > 0 && (
                <Chip
                  label="Ação necessária"
                  size="small"
                  color="warning"
                  sx={{ mt: 1 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StorefrontIcon color="action" />
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.total_parceiros || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Parceiros Ativos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Resgates Pendentes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon color="warning" />
                <Typography variant="h6" fontWeight="medium">
                  Resgates Pendentes
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/admin/resgates"
                size="small"
              >
                Ver todos
              </Button>
            </Box>
            <Divider />

            {pendingRedemptions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Nenhum resgate pendente
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {pendingRedemptions.slice(0, 5).map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemText
                        primary={item.reward_nome || item.nome_premio}
                        secondary={item.user_nome || item.nome_cliente}
                        primaryTypographyProps={{ fontWeight: 'medium', variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip label="Pendente" size="small" color="warning" />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {item.points_spent} pts
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < Math.min(pendingRedemptions.length, 5) - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Card>
        </Grid>

        {/* Métricas Adicionais */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="medium" gutterBottom>
                Métricas do Sistema
              </Typography>
            </Box>
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Indicações
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {stats.total_indicacoes || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Pontos Expiram em 30 dias
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                    {(stats.pontos_expirando_30d || 0).toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Resgates Aprovados
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                    {stats.resgates_aprovados || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Transações este mês
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {stats.transacoes_mes || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Conversão (Indicações)
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                    {stats.taxa_conversao || '0%'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Atalhos Rápidos */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="medium" gutterBottom>
                Ações Rápidas
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                component={RouterLink}
                to="/admin/usuarios"
                variant="outlined"
                startIcon={<PeopleIcon />}
              >
                Gerenciar Usuários
              </Button>
              <Button
                component={RouterLink}
                to="/admin/resgates"
                variant="outlined"
                startIcon={<CardGiftcardIcon />}
                color={pendingRedemptions.length > 0 ? 'warning' : 'primary'}
              >
                Aprovar Resgates {pendingRedemptions.length > 0 && `(${pendingRedemptions.length})`}
              </Button>
              <Button
                component={RouterLink}
                to="/admin/parceiros"
                variant="outlined"
                startIcon={<StorefrontIcon />}
              >
                Gerenciar Parceiros
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
