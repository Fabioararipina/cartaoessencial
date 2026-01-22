import React, { useState, useEffect } from 'react';
import { partnersService, adminService } from '../../services/api';
import {
  Container, Box, Typography, CircularProgress, Card, Grid,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Divider,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, IconButton
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function AdminParceiros() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog de novo parceiro
  const [newDialog, setNewDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    cpf: '',
    telefone: '',
    nome_estabelecimento: '',
    cnpj: '',
    categoria: '',
    endereco: '',
    desconto_oferecido: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const response = await partnersService.getAll();
      setPartners(response.data.partners || []);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleCreatePartner = async () => {
    setSaving(true);
    setError('');

    // Validações básicas
    if (!formData.nome || !formData.email || !formData.senha || !formData.cpf || !formData.nome_estabelecimento) {
      setError('Preencha todos os campos obrigatórios');
      setSaving(false);
      return;
    }

    try {
      await adminService.createPartner(formData);
      setSuccess('Parceiro criado com sucesso!');
      setNewDialog(false);
      setFormData({
        nome: '',
        email: '',
        senha: '',
        cpf: '',
        telefone: '',
        nome_estabelecimento: '',
        cnpj: '',
        categoria: '',
        endereco: '',
        desconto_oferecido: '',
      });
      loadPartners();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao criar parceiro');
    } finally {
      setSaving(false);
    }
  };

  const formatCnpj = (cnpj) => {
    if (!cnpj) return '-';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            Gestão de Parceiros
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie a rede de parceiros do sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewDialog(true)}
        >
          Novo Parceiro
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Lista de Parceiros */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
        {partners.length === 0 ? (
          <Box sx={{ width: '100%', p: 1.5 }}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <StorefrontIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Nenhum parceiro cadastrado
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setNewDialog(true)}
                sx={{ mt: 2 }}
              >
                Cadastrar primeiro parceiro
              </Button>
            </Card>
          </Box>
        ) : (
          partners.map((partner) => (
            <Box sx={{ p: 1.5, width: { xs: '100%', md: '50%' } }} key={partner.id}>
              <Card sx={{ 
                height: 250, 
                display: 'flex', 
                flexDirection: 'column',
                border: '1px solid #eee',
                boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
                }
              }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      width: 56,
                      height: 56,
                    }}
                  >
                    <StorefrontIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="h6">
                        {partner.nome_estabelecimento}
                      </Typography>
                      {partner.ativo && (
                        <Chip
                          label="Ativo"
                          size="small"
                          color="success"
                          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                        />
                      )}
                    </Box>

                    {partner.categoria && (
                      <Chip
                        label={partner.categoria}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                    )}

                    <Typography variant="body2" color="text.secondary">
                      Responsável: {partner.user_nome || partner.nome}
                    </Typography>

                    {partner.cnpj && (
                      <Typography variant="caption" color="text.disabled" display="block">
                        CNPJ: {formatCnpj(partner.cnpj)}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ p: 2, mt: 'auto' }}>
                  {partner.endereco && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <LocationOnIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {partner.endereco}
                      </Typography>
                    </Box>
                  )}

                  {partner.desconto_oferecido && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocalOfferIcon fontSize="small" color="secondary" />
                      <Typography variant="body2" color="secondary.main" fontWeight="medium">
                        {partner.desconto_oferecido}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Box>
          ))
        )}
      </Box>

      {/* Dialog Novo Parceiro */}
      <Dialog open={newDialog} onClose={() => setNewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Cadastrar Novo Parceiro</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Dados do Responsável
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Nome Completo"
                  value={formData.nome}
                  onChange={handleChange('nome')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="CPF"
                  value={formData.cpf}
                  onChange={handleChange('cpf')}
                  placeholder="00000000000"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Senha"
                  type="password"
                  value={formData.senha}
                  onChange={handleChange('senha')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={formData.telefone}
                  onChange={handleChange('telefone')}
                  placeholder="11999999999"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Dados do Estabelecimento
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Nome do Estabelecimento"
                  value={formData.nome_estabelecimento}
                  onChange={handleChange('nome_estabelecimento')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CNPJ"
                  value={formData.cnpj}
                  onChange={handleChange('cnpj')}
                  placeholder="00000000000000"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Categoria"
                  value={formData.categoria}
                  onChange={handleChange('categoria')}
                  placeholder="Ex: Farmácia, Restaurante, Mercado"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Desconto Oferecido"
                  value={formData.desconto_oferecido}
                  onChange={handleChange('desconto_oferecido')}
                  placeholder="Ex: 10% em todos os produtos"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Endereço"
                  value={formData.endereco}
                  onChange={handleChange('endereco')}
                  placeholder="Rua, número, bairro, cidade"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleCreatePartner}
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
