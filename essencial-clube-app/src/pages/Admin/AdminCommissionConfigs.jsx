import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Pagination, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function AdminCommissionConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // Assuming basic pagination for now

  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null); // For editing
  const [formData, setFormData] = useState({
    config_name: '',
    description: '',
    first_payment_type: 'percentage',
    first_payment_value: '',
    recurring_payment_type: 'percentage',
    recurring_payment_value: '',
    recurring_limit: '',
    min_payout_amount: '50.00', // NOVO: Campo para valor mínimo de saque
    applies_to: 'all',
    active: true,
    valid_from: '',
    valid_until: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, [page]);

  const loadConfigs = async () => {
    setLoading(true);
    setError('');
    try {
      // Assuming backend supports pagination with 'page' and 'limit'
      const response = await adminService.getCommissionConfigs({ page, limit: 10 });
      setConfigs(response.data || []); // Adjust based on actual API response structure for data
      // setTotalPages(response.data.totalPages || 1); // Adjust if pagination metadata is provided
    } catch (err) {
      console.error('Erro ao carregar configurações de comissão:', err);
      setError('Erro ao carregar configurações de comissão.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setCurrentConfig(null);
    setFormData({
      config_name: '',
      description: '',
      first_payment_type: 'percentage',
      first_payment_value: '',
      recurring_payment_type: 'percentage',
      recurring_payment_value: '',
      recurring_limit: '',
      min_payout_amount: '50.00', // NOVO: Campo para valor mínimo de saque
      applies_to: 'all',
      active: true,
      valid_from: '',
      valid_until: '',
    });
    setOpenFormDialog(true);
  };

  const handleOpenEditDialog = (config) => {
    setCurrentConfig(config);
    setFormData({
      config_name: config.config_name,
      description: config.description || '',
      first_payment_type: config.first_payment_type,
      first_payment_value: config.first_payment_value,
      recurring_payment_type: config.recurring_payment_type,
      recurring_payment_value: config.recurring_payment_value,
      recurring_limit: config.recurring_limit || '',
      min_payout_amount: config.min_payout_amount || '50.00', // NOVO: Campo para valor mínimo de saque
      applies_to: config.applies_to,
      active: config.active,
      valid_from: config.valid_from ? new Date(config.valid_from).toISOString().split('T')[0] : '',
      valid_until: config.valid_until ? new Date(config.valid_until).toISOString().split('T')[0] : '',
    });
    setOpenFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setOpenFormDialog(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        ...formData,
        first_payment_value: parseFloat(formData.first_payment_value),
        recurring_payment_value: parseFloat(formData.recurring_payment_value),
        recurring_limit: formData.recurring_limit === '' ? null : parseInt(formData.recurring_limit),
        min_payout_amount: parseFloat(formData.min_payout_amount), // NOVO: Campo para valor mínimo de saque
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      if (currentConfig) {
        await adminService.updateCommissionConfig(currentConfig.id, payload);
      } else {
        await adminService.createCommissionConfig(payload);
      }
      handleCloseFormDialog();
      loadConfigs();
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
      setError(err.response?.data?.error || 'Erro ao salvar configuração.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (config) => {
    setConfigToDelete(config);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setError('');
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await adminService.deleteCommissionConfig(configToDelete.id);
      handleCloseDeleteDialog();
      loadConfigs();
    } catch (err) {
      console.error('Erro ao deletar configuração:', err);
      setError(err.response?.data?.error || 'Erro ao deletar configuração.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatValue = (type, value) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `R$ ${parseFloat(value).toFixed(2)}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Configurações de Comissão
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
          Nova Configuração
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : configs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma configuração de comissão encontrada.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Primeira Venda</TableCell>
                    <TableCell>Recorrente</TableCell>
                    <TableCell>Limite Rec.</TableCell>
                    <TableCell>Mín. Saque</TableCell> {/* NOVO: Coluna para valor mínimo de saque */}
                    <TableCell>Aplica a</TableCell>
                    <TableCell>Ativo</TableCell>
                    <TableCell>Vigência</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id} hover>
                      <TableCell>{config.config_name}</TableCell>
                      <TableCell>{formatValue(config.first_payment_type, config.first_payment_value)}</TableCell>
                      <TableCell>{formatValue(config.recurring_payment_type, config.recurring_payment_value)}</TableCell>
                      <TableCell>{config.recurring_limit === null ? 'Ilimitado' : config.recurring_limit}</TableCell>
                      <TableCell>R$ {parseFloat(config.min_payout_amount)?.toFixed(2)}</TableCell> {/* NOVO: Coluna para valor mínimo de saque */}
                      <TableCell>{config.applies_to}</TableCell>
                      <TableCell>{config.active ? 'Sim' : 'Não'}</TableCell>
                      <TableCell>
                        {config.valid_from && config.valid_until
                          ? `${new Date(config.valid_from).toLocaleDateString()} - ${new Date(config.valid_until).toLocaleDateString()}`
                          : 'Sempre'
                        }
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenEditDialog(config)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenDeleteDialog(config)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Implement actual pagination controls if backend supports totalPages */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Form Dialog for Create/Edit */}
      <Dialog open={openFormDialog} onClose={handleCloseFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentConfig ? 'Editar Configuração' : 'Nova Configuração'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Configuração"
                name="config_name"
                value={formData.config_name}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                name="description"
                value={formData.description}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>

            {/* First Payment */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2 }}>Primeira Venda</Typography>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Tipo</InputLabel>
                <Select
                  name="first_payment_type"
                  value={formData.first_payment_type}
                  label="Tipo"
                  onChange={handleChange}
                >
                  <MenuItem value="percentage">Percentual</MenuItem>
                  <MenuItem value="fixed">Valor Fixo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Valor"
                name="first_payment_value"
                value={formData.first_payment_value}
                onChange={handleChange}
                margin="normal"
                type="number"
                inputProps={{ step: "0.01" }}
                required
              />
            </Grid>

            {/* Recurring Payment */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2 }}>Recorrente</Typography>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Tipo</InputLabel>
                <Select
                  name="recurring_payment_type"
                  value={formData.recurring_payment_type}
                  label="Tipo"
                  onChange={handleChange}
                >
                  <MenuItem value="percentage">Percentual</MenuItem>
                  <MenuItem value="fixed">Valor Fixo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Valor"
                name="recurring_payment_value"
                value={formData.recurring_payment_value}
                onChange={handleChange}
                margin="normal"
                type="number"
                inputProps={{ step: "0.01" }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Limite de Parcelas (deixe vazio para ilimitado)"
                name="recurring_limit"
                value={formData.recurring_limit}
                onChange={handleChange}
                margin="normal"
                type="number"
                inputProps={{ min: "0" }}
              />
            </Grid>

            {/* Application and Validity */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2 }}>Aplicação e Vigência</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Aplica a</InputLabel>
                <Select
                  name="applies_to"
                  value={formData.applies_to}
                  label="Aplica a"
                  onChange={handleChange}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="partner">Parceiros</MenuItem>
                  <MenuItem value="ambassador">Embaixadores</MenuItem>
                  <MenuItem value="custom">Usuários Específicos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valor Mínimo para Saque (R$)" // NOVO: Campo para valor mínimo de saque
                name="min_payout_amount"
                value={formData.min_payout_amount}
                onChange={handleChange}
                margin="normal"
                type="number"
                inputProps={{ step: "0.01", min: "0" }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Válido de"
                name="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={handleChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Válido até"
                name="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={handleChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={handleChange}
                    name="active"
                    color="primary"
                  />
                }
                label="Ativo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFormDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : (currentConfig ? 'Salvar Alterações' : 'Criar Configuração')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography>
            Tem certeza que deseja excluir a configuração{' '}
            <strong>{configToDelete?.config_name}</strong> (ID: {configToDelete?.id})?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
