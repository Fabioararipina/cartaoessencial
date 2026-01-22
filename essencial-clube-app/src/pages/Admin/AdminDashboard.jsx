import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { adminService, redemptionsService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Grid, Card, CardContent,
  List, ListItem, ListItemText, Divider, Button, Chip
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import StorefrontIcon from '@mui/icons-material/Storefront';
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
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Painel Administrativo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visão geral do sistema
        </Typography>
      </Box>

      {/* Card Principal */}
      <Card sx={{ p: 3, mb: 4, textAlign: 'center', background: 'linear-gradient(45deg, #5287fb 30%, #74ca4f 90%)', color: 'white' }}>
        <CardContent sx={{ p: 0 }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
            Resgates pendentes
          </Typography>
          <Typography variant="h3" fontWeight="bold" sx={{ mt: 0.5 }}>
            {stats.resgates_pendentes || pendingRedemptions.length}
          </Typography>
          {(stats.resgates_pendentes || pendingRedemptions.length) > 0 && (
            <Button
              component={RouterLink}
              to="/admin/resgates"
              variant="contained"
              sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
            >
              Aprovar agora
            </Button>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Card sx={{ flex: 1, p: 2, textAlign: 'center' }}>
          <PeopleIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {stats.total_clientes || 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Clientes
          </Typography>
        </Card>
        <Card sx={{ flex: 1, p: 2, textAlign: 'center' }}>
          <StarIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="secondary.main">
            {(stats.pontos_circulacao || 0).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Pontos
          </Typography>
        </Card>
        <Card sx={{ flex: 1, p: 2, textAlign: 'center' }}>
          <StorefrontIcon color="action" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold">
            {stats.total_parceiros || 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Parceiros
          </Typography>
        </Card>
        <Card sx={{ flex: 1, p: 2, textAlign: 'center' }}>
          <WarningAmberIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            {(stats.pontos_expirando_30d || 0).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Expiram 30d
          </Typography>
        </Card>
      </Box>

      {/* Ações Rápidas */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Card
          component={RouterLink}
          to="/admin/usuarios"
          sx={{
            flex: 1,
            p: 3,
            textAlign: 'center',
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <PeopleIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="subtitle1" fontWeight="medium">
            Usuários
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerenciar
          </Typography>
        </Card>
        <Card
          component={RouterLink}
          to="/admin/resgates"
          sx={{
            flex: 1,
            p: 3,
            textAlign: 'center',
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <CardGiftcardIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="subtitle1" fontWeight="medium">
            Resgates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aprovar
          </Typography>
        </Card>
        <Card
          component={RouterLink}
          to="/admin/parceiros"
          sx={{
            flex: 1,
            p: 3,
            textAlign: 'center',
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <StorefrontIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="subtitle1" fontWeight="medium">
            Parceiros
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerenciar
          </Typography>
        </Card>
      </Box>

      {/* Resgates Pendentes */}
      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" component="h2">
            Resgates Pendentes
          </Typography>
          <Button component={RouterLink} to="/admin/resgates" size="small">
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
                <ListItem>
                  <ListItemText
                    primary={item.reward_nome || item.nome_premio}
                    secondary={item.user_nome || item.nome_cliente}
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip label="Pendente" size="small" color="warning" />
                    <Typography variant="caption" color="text.secondary" display="block">
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
    </Container>
  );
}
