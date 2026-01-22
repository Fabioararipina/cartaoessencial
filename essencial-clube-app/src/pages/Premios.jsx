import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, CircularProgress, Grid, Card, CardContent, CardMedia, Button,
  Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { rewardsService, redemptionsService, pointsService } from '../services/api';

export default function Premios() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resgatando, setResgatando] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [rewardsRes, balanceRes] = await Promise.all([
        rewardsService.getAll(),
        pointsService.getBalance(user.id),
      ]);
      setRewards(rewardsRes.data.rewards);
      setSaldo(balanceRes.data.saldo);
    } catch (error) {
      console.error('Erro ao carregar prêmios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResgatar = async (reward) => {
    if (saldo < reward.points_required) {
      setError('Saldo insuficiente para este prêmio');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setResgatando(reward.id);
    setError('');

    try {
      const response = await redemptionsService.create(reward.id);
      setSucesso({
        reward: reward.nome,
        codigo: response.data.redemption.codigo_resgate,
      });
      setSaldo(prev => prev - reward.points_required);
    } catch (error) {
      const message = error.response?.data?.error || 'Erro ao resgatar prêmio';
      setError(message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setResgatando(null);
    }
  };

  const categorias = ['todos', ...new Set(rewards.map(r => r.categoria))];
        const rewardsFiltrados = filtro === 'todos'
          ? rewards
          : rewards.filter(r => r.categoria === filtro);
  
        console.log('Rewards Filtrados:', rewardsFiltrados);
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 4
      }}>
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            Prêmios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Resgate seus pontos por recompensas
          </Typography>
        </Box>
        <Card sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1, borderRadius: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Seu saldo
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {saldo.toLocaleString()} pts
          </Typography>
        </Card>
      </Box>

      {/* Filtros */}
      {categorias.length > 2 && (
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 3 }}>
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={filtro === cat ? 'contained' : 'outlined'}
              onClick={() => setFiltro(cat)}
              sx={{
                flexShrink: 0, // Prevent buttons from shrinking
                borderColor: filtro === cat ? 'primary.main' : 'grey.300',
                color: filtro === cat ? 'white' : 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                }
              }}
            >
              {cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </Box>
      )}

      {/* Erro */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Modal de Sucesso */}
      <Dialog open={!!sucesso} onClose={() => setSucesso(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Resgate Solicitado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {sucesso?.reward}
          </Typography>

          <Box sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', borderRadius: 1, p: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Código do resgate
            </Typography>
            <Typography variant="h6" component="p" fontWeight="bold" color="primary.main">
              {sucesso?.codigo}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Aguarde a aprovação. Você será notificado quando o prêmio for liberado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSucesso(null)} variant="contained" fullWidth>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lista de Prêmios */}
      {rewardsFiltrados.length === 0 ? (
        <Box sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 4,
          textAlign: 'center',
          mb: 3
        }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum prêmio disponível no momento
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
          {rewardsFiltrados.map((reward) => {
            const podeResgatar = saldo >= reward.points_required;
            const esgotado = reward.estoque === 0;

            return (
              <Box sx={{ p: 1.5, width: { xs: '100%', sm: '50%', md: '33.3333%' } }} key={reward.id}>
                <Card sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: 420,
                  border: '1px solid #eee',
                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
                  }
                }}>
                  {reward.imagem_url && (
                    <CardMedia
                      component="img"
                      sx={{
                        width: '100%',
                        height: 180, 
                        objectFit: 'contain',
                        backgroundColor: '#f0f0f0',
                      }}
                      image={reward.imagem_url}
                      alt={reward.nome}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" component="h3" fontWeight="medium">
                            {reward.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                            {reward.categoria}
                          </Typography>
                        </Box>
                        {esgotado && (
                          <Chip label="Esgotado" color="error" size="small" />
                        )}
                      </Box>

                      {reward.descricao && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {reward.descricao}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                          {reward.points_required.toLocaleString()} pts
                        </Typography>
                        {reward.valor_equivalente && (
                          <Typography variant="caption" color="text.secondary">
                            R$ {parseFloat(reward.valor_equivalente).toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        variant={podeResgatar && !esgotado ? 'contained' : 'outlined'}
                        color={podeResgatar && !esgotado ? 'primary' : 'inherit'}
                        onClick={() => handleResgatar(reward)}
                        disabled={!podeResgatar || esgotado || resgatando === reward.id}
                        sx={{ ml: 1 }}
                      >
                        {resgatando === reward.id ? 'Aguarde...' : 'Resgatar'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>      )}
    </Container>
  );
}
