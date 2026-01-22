import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Pagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Alert, Grid // Adicionar Grid aqui
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FlashOnIcon from '@mui/icons-material/FlashOn'; // Importar FlashOnIcon
import DeleteIcon from '@mui/icons-material/Delete'; // Importar DeleteIcon
import SearchIcon from '@mui/icons-material/Search'; // Importar SearchIcon
import EditIcon from '@mui/icons-material/Edit'; // Importar EditIcon

import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Importar CheckCircleIcon

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modal de edição de usuário
  const [userEditDialog, setUserEditDialog] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    tipo: '',
    status: '',
    nivel: '',
  });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editError, setEditError] = useState('');
  
  // Dialog de novo usuário
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    tipo: 'cliente',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Estados para ativação manual
  const [activatingUser, setActivatingUser] = useState(null); // Armazena o ID do usuário sendo ativado
  const [activationError, setActivationError] = useState('');

  // Estados para exclusão
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, filterTipo, filterStatus]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        tipo: filterTipo || undefined,
        status: filterStatus || undefined,
        search: search || undefined,
      };
      const response = await adminService.getUsers(params);
      setUsers(response.data.users || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError('Erro ao carregar usuários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };
  
  const handleActivateUser = async (userId) => {
    setActivatingUser(userId);
    setActivationError('');
    try {
      await adminService.activateUserManually(userId);
      loadUsers(); // Recarregar lista para refletir a mudança
    } catch (err) {
      setActivationError(err.response?.data?.error || 'Erro ao ativar usuário manualmente.');
    } finally {
      setActivatingUser(null);
    }
  };

  const openUserEditDialog = (user) => {
    setCurrentUserToEdit(user);
    setEditFormData({
      nome: user.nome,
      email: user.email,
      cpf: user.cpf,
      telefone: user.telefone || '',
      tipo: user.tipo,
      status: user.status,
      nivel: user.nivel,
    });
    setEditError(''); // Clear previous errors
    setUserEditDialog(true);
  };
  
  const handleNewUserChange = (field) => (e) => {
    setNewUserData({ ...newUserData, [field]: e.target.value });
  };

  const handleUpdateUser = async () => {
    if (!currentUserToEdit) return;

    setIsUpdatingUser(true);
    setEditError('');

    try {
      await adminService.updateUser(currentUserToEdit.id, editFormData);
      setUserEditDialog(false);
      loadUsers(); // Recarrega a lista para refletir a mudança
    } catch (error) {
      setEditError(error.response?.data?.error || 'Erro ao atualizar usuário');
    } finally {
    }
  };

  const openDeleteConfirmDialog = (user) => {
    setUserToDelete(user);
    setDeleteConfirmDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    setEditError(''); // Reutilizando o estado de erro, ou poderíamos criar um novo

    try {
      await adminService.deleteUser(userToDelete.id);
      setDeleteConfirmDialogOpen(false);
      loadUsers(); // Recarrega a lista para refletir a mudança
    } catch (error) {
      setEditError(error.response?.data?.error || 'Erro ao excluir usuário');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const getStatusChip = (status) => {
    const config = {
      ativo: { color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
      inativo: { color: 'warning', icon: <PersonOffIcon sx={{ fontSize: 16 }} /> },
      bloqueado: { color: 'error', icon: <BlockIcon sx={{ fontSize: 16 }} /> },
    };
    const { color, icon } = config[status] || { color: 'default', icon: null };
    return <Chip label={status} color={color} size="small" icon={icon} sx={{ textTransform: 'capitalize' }} />;
  };

  const getTipoChip = (tipo) => {
    const colors = {
      cliente: 'primary',
      parceiro: 'secondary',
      admin: 'error',
    };
    return <Chip label={tipo} color={colors[tipo] || 'default'} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />;
  };

  const getNivelChip = (nivel) => {
    const colors = {
      bronze: '#CD7F32',
      prata: '#C0C0C0',
      ouro: '#FFD700',
      diamante: '#B9F2FF',
    };
    return (
      <Chip
        label={nivel}
        size="small"
        sx={{
          bgcolor: colors[nivel] || '#ccc',
          color: nivel === 'diamante' ? '#1e40af' : '#fff',
          textTransform: 'capitalize',
          fontWeight: 'bold',
        }}
      />
    );
  };

  const formatCpf = (cpf) => {
    return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '-';
  };

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString('pt-BR') : '-';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            Gestão de Usuários
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualize e gerencie todos os usuários do sistema
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<PersonAddIcon />}
          onClick={() => setNewUserDialog(true)}
        >
          Novo Usuário
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Buscar por nome, email ou CPF"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filterTipo}
              label="Tipo"
              onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="cliente">Cliente</MenuItem>
              <MenuItem value="parceiro">Parceiro</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ativo">Ativo</MenuItem>
              <MenuItem value="inativo">Inativo</MenuItem>
              <MenuItem value="bloqueado">Bloqueado</MenuItem>
            </Select>
          </FormControl>

          <Button type="submit" variant="contained">
            Buscar
          </Button>
        </Box>
      </Card>

      {/* Tabela */}
      <Card>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum usuário encontrado
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Nível</TableCell>
                    <TableCell>Cadastro</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {user.nome}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {formatCpf(user.cpf)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{getTipoChip(user.tipo)}</TableCell>
                      <TableCell>{getStatusChip(user.status)}</TableCell>
                      <TableCell>{getNivelChip(user.nivel)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(user.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => openUserEditDialog(user)}
                          title="Editar usuário"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        {user.status === 'inativo' && (
                          <IconButton
                            size="small"
                            onClick={() => handleActivateUser(user.id)}
                            title="Ativar Pagamento Manual"
                            disabled={activatingUser === user.id}
                          >
                            {activatingUser === user.id ? (
                                <CircularProgress size={16} />
                            ) : (
                                <FlashOnIcon fontSize="small" />
                            )}
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => openDeleteConfirmDialog(user)}
                          title="Excluir usuário"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Paginação */}
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

      {/* Dialog de Edição de Usuário Completa */}
      <Dialog open={userEditDialog} onClose={() => setUserEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Usuário</DialogTitle>
        <DialogContent>
          {currentUserToEdit && (
            <Box sx={{ pt: 1 }}>
              {editError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {editError}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Nome Completo"
                    value={editFormData.nome}
                    onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="CPF (apenas números)"
                    value={editFormData.cpf}
                    onChange={(e) => setEditFormData({ ...editFormData, cpf: e.target.value })}
                    margin="normal"
                    inputProps={{ maxLength: 11 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={editFormData.telefone}
                    onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                    margin="normal"
                    inputProps={{ maxLength: 11 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      label="Tipo"
                      value={editFormData.tipo}
                      onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                    >
                      <MenuItem value="cliente">Cliente</MenuItem>
                      <MenuItem value="parceiro">Parceiro</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <MenuItem value="ativo">Ativo</MenuItem>
                      <MenuItem value="inativo">Inativo</MenuItem>
                      <MenuItem value="bloqueado">Bloqueado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Nível</InputLabel>
                    <Select
                      label="Nível"
                      value={editFormData.nivel}
                      onChange={(e) => setEditFormData({ ...editFormData, nivel: e.target.value })}
                    >
                      <MenuItem value="bronze">Bronze</MenuItem>
                      <MenuItem value="prata">Prata</MenuItem>
                      <MenuItem value="ouro">Ouro</MenuItem>
                      <MenuItem value="diamante">Diamante</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserEditDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={isUpdatingUser}
          >
            {isUpdatingUser ? <CircularProgress size={20} /> : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteConfirmDialogOpen}
        onClose={() => setDeleteConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o usuário{' '}
            <strong>{userToDelete?.nome}</strong> (ID: {userToDelete?.id})?
            Esta ação não pode ser desfeita.
          </Typography>
          {editError && ( // Reutilizando o estado de erro
            <Alert severity="error" sx={{ mt: 2 }}>
              {editError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialogOpen(false)} disabled={isDeletingUser}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteUser}
            color="error"
            variant="contained"
            disabled={isDeletingUser}
          >
            {isDeletingUser ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
