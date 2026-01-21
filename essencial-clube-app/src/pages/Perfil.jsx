import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pointsService, redemptionsService } from '../services/api';
import {
  Container, Box, Typography, CircularProgress, Grid, Card, CardContent,
  List, ListItem, ListItemText, Divider, Avatar, Chip, Button
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';

export default function Perfil() {
  const { user, logout } = useAuth();
  const [saldo, setSaldo] = useState(0);
  const [resgates, setResgates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [balanceRes, redemptionsRes] = await Promise.all([
        pointsService.getBalance(user.id),
        redemptionsService.getMy(),
      ]);
      setSaldo(balanceRes.data.saldo);
      setResgates(redemptionsRes.data.redemptions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNivelColor = (nivel) => {
    const colors = {
      bronze: '#CD7F32',
      prata: '#C0C0C0',
      ouro: '#FFD700',
      diamante: '#B9F2FF',
    };
    return colors[nivel] || colors.bronze;
  };

  const getStatusChip = (status) => {
    const config = {
      pendente: { color: 'warning', label: 'Pendente' },
      aprovado: { color: 'success', label: 'Aprovado' },
      rejeitado: { color: 'error', label: 'Rejeitado' },
      entregue: { color: 'info', label: 'Entregue' },
    };
    const { color, label } = config[status] || { color: 'default', label: status };
    return <Chip label={label} color={color} size="small" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      {/* Header do Perfil */}
      <Card sx={{ textAlign: 'center', p: 4, mb: 3 }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            bgcolor: 'primary.main',
            fontSize: '2rem',
            fontWeight: 'bold',
            mx: 'auto',
            mb: 2
          }}
        >
          {user?.nome?.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {user?.nome}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {user?.email}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
          <Chip
            label={user?.nivel}
            size="small"
            sx={{
              bgcolor: getNivelColor(user?.nivel),
              color: user?.nivel === 'diamante' ? 'text.primary' : 'white',
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            • {user?.tipo}
          </Typography>
        </Box>
      </Card>

      {/* Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {saldo.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pontos
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" fontWeight="bold" color="secondary.main">
              {user?.total_indicacoes || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Indicações
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Dados Pessoais */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Dados Pessoais
          </Typography>
          <List disablePadding>
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary="CPF"
                secondary={user?.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
              />
            </ListItem>
            <Divider />
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary="Email"
                secondary={user?.email}
                primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
              />
            </ListItem>
            <Divider />
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary="Telefone"
                secondary={user?.telefone || '-'}
                primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
              />
            </ListItem>
            <Divider />
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary="Membro desde"
                secondary={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Meus Resgates */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Meus Resgates
          </Typography>

          {resgates.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Você ainda não resgatou nenhum prêmio
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {resgates.slice(0, 5).map((resgate, index) => (
                <React.Fragment key={resgate.id}>
                  <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={resgate.reward_nome}
                      secondary={`Código: ${resgate.codigo_resgate}`}
                      primaryTypographyProps={{ fontWeight: 'medium' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      {getStatusChip(resgate.status)}
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {resgate.points_spent} pts
                      </Typography>
                    </Box>
                  </ListItem>
                  {index < resgates.slice(0, 5).length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Card
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <SettingsIcon color="action" />
          <Typography fontWeight="medium">Configurações</Typography>
        </Card>

        <Card
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <HelpOutlineIcon color="action" />
          <Typography fontWeight="medium">Ajuda</Typography>
        </Card>

        <Card
          onClick={logout}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'error.lighter' }
          }}
        >
          <LogoutIcon color="error" />
          <Typography fontWeight="medium" color="error.main">
            Sair da conta
          </Typography>
        </Card>
      </Box>
    </Container>
  );
}
