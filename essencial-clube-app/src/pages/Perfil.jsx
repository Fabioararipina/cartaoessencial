import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pointsService, redemptionsService, userService } from '../services/api'; // NOVO: Importar userService
import {
  Container, Box, Typography, CircularProgress, Grid, Card, CardContent,
  List, ListItem, ListItemText, Divider, Avatar, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  IconButton, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit'; // NOVO: Ícone de edição

export default function Perfil() {
  const { user, logout, updateUser: updateAuthUser } = useAuth(); // NOVO: Renomear updateUser para updateAuthUser para evitar conflito
  const [saldo, setSaldo] = useState(0);
  const [resgates, setResgates] = useState([]);
  const [loading, setLoading] = useState(true);

  // NOVO: Estados para o modal de edição
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
  });
  // Estados separados para informações de pagamento PIX
  const [payoutData, setPayoutData] = useState({
    tipo_chave: '',
    chave_pix: '',
    nome_titular: '',
    banco: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Garantir que user.id existe antes de fazer chamadas à API
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const [balanceRes, redemptionsRes] = await Promise.all([
        pointsService.getBalance(user.id),
        redemptionsService.getMy(),
      ]);
      setSaldo(balanceRes.data.saldo);
      setResgates(redemptionsRes.data.redemptions);

      // NOVO: Preencher o formulário de edição com os dados atuais do usuário
      setEditFormData({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
      });
      // Preencher dados de pagamento se existirem
      if (user.payout_info) {
        setPayoutData({
          tipo_chave: user.payout_info.tipo_chave || '',
          chave_pix: user.payout_info.chave_pix || '',
          nome_titular: user.payout_info.nome_titular || '',
          banco: user.payout_info.banco || '',
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // setEditError(error.response?.data?.error || 'Erro ao carregar dados.'); // Pode ser útil para erros globais
    } finally {
      setLoading(false);
    }
  };

  // NOVO: Funções de manipulação do modal de edição
  const handleOpenEditDialog = () => {
    setOpenEditDialog(true);
    setEditError('');
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditError('');
  };

  const handleChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handlePayoutChange = (e) => {
    setPayoutData({ ...payoutData, [e.target.name]: e.target.value });
  };

  const handleSubmitEdit = async () => {
    setIsSubmitting(true);
    setEditError('');
    try {
      // Montar o objeto payout_info a partir dos campos individuais
      let parsedPayoutInfo = null;
      if (payoutData.tipo_chave && payoutData.chave_pix) {
        parsedPayoutInfo = {
          tipo_chave: payoutData.tipo_chave,
          chave_pix: payoutData.chave_pix,
          nome_titular: payoutData.nome_titular || '',
          banco: payoutData.banco || '',
        };
      }

      const payload = {
        nome: editFormData.nome,
        email: editFormData.email,
        telefone: editFormData.telefone,
        payout_info: parsedPayoutInfo,
      };

      const response = await userService.updateMe(payload);
      updateAuthUser(response.data.user); // Atualiza o usuário no AuthContext/localStorage
      handleCloseEditDialog();
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setEditError(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setIsSubmitting(false);
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
      <Card sx={{ textAlign: 'center', p: 4, mb: 3, position: 'relative' }}>
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
        {/* NOVO: Botão para Editar Perfil */}
        <IconButton
          sx={{ position: 'absolute', top: 8, right: 8 }}
          onClick={handleOpenEditDialog}
          aria-label="editar perfil"
        >
          <EditIcon />
        </IconButton>
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

      {/* NOVO: Informações de Pagamento */}
      {(user?.tipo === 'parceiro' || user?.tipo === 'embaixador') && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Dados para Recebimento (PIX)
            </Typography>
            {user?.payout_info?.chave_pix ? (
              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Tipo de Chave"
                    secondary={user.payout_info.tipo_chave || '-'}
                    primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                    secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary', textTransform: 'capitalize' }}
                  />
                </ListItem>
                <Divider />
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Chave PIX"
                    secondary={user.payout_info.chave_pix}
                    primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                    secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
                  />
                </ListItem>
                {user.payout_info.nome_titular && (
                  <>
                    <Divider />
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Nome do Titular"
                        secondary={user.payout_info.nome_titular}
                        primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                        secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
                      />
                    </ListItem>
                  </>
                )}
                {user.payout_info.banco && (
                  <>
                    <Divider />
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Banco"
                        secondary={user.payout_info.banco}
                        primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                        secondaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
                      />
                    </ListItem>
                  </>
                )}
              </List>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                Você ainda não cadastrou seus dados para recebimento. Clique no ícone de editar (canto superior direito) para adicionar sua chave PIX.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* NOVO: Dialog de Edição de Perfil */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Perfil</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <TextField
            fullWidth
            label="Nome Completo"
            name="nome"
            value={editFormData.nome}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={editFormData.email}
            onChange={handleChange}
            margin="normal"
            type="email"
            required
          />
          <TextField
            fullWidth
            label="Telefone"
            name="telefone"
            value={editFormData.telefone}
            onChange={handleChange}
            margin="normal"
            placeholder="(00) 00000-0000"
          />

          {/* Seção de Dados para Recebimento - apenas para parceiros/embaixadores */}
          {(user?.tipo === 'parceiro' || user?.tipo === 'embaixador') && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Dados para Recebimento (PIX)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Preencha os dados abaixo para receber suas comissões via PIX.
              </Typography>

              <FormControl fullWidth margin="normal">
                <InputLabel id="tipo-chave-label">Tipo de Chave PIX</InputLabel>
                <Select
                  labelId="tipo-chave-label"
                  name="tipo_chave"
                  value={payoutData.tipo_chave}
                  onChange={handlePayoutChange}
                  label="Tipo de Chave PIX"
                >
                  <MenuItem value="">
                    <em>Selecione...</em>
                  </MenuItem>
                  <MenuItem value="cpf">CPF</MenuItem>
                  <MenuItem value="cnpj">CNPJ</MenuItem>
                  <MenuItem value="email">E-mail</MenuItem>
                  <MenuItem value="telefone">Telefone</MenuItem>
                  <MenuItem value="aleatoria">Chave Aleatória</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Chave PIX"
                name="chave_pix"
                value={payoutData.chave_pix}
                onChange={handlePayoutChange}
                margin="normal"
                placeholder={
                  payoutData.tipo_chave === 'cpf' ? '000.000.000-00' :
                  payoutData.tipo_chave === 'cnpj' ? '00.000.000/0000-00' :
                  payoutData.tipo_chave === 'email' ? 'exemplo@email.com' :
                  payoutData.tipo_chave === 'telefone' ? '(00) 00000-0000' :
                  payoutData.tipo_chave === 'aleatoria' ? 'Cole sua chave aleatória aqui' :
                  'Selecione o tipo de chave primeiro'
                }
                helperText="Digite sua chave PIX conforme o tipo selecionado"
              />

              <TextField
                fullWidth
                label="Nome do Titular da Conta"
                name="nome_titular"
                value={payoutData.nome_titular}
                onChange={handlePayoutChange}
                margin="normal"
                placeholder="Nome completo como aparece na conta"
                helperText="Opcional - Nome de quem vai receber o PIX"
              />

              <TextField
                fullWidth
                label="Banco"
                name="banco"
                value={payoutData.banco}
                onChange={handlePayoutChange}
                margin="normal"
                placeholder="Ex: Nubank, Itaú, Bradesco..."
                helperText="Opcional - Banco onde a chave está cadastrada"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancelar</Button>
          <Button onClick={handleSubmitEdit} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
