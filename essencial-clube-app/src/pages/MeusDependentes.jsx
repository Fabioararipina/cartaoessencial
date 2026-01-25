import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, IconButton, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Divider, Avatar, Tooltip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { userService } from '../services/api';
import api from '../services/api';

export default function MeusDependentes() {
  const [dependents, setDependents] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    senha: '',
    parentesco: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Confirm delete state
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, dependent: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Regenerate state
  const [regenerating, setRegenerating] = useState(false);

  const fetchDependents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userService.getMyDependents();
      setDependents(response.data.dependents || []);
      setPlanInfo(response.data.planInfo || null);
    } catch (err) {
      setError('Erro ao carregar dependentes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependents();
  }, []);

  const handleOpenModal = () => {
    setFormData({ nome: '', cpf: '', email: '', telefone: '', senha: '', parentesco: '' });
    setFormErrors({});
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setFormData({ nome: '', cpf: '', email: '', telefone: '', senha: '', parentesco: '' });
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Format CPF
    if (name === 'cpf') {
      processedValue = value.replace(/\D/g, '').slice(0, 11);
    }
    // Format phone
    if (name === 'telefone') {
      processedValue = value.replace(/\D/g, '').slice(0, 11);
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nome.trim()) errors.nome = 'Nome e obrigatorio';
    if (!formData.cpf || formData.cpf.length !== 11) errors.cpf = 'CPF deve ter 11 digitos';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Email invalido';
    if (!formData.senha || formData.senha.length < 6) errors.senha = 'Senha deve ter pelo menos 6 caracteres';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDependent = async () => {
    if (!validateForm()) return;

    setModalLoading(true);
    setError('');
    try {
      const response = await userService.addDependent(formData);
      setSuccess(response.data.message || 'Dependente adicionado com sucesso!');
      handleCloseModal();
      fetchDependents();

      // Check if installment needs regeneration
      if (response.data.installmentInfo?.needsRegeneration) {
        setSuccess(`Dependente adicionado! ${response.data.installmentInfo.message}`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao adicionar dependente.';
      setError(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteClick = (dependent) => {
    setDeleteConfirm({ open: true, dependent });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.dependent) return;

    setDeleteLoading(true);
    setError('');
    try {
      const response = await userService.removeDependent(deleteConfirm.dependent.id);
      setSuccess(response.data.message || 'Dependente removido com sucesso!');
      setDeleteConfirm({ open: false, dependent: null });
      fetchDependents();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao remover dependente.';
      setError(errorMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRegenerateInstallment = async () => {
    setRegenerating(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post(`/asaas/regenerate-installment/${planInfo?.holderId || 'me'}`);
      setSuccess('Carne regenerado com sucesso! Novo valor aplicado.');
      fetchDependents();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao regenerar carne.';
      setError(errorMsg);
    } finally {
      setRegenerating(false);
    }
  };

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const isExtraDependent = planInfo && planInfo.currentDependents >= planInfo.freeLimit;
  const nextDependentCost = isExtraDependent ? planInfo.extraValue : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Meus Dependentes
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenModal}
        >
          Adicionar Dependente
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Card Resumo do Plano */}
      {planInfo && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <AttachMoneyIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">Valor Atual</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(planInfo.totalValue)}
                    <Typography component="span" variant="body2" color="text.secondary">/mes</Typography>
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <GroupIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">Dependentes</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {planInfo.currentDependents}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /{planInfo.freeLimit} gratuitos
                    </Typography>
                  </Typography>
                  {planInfo.extraDependents > 0 && (
                    <Chip
                      size="small"
                      label={`+${planInfo.extraDependents} extra(s)`}
                      color="warning"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: planInfo.freeSlots > 0 ? 'info.main' : 'warning.main', width: 56, height: 56 }}>
                  {planInfo.freeSlots > 0 ? <CheckCircleIcon fontSize="large" /> : <WarningAmberIcon fontSize="large" />}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">Vagas Gratuitas</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {planInfo.freeSlots}
                  </Typography>
                  {planInfo.freeSlots === 0 && (
                    <Typography variant="caption" color="warning.main">
                      Proximo: +{formatCurrency(planInfo.extraValue)}/mes
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Valor base: {formatCurrency(planInfo.baseValue)} (titular + {planInfo.freeLimit} dependentes)
              {planInfo.extraDependents > 0 && (
                <> + {formatCurrency(planInfo.extraValue * planInfo.extraDependents)} ({planInfo.extraDependents} dependente(s) extra)</>
              )}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Lista de Dependentes */}
      {dependents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum dependente cadastrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Adicione ate {planInfo?.freeLimit || 3} dependentes gratuitamente ao seu plano.
          </Typography>
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleOpenModal}>
            Adicionar Primeiro Dependente
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {dependents.map((dependent, index) => (
            <Grid item xs={12} sm={6} md={4} key={dependent.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: index < planInfo?.freeLimit ? 'success.main' : 'warning.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {dependent.nome}
                      </Typography>
                      {index >= planInfo?.freeLimit && (
                        <Chip size="small" label="Extra" color="warning" />
                      )}
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    CPF: {formatCPF(dependent.cpf)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: {dependent.email}
                  </Typography>
                  {dependent.telefone && (
                    <Typography variant="body2" color="text.secondary">
                      Tel: {dependent.telefone}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Chip
                      size="small"
                      label={dependent.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      color={dependent.status === 'ativo' ? 'success' : 'default'}
                    />
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Tooltip title="Remover dependente">
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(dependent)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modal Adicionar Dependente */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Dependente</DialogTitle>
        <DialogContent>
          {isExtraDependent && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Voce ja atingiu o limite de {planInfo.freeLimit} dependentes gratuitos.
              Este dependente custara +{formatCurrency(planInfo.extraValue)}/mes.
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="nome"
                value={formData.nome}
                onChange={handleFormChange}
                error={!!formErrors.nome}
                helperText={formErrors.nome}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CPF"
                name="cpf"
                value={formData.cpf}
                onChange={handleFormChange}
                error={!!formErrors.cpf}
                helperText={formErrors.cpf || 'Apenas numeros'}
                placeholder="00000000000"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleFormChange}
                placeholder="11999999999"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                error={!!formErrors.email}
                helperText={formErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Senha de Acesso"
                name="senha"
                type="password"
                value={formData.senha}
                onChange={handleFormChange}
                error={!!formErrors.senha}
                helperText={formErrors.senha || 'O dependente usara esta senha para fazer login'}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={modalLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAddDependent}
            disabled={modalLoading}
          >
            {modalLoading ? <CircularProgress size={24} /> : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Confirmar Exclusao */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, dependent: null })}>
        <DialogTitle>Confirmar Remocao</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover <strong>{deleteConfirm.dependent?.nome}</strong> como dependente?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            O dependente perdera acesso ao plano e sera desativado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, dependent: null })} disabled={deleteLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
