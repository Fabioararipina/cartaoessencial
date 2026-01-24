import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Paper,
} from '@mui/material';
import { Search, LocationOn, Close } from '@mui/icons-material';
import { partnersService } from '../services/api';

const PartnersPage = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedPartner, setSelectedPartner] = useState(null);

  useEffect(() => {
    const fetchPartners = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await partnersService.getAll();
        setPartners(response.data.partners || []);
      } catch (err) {
        console.error('Erro ao buscar parceiros:', err);
        setError('Não foi possível carregar a lista de parceiros.');
      } finally {
        setLoading(false);
      }
    };
    fetchPartners();
  }, []);

  const categories = useMemo(() => {
    const allCategories = partners.map((p) => p.categoria).filter(Boolean);
    return ['Todas', ...new Set(allCategories)];
  }, [partners]);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesCategory =
        selectedCategory === 'Todas' || partner.categoria === selectedCategory;
      const matchesSearch =
        partner.nome_estabelecimento.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [partners, searchTerm, selectedCategory]);
  
  const handleOpenDialog = (partner) => {
    setSelectedPartner(partner);
  };

  const handleCloseDialog = () => {
    setSelectedPartner(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Nossos Parceiros
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Aproveite descontos e benefícios exclusivos com os parceiros Essencial Saúde.
      </Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 4, borderRadius: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar por nome do estabelecimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'center', md: 'flex-start'} }}>
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  clickable
                  color={selectedCategory === category ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(category)}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredPartners.length === 0 ? (
        <Alert severity="info">Nenhum parceiro encontrado com os filtros aplicados.</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredPartners.map((partner) => (
            <Grid item key={partner.id} xs={12} sm={6} md={4}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 4,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  }
                }}
              >
                <CardActionArea onClick={() => handleOpenDialog(partner)} sx={{ flexGrow: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1}}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1, flexGrow: 1 }}>
                        {partner.nome_estabelecimento}
                      </Typography>
                      {partner.categoria && <Chip label={partner.categoria} size="small" color="secondary" />}
                    </Box>
                    {partner.endereco && (
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 2 }}>
                        <LocationOn fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body2">{partner.endereco.split(',')[0]}</Typography>
                      </Box>
                    )}
                    <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                      {partner.desconto_oferecido}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {selectedPartner && (
        <Dialog open={!!selectedPartner} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            {selectedPartner.nome_estabelecimento}
            <IconButton
              aria-label="close"
              onClick={handleCloseDialog}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ mb: 2 }}>
              {selectedPartner.categoria && <Chip label={selectedPartner.categoria} color="secondary" />}
            </Box>
            <Typography gutterBottom sx={{ fontWeight: 'bold' }}>Desconto Oferecido:</Typography>
            <DialogContentText sx={{ fontSize: '1.2rem', color: 'primary.main', mb: 2}}>
                {selectedPartner.desconto_oferecido}
            </DialogContentText>
            
            {selectedPartner.endereco && (
                <>
                    <Typography gutterBottom sx={{ fontWeight: 'bold' }}>Endereço:</Typography>
                    <DialogContentText sx={{ mb: 2 }}>
                        {selectedPartner.endereco}
                    </DialogContentText>
                </>
            )}

            { (selectedPartner.email || selectedPartner.telefone) && 
                <>
                    <Typography gutterBottom sx={{ fontWeight: 'bold' }}>Contato:</Typography>
                    {selectedPartner.email && <DialogContentText>Email: {selectedPartner.email}</DialogContentText>}
                    {selectedPartner.telefone && <DialogContentText>Telefone: {selectedPartner.telefone}</DialogContentText>}
                </>
            }
            
            {selectedPartner.condicoes && (
                 <>
                    <Typography gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Condições:</Typography>
                    <DialogContentText>
                        {selectedPartner.condicoes}
                    </DialogContentText>
                </>
            )}

          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Fechar</Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default PartnersPage;
