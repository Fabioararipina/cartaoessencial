import React, { useState, useEffect } from 'react';
import { redemptionsService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, CardContent,
  List, ListItem, ListItemText, Divider, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Alert, Tabs, Tab
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function AdminResgates() {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Dialog de ação
  const [actionDialog, setActionDialog] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState(null);
  const [action, setAction] = useState(''); // 'aprovado' ou 'rejeitado'
  const [observacoes, setObservacoes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadRedemptions();
  }, []);

  const loadRedemptions = async () => {
    setLoading(true);
    try {
      const response = await redemptionsService.getPending();
      setRedemptions(response.data.redemptions || []);
    } catch (error) {
      console.error('Erro ao carregar resgates:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingRedemptions = redemptions.filter(r => r.status === 'pendente');
  const processedRedemptions = redemptions.filter(r => r.status !== 'pendente');

  const openActionDialog = (redemption, actionType) => {
    setSelectedRedemption(redemption);
    setAction(actionType);
    setObservacoes('');
    setError('');
    setSuccess('');
    setActionDialog(true);
  };

  const handleAction = async () => {
    if (!selectedRedemption) return;

    setProcessing(true);
    setError('');

    try {
      await redemptionsService.approve(selectedRedemption.id, action, observacoes);
      setSuccess(`Resgate ${action === 'aprovado' ? 'aprovado' : 'rejeitado'} com sucesso!`);
      setActionDialog(false);
      loadRedemptions();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao processar resgate');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusChip = (status) => {
    const config = {
      pendente: { color: 'warning', icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} /> },
      aprovado: { color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
      rejeitado: { color: 'error', icon: <CancelIcon sx={{ fontSize: 16 }} /> },
      entregue: { color: 'info', icon: <LocalShippingIcon sx={{ fontSize: 16 }} /> },
    };
    const { color, icon } = config[status] || { color: 'default', icon: null };
    return <Chip label={status} color={color} size="small" icon={icon} sx={{ textTransform: 'capitalize' }} />;
  };

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';
  };

  const RedemptionItem = ({ item, showActions = false }) => (
    <ListItem
      sx={{
        py: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2
      }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {item.reward_nome || item.nome_premio}
          </Typography>
          {getStatusChip(item.status)}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Cliente: {item.user_nome || item.nome_cliente}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Código: <strong>{item.codigo_resgate}</strong> | {item.points_spent} pontos
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Solicitado em: {formatDate(item.created_at)}
        </Typography>
      </Box>

      {showActions && item.status === 'pendente' && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<CheckCircleIcon />}
            onClick={() => openActionDialog(item, 'aprovado')}
          >
            Aprovar
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon />}
            onClick={() => openActionDialog(item, 'rejeitado')}
          >
            Rejeitar
          </Button>
        </Box>
      )}
    </ListItem>
  );

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
          Gestão de Resgates
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aprove ou rejeite solicitações de resgate de prêmios
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, value) => setTabValue(value)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Pendentes
                {pendingRedemptions.length > 0 && (
                  <Chip label={pendingRedemptions.length} size="small" color="warning" />
                )}
              </Box>
            }
          />
          <Tab label="Processados" />
        </Tabs>

        {/* Tab Pendentes */}
        {tabValue === 0 && (
          <>
            {pendingRedemptions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  Nenhum resgate pendente
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Todos os resgates foram processados
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {pendingRedemptions.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <RedemptionItem item={item} showActions />
                    {index < pendingRedemptions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </>
        )}

        {/* Tab Processados */}
        {tabValue === 1 && (
          <>
            {processedRedemptions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum resgate processado ainda
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {processedRedemptions.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <RedemptionItem item={item} />
                    {index < processedRedemptions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </>
        )}
      </Card>

      {/* Dialog de Ação */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {action === 'aprovado' ? 'Aprovar Resgate' : 'Rejeitar Resgate'}
        </DialogTitle>
        <DialogContent>
          {selectedRedemption && (
            <Box sx={{ pt: 1 }}>
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Prêmio
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedRedemption.reward_nome || selectedRedemption.nome_premio}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Cliente
                </Typography>
                <Typography variant="body1">
                  {selectedRedemption.user_nome || selectedRedemption.nome_cliente}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Pontos
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  {selectedRedemption.points_spent} pontos
                </Typography>
              </Card>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                label={action === 'aprovado' ? 'Observações (opcional)' : 'Motivo da rejeição'}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder={action === 'aprovado'
                  ? 'Ex: Código de retirada enviado por email'
                  : 'Ex: Saldo insuficiente / Prêmio indisponível'
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={action === 'aprovado' ? 'success' : 'error'}
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} /> : (action === 'aprovado' ? 'Aprovar' : 'Rejeitar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
