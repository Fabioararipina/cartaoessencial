import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pointsService, referralsService } from '../services/api';
import {
  Box, Typography, CircularProgress, Grid, Card, CardContent, Button,
  List, ListItem, ListItemText, Divider, Container, TextField, IconButton, Snackbar, Alert, Link
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PeopleIcon from '@mui/icons-material/People';

export default function Dashboard() {
  const { user } = useAuth();
  const [saldo, setSaldo] = useState(0);
  const [expirando, setExpirando] = useState(0);
  const [historico, setHistorico] = useState([]);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [balanceRes, expiringRes, historyRes, referralRes] = await Promise.all([
        pointsService.getBalance(user.id),
        pointsService.getExpiring(user.id, 30),
        pointsService.getHistory(user.id, { limit: 5 }),
        referralsService.getMyCode(),
      ]);

      setSaldo(balanceRes.data.saldo || 0);
      setExpirando(expiringRes.data.total_expiring || 0);
      setHistorico(historyRes.data.history || []);
      setReferralCode(referralRes.data.referral_code || '');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Opcional: mostrar um alerta de erro na UI
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      purchase: 'Compra',
      referral: 'Indicação',
      bonus: 'Bônus',
      mission: 'Missão',
      birthday: 'Aniversário',
      redemption: 'Resgate',
    };
    return labels[type] || type;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`${window.location.origin}/i/${referralCode}`);
    setCopied(true);
    setSnackbarOpen(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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
          Olá, {user?.nome?.split(' ')[0]}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bem-vindo ao Cartão Essencial Saúde
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{
            bgcolor: 'primary.main',
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: '4px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            {user?.nivel}
          </Typography>
        </Box>
      </Box>

      {/* Saldo */}
      <Card sx={{ p: 3, mb: 4, textAlign: 'center', background: 'linear-gradient(45deg, #5287fb 30%, #74ca4f 90%)', color: 'white' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
            Saldo disponível
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mt: 0.5 }}>
            {saldo.toLocaleString()} <span style={{ fontSize: '0.6em', opacity: 0.9 }}>pontos</span>
          </Typography>

          {expirando > 0 && (
            <Box sx={{ pt: 2, mt: 2, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {expirando.toLocaleString()} pontos expiram em 30 dias
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>          <Card
            component={RouterLink}
            to="/premios"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 3,
              textAlign: 'center',
              height: '100%',
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': {
                bgcolor: 'action.hover',
                cursor: 'pointer',
              }
            }}
          >
            <CardGiftcardIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="subtitle1" fontWeight="medium">
              Resgatar Prêmios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ver catálogo
            </Typography>
          </Card>
        </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>          <Card
            component={RouterLink}
            to="/indicar"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 3,
              textAlign: 'center',
              height: '100%',
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': {
                bgcolor: 'action.hover',
                cursor: 'pointer',
              }
            }}
          >
            <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="subtitle1" fontWeight="medium">
              Indicar Amigos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ganhe pontos
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Código de Indicação */}
      {referralCode && (
        <Card sx={{ p: 3, mb: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            Seu código de indicação
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={referralCode}
              InputProps={{ readOnly: true }}
              sx={{ '& fieldset': { borderColor: 'divider' } }}
            />
            <Button
              variant="contained"
              onClick={handleCopyCode}
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              color={copied ? 'success' : 'primary'}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </Box>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" component="h2">
            Últimas movimentações
          </Typography>
          <Link component={RouterLink} to="/extrato" sx={{ textDecoration: 'none' }}>
            <Button size="small">Ver todas</Button>
          </Link>
        </Box>
        <Divider />

        {historico.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma movimentação
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {historico.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem>
                  <ListItemText
                    primary={getTypeLabel(item.type)}
                    secondary={item.parceiro || formatDate(item.earned_at)}
                  />
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    color={item.points > 0 ? 'success.main' : 'error.main'}
                  >
                    {item.points > 0 ? '+' : ''}{item.points}
                  </Typography>
                </ListItem>
                {index < historico.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Card>
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Código de indicação copiado!
        </Alert>
      </Snackbar>
    </Container>
  );
}
