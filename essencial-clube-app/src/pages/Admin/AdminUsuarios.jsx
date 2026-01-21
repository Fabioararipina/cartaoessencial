import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Pagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import PersonOffIcon from '@mui/icons-material/PersonOff';

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modal de edição de status
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

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
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setNewStatus(user.status);
    setError('');
    setEditDialog(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser || newStatus === selectedUser.status) {
      setEditDialog(false);
      return;
    }

    setUpdating(true);
    setError('');

    try {
      await adminService.updateUserStatus(selectedUser.id, newStatus);
      setEditDialog(false);
      loadUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setUpdating(false);
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
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Gestão de Usuários
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visualize e gerencie todos os usuários do sistema
        </Typography>
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
                          onClick={() => openEditDialog(user)}
                          title="Alterar status"
                        >
                          <EditIcon fontSize="small" />
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

      {/* Dialog de Edição */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Alterar Status do Usuário</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Usuário: <strong>{selectedUser.nome}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Email: {selectedUser.email}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <FormControl fullWidth>
                <InputLabel>Novo Status</InputLabel>
                <Select
                  value={newStatus}
                  label="Novo Status"
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                  <MenuItem value="bloqueado">Bloqueado</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            disabled={updating || newStatus === selectedUser?.status}
          >
            {updating ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
