import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, CircularProgress, Grid, Card, Button, TextField,
  Snackbar, Alert, List, ListItem, ListItemText, Chip, LinearProgress, Avatar, ListItemAvatar, Divider
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon, Check as CheckIcon, CardGiftcard as CardGiftcardIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { referralsService } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

export default function Indicar() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('indicar');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [codeRes, statsRes, leaderRes] = await Promise.all([
        referralsService.getMyCode(),
        referralsService.getStats(),
        referralsService.getLeaderboard(10),
      ]);
      setData(codeRes.data);
      setStats(statsRes.data);
      setLeaderboard(leaderRes.data.leaderboard);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data?.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Essencial Saúde',
          text: `Use meu código ${data?.referral_code} e ganhe pontos!`,
          url: data?.referral_link,
        });
      } catch (error) {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const getBadgeClass = (nivel) => {
    const classes = {
      bronze: 'badge-bronze',
      prata: 'badge-prata',
      ouro: 'badge-ouro',
      diamante: 'badge-diamante',
    };
    return classes[nivel] || 'badge-bronze';
  };

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
          Indicar Amigos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ganhe pontos por cada indicação convertida
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1, bgcolor: 'grey.100', p: 0.5, borderRadius: 1, mb: 4 }}>
        <Button
          fullWidth
          variant={activeTab === 'indicar' ? 'contained' : 'text'}
          onClick={() => setActiveTab('indicar')}
          sx={{ textTransform: 'none', py: 1 }}
        >
          Indicar
        </Button>
        <Button
          fullWidth
          variant={activeTab === 'historico' ? 'contained' : 'text'}
          onClick={() => setActiveTab('historico')}
          sx={{ textTransform: 'none', py: 1 }}
        >
          Minhas Indicações
        </Button>
        <Button
          fullWidth
          variant={activeTab === 'ranking' ? 'contained' : 'text'}
          onClick={() => setActiveTab('ranking')}
          sx={{ textTransform: 'none', py: 1 }}
        >
          Ranking
        </Button>
      </Box>

      {/* Tab: Indicar */}
      {activeTab === 'indicar' && (
        <>
          {/* Card Principal */}
          <Card sx={{
            background: 'linear-gradient(45deg, #5287fb 30%, #74ca4f 90%)',
            color: 'white',
            textAlign: 'center',
            p: 3,
            mb: 4
          }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>Ganhe por cada indicação</Typography>
            <Typography variant="h3" fontWeight="bold" sx={{ mb: 0.5 }}>{stats?.pontos_proxima_indicacao}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>pontos</Typography>
          </Card>

          {/* Código e QR */}
          <Card sx={{ p: 3, mb: 4, textAlign: 'center' }}>
            <Typography variant="subtitle2" gutterBottom>
              Seu código de indicação
            </Typography>
            <Typography variant="h4" component="p" fontWeight="bold" color="primary.main" sx={{ mb: 2 }}>
              {data?.referral_code}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1, boxShadow: 1 }}>
                <QRCodeSVG
                  value={data?.referral_link || ''}
                  size={150}
                  level="M"
                  fgColor="#5287fb"
                />
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mb: 3, wordBreak: 'break-all' }}>
              {data?.referral_link}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={copyLink}
                startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                color={copied ? 'success' : 'primary'}
              >
                {copied ? 'Copiado!' : 'Copiar Link'}
              </Button>
              <Button variant="contained" fullWidth onClick={shareLink}>
                Compartilhar
              </Button>
            </Box>
          </Card>

          {/* Progresso de Nível */}
          <Card sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium">Seu nível</Typography>
              <Chip label={stats?.nivel_atual} color="secondary" size="small" sx={{ textTransform: 'capitalize' }} />
            </Box>

            {stats?.proximo_nivel && (
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, ((stats.total_indicacoes - (stats.total_indicacoes - stats.indicacoes_para_proximo_nivel)) / stats.indicacoes_para_proximo_nivel) * 100)}
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Faltam <Typography component="span" fontWeight="medium" color="primary.main">{stats.indicacoes_para_proximo_nivel}</Typography> indicações para o nível{' '}
                  <Typography component="span" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>{stats.proximo_nivel}</Typography>
                </Typography>
              </Box>
            )}
          </Card>
        </>
      )}

      {/* Tab: Histórico */}
      {activeTab === 'historico' && (
        <Card sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" fontWeight="medium">Suas indicações</Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">Total de pontos</Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="secondary.main">{stats?.total_pontos_ganhos.toLocaleString()}</Typography>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="text.primary">{stats?.total_indicacoes}</Typography>
                <Typography variant="body2" color="text.secondary">Total</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="secondary.main">{stats?.convertidos}</Typography>
                <Typography variant="body2" color="text.secondary">Convertidas</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="warning.main">{stats?.pendentes}</Typography>
                <Typography variant="body2" color="text.secondary">Pendentes</Typography>
              </Card>
            </Grid>
          </Grid>

          {stats?.indicacoes?.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Você ainda não indicou ninguém
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {stats?.indicacoes?.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem sx={{ py: 1.5 }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight="medium">
                          {item.referred_name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {item.status === 'convertido'
                            ? `Convertido em ${new Date(item.conversion_date).toLocaleDateString('pt-BR')}`
                            : 'Aguardando pagamento'}
                        </Typography>
                      }
                    />
                    {item.points_awarded > 0 && (
                      <Typography variant="subtitle1" fontWeight="medium" color="success.main">
                        +{item.points_awarded} pts
                      </Typography>
                    )}
                  </ListItem>
                  {index < (stats?.indicacoes?.length || 0) - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Card>
      )}

      {/* Tab: Ranking */}
      {activeTab === 'ranking' && (
        <Card sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" fontWeight="medium" sx={{ mb: 2 }}>Top Indicadores</Typography>

          {leaderboard.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum indicador ainda
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {leaderboard.map((item, index) => (
                <ListItem key={index} sx={{ py: 1 }}>
                  <ListItemAvatar>
                    <Avatar sx={{
                      bgcolor: index === 0 ? 'warning.light' : index === 1 ? 'grey.300' : index === 2 ? 'info.light' : 'grey.200',
                      color: index === 0 ? 'warning.dark' : index === 1 ? 'grey.700' : index === 2 ? 'info.dark' : 'grey.800',
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      {item.posicao}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight="medium">
                        {item.nome}
                      </Typography>
                    }
                    secondary={
                      <Chip label={item.nivel} size="small" color="primary" sx={{ textTransform: 'capitalize' }} />
                    }
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle1" fontWeight="medium" color="primary.main">
                      {item.total_indicacoes}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      indicações
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Card>
      )}
    </Container>
  );
}
