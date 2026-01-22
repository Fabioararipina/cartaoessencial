import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { rewardsService } from '../../services/api'; // Supondo que rewardsService existe

export default function AdminPremios() {
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentReward, setCurrentReward] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    points_required: '',
    valor_equivalente: '',
    estoque: -1,
    categoria: '',
    imagem_url: ''
  });

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await rewardsService.getAll();
      setRewards(response.data.rewards || []);
    } catch (error) {
      console.error('Erro ao buscar prêmios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (reward = null) => {
    setCurrentReward(reward);
    if (reward) {
      setForm({
        nome: reward.nome,
        descricao: reward.descricao,
        points_required: reward.points_required,
        valor_equivalente: reward.valor_equivalente,
        estoque: reward.estoque,
        categoria: reward.categoria,
        imagem_url: reward.imagem_url || ''
      });
    } else {
      setForm({
        nome: '',
        descricao: '',
        points_required: '',
        valor_equivalente: '',
        estoque: -1,
        categoria: '',
        imagem_url: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentReward(null);
    setForm({
      nome: '',
      descricao: '',
      points_required: '',
      valor_equivalente: '',
      estoque: -1,
      categoria: '',
      imagem_url: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (currentReward) {
        await rewardsService.update(currentReward.id, form);
      } else {
        await rewardsService.create(form);
      }
      fetchRewards();
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar prêmio:', error);
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Gerenciar Prêmios
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Novo Prêmio
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        {rewards.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Nenhum prêmio cadastrado.
            </Typography>
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => handleOpenDialog()}
            >
              Cadastrar Primeiro Prêmio
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Pontos</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Estoque</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>{reward.nome}</TableCell>
                    <TableCell>{reward.points_required}</TableCell>
                    <TableCell>{reward.categoria}</TableCell>
                    <TableCell>{reward.estoque === -1 ? 'Ilimitado' : reward.estoque}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton onClick={() => handleOpenDialog(reward)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{currentReward ? 'Editar Prêmio' : 'Novo Prêmio'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="nome"
            label="Nome do Prêmio"
            type="text"
            fullWidth
            variant="outlined"
            value={form.nome}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="descricao"
            label="Descrição"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={form.descricao}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="points_required"
            label="Pontos Necessários"
            type="number"
            fullWidth
            variant="outlined"
            value={form.points_required}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="valor_equivalente"
            label="Valor Equivalente (R$)"
            type="number"
            fullWidth
            variant="outlined"
            value={form.valor_equivalente}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="estoque"
            label="Estoque (-1 para ilimitado)"
            type="number"
            fullWidth
            variant="outlined"
            value={form.estoque}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel id="categoria-label">Categoria</InputLabel>
            <Select
              labelId="categoria-label"
              name="categoria"
              value={form.categoria}
              label="Categoria"
              onChange={handleChange}
            >
              <MenuItem value=""><em>Nenhum</em></MenuItem>
              <MenuItem value="desconto">Desconto</MenuItem>
              <MenuItem value="vale">Vale</MenuItem>
              <MenuItem value="produto">Produto</MenuItem>
              <MenuItem value="servico">Serviço</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="imagem_url"
            label="URL da Imagem"
            type="text"
            fullWidth
            variant="outlined"
            value={form.imagem_url}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentReward ? 'Salvar Alterações' : 'Criar Prêmio'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
