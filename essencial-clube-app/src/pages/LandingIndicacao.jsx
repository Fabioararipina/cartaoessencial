import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Card, CardContent, Grid,
  Avatar, Chip, Divider, Paper, useTheme, useMediaQuery
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import GroupIcon from '@mui/icons-material/Group';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShieldIcon from '@mui/icons-material/Shield';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

// Logo simples (pode substituir por imagem real)
const Logo = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <FavoriteIcon sx={{ color: '#74ca4f', fontSize: 36 }} />
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ color: '#5287fb', lineHeight: 1 }}>
        Essencial
      </Typography>
      <Typography variant="caption" sx={{ color: '#74ca4f', fontWeight: 600 }}>
        SAÚDE
      </Typography>
    </Box>
  </Box>
);

export default function LandingIndicacao() {
  const { code } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCadastro = () => {
    navigate(`/cadastro-indicado/${code}`);
  };

  // Benefícios do cartão
  const beneficios = [
    {
      icon: <LocalHospitalIcon sx={{ fontSize: 40 }} />,
      titulo: 'Consultas com Desconto',
      descricao: 'Até 70% de desconto em consultas médicas e exames em nossa rede credenciada.'
    },
    {
      icon: <LocalOfferIcon sx={{ fontSize: 40 }} />,
      titulo: 'Descontos Exclusivos',
      descricao: 'Economize em farmácias, óticas, academias e centenas de parceiros.'
    },
    {
      icon: <CardGiftcardIcon sx={{ fontSize: 40 }} />,
      titulo: 'Programa de Pontos',
      descricao: 'Acumule pontos a cada compra e troque por prêmios incríveis.'
    },
    {
      icon: <GroupIcon sx={{ fontSize: 40 }} />,
      titulo: 'Indique e Ganhe',
      descricao: 'Ganhe pontos indicando amigos e familiares. Quanto mais indica, mais ganha!'
    }
  ];

  // Parceiros em destaque (dados mockados - idealmente viriam da API)
  const parceirosDestaque = [
    {
      nome: 'Farmácia Popular',
      categoria: 'Farmácia',
      desconto: 'Até 35% OFF',
      icone: '💊'
    },
    {
      nome: 'Clínica Bem Estar',
      categoria: 'Saúde',
      desconto: 'Até 50% OFF',
      icone: '🏥'
    },
    {
      nome: 'Ótica Visão Clara',
      categoria: 'Ótica',
      desconto: 'Até 40% OFF',
      icone: '👓'
    }
  ];

  // Depoimentos
  const depoimentos = [
    {
      nome: 'Maria Silva',
      cidade: 'São Paulo, SP',
      texto: 'Economizei mais de R$ 500 só em consultas! O cartão se paga no primeiro mês.',
      avatar: 'M'
    },
    {
      nome: 'João Santos',
      cidade: 'Rio de Janeiro, RJ',
      texto: 'Indiquei 5 amigos e já resgatei vários prêmios. Recomendo demais!',
      avatar: 'J'
    },
    {
      nome: 'Ana Costa',
      cidade: 'Belo Horizonte, MG',
      texto: 'Atendimento excelente e descontos reais. Minha família toda já tem o cartão.',
      avatar: 'A'
    }
  ];

  // Números de impacto
  const numeros = [
    { valor: '5.000+', label: 'Clientes Ativos' },
    { valor: '200+', label: 'Parceiros' },
    { valor: '70%', label: 'Economia Média' },
    { valor: '4.9', label: 'Avaliação', icon: <StarIcon sx={{ color: '#FFD700', ml: 0.5 }} /> }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', py: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Logo />
            <Button
              variant="contained"
              onClick={handleCadastro}
              sx={{
                bgcolor: '#74ca4f',
                '&:hover': { bgcolor: '#5eb33a' },
                borderRadius: 3,
                px: 3
              }}
            >
              Quero Meu Cartão
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #5287fb 0%, #3d6fd9 50%, #2d5bb5 100%)',
          color: 'white',
          py: { xs: 6, md: 10 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative circles */}
        <Box sx={{
          position: 'absolute', top: -100, right: -100,
          width: 300, height: 300, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.1)'
        }} />
        <Box sx={{
          position: 'absolute', bottom: -50, left: -50,
          width: 200, height: 200, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.05)'
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              {/* Badge de indicação */}
              {code && (
                <Chip
                  icon={<VerifiedIcon />}
                  label="Você foi indicado por um amigo!"
                  sx={{
                    bgcolor: 'rgba(116, 202, 79, 0.9)',
                    color: 'white',
                    mb: 3,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    py: 2.5
                  }}
                />
              )}

              <Typography
                variant="h2"
                fontWeight="800"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  mb: 2,
                  lineHeight: 1.2
                }}
              >
                Cuide da sua saúde
                <Box component="span" sx={{ color: '#74ca4f' }}> pagando menos</Box>
              </Typography>

              <Typography
                variant="h6"
                sx={{ mb: 4, opacity: 0.95, fontWeight: 400, lineHeight: 1.6 }}
              >
                O Cartão Essencial Saúde dá acesso a descontos exclusivos em consultas,
                exames, medicamentos e muito mais. <strong>Sem carência, sem burocracia.</strong>
              </Typography>

              {/* Urgência */}
              <Paper
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  mb: 4
                }}
              >
                <TrendingUpIcon sx={{ color: '#74ca4f' }} />
                <Typography variant="body2">
                  <strong>+127 pessoas</strong> aderiram esta semana
                </Typography>
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleCadastro}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: '#74ca4f',
                    '&:hover': { bgcolor: '#5eb33a', transform: 'translateY(-2px)' },
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(116, 202, 79, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Garantir Meu Cartão
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<WhatsAppIcon />}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { borderColor: '#74ca4f', bgcolor: 'rgba(255,255,255,0.1)' },
                    borderRadius: 3,
                    px: 3
                  }}
                  onClick={() => window.open('https://wa.me/5511999999999?text=Olá! Quero saber mais sobre o Cartão Essencial Saúde', '_blank')}
                >
                  Tirar Dúvidas
                </Button>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              {/* Card visual do cartão */}
              <Box
                sx={{
                  bgcolor: 'white',
                  borderRadius: 4,
                  p: 3,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  transform: { md: 'rotate(3deg)' },
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'rotate(0deg) scale(1.02)' }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Logo />
                  <Chip label="ATIVO" color="success" size="small" />
                </Box>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  A partir de
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                  <Typography variant="h3" fontWeight="800" color="primary">
                    R$ 49
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    ,90/mês
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {['Sem taxa de adesão', 'Sem carência', 'Cancele quando quiser'].map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ color: '#74ca4f', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">{item}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Números de Impacto */}
      <Box sx={{ bgcolor: 'white', py: 4, borderBottom: '1px solid #eee' }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            {numeros.map((num, i) => (
              <Grid size={{ xs: 6, sm: 3 }} key={i}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    fontWeight="800"
                    sx={{ color: '#5287fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {num.valor}
                    {num.icon}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {num.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefícios */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="700" textAlign="center" sx={{ mb: 1 }}>
            Por que escolher o <Box component="span" sx={{ color: '#5287fb' }}>Essencial Saúde</Box>?
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 5 }}>
            Benefícios reais que fazem diferença no seu dia a dia
          </Typography>

          <Grid container spacing={3}>
            {beneficios.map((beneficio, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    p: 3,
                    border: '1px solid #eee',
                    boxShadow: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 10px 40px rgba(82, 135, 251, 0.15)',
                      transform: 'translateY(-5px)',
                      borderColor: '#5287fb'
                    }
                  }}
                >
                  <Box sx={{ color: '#5287fb', mb: 2 }}>
                    {beneficio.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
                    {beneficio.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {beneficio.descricao}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Parceiros em Destaque */}
      <Box sx={{ bgcolor: '#f0f4ff', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="700" textAlign="center" sx={{ mb: 1 }}>
            Parceiros em <Box component="span" sx={{ color: '#74ca4f' }}>Destaque</Box>
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 5 }}>
            Alguns dos estabelecimentos onde você pode usar seu cartão
          </Typography>

          <Grid container spacing={3} justifyContent="center">
            {parceirosDestaque.map((parceiro, i) => (
              <Grid size={{ xs: 12, sm: 4 }} key={i}>
                <Card
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    bgcolor: 'white',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                  }}
                >
                  <Typography variant="h2" sx={{ mb: 2 }}>
                    {parceiro.icone}
                  </Typography>
                  <Typography variant="h6" fontWeight="600">
                    {parceiro.nome}
                  </Typography>
                  <Chip label={parceiro.categoria} size="small" sx={{ my: 1 }} />
                  <Typography
                    variant="h5"
                    fontWeight="800"
                    sx={{ color: '#74ca4f', mt: 1 }}
                  >
                    {parceiro.desconto}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ mt: 4 }}
          >
            E mais de <strong>200 parceiros</strong> em diversas categorias!
          </Typography>
        </Container>
      </Box>

      {/* Depoimentos */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="700" textAlign="center" sx={{ mb: 1 }}>
            O que nossos <Box component="span" sx={{ color: '#5287fb' }}>clientes</Box> dizem
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 5 }}>
            Histórias reais de quem já economiza com o Essencial Saúde
          </Typography>

          <Grid container spacing={3}>
            {depoimentos.map((dep, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <Card
                  sx={{
                    height: '100%',
                    p: 3,
                    bgcolor: 'white',
                    border: '1px solid #eee',
                    boxShadow: 'none'
                  }}
                >
                  <FormatQuoteIcon sx={{ color: '#5287fb', fontSize: 32, opacity: 0.5 }} />
                  <Typography variant="body1" sx={{ my: 2, fontStyle: 'italic' }}>
                    "{dep.texto}"
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#5287fb' }}>{dep.avatar}</Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        {dep.nome}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dep.cidade}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 0.3 }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <StarIcon key={star} sx={{ color: '#FFD700', fontSize: 16 }} />
                      ))}
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Final */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #74ca4f 0%, #5eb33a 100%)',
          py: { xs: 6, md: 8 },
          color: 'white',
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <ShieldIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
          <Typography variant="h4" fontWeight="700" sx={{ mb: 2 }}>
            Comece a economizar hoje mesmo!
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.95, fontWeight: 400 }}>
            Cadastro rápido, sem burocracia. Seu cartão fica pronto na hora.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleCadastro}
            endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: 'white',
              color: '#5eb33a',
              '&:hover': { bgcolor: '#f0f0f0', transform: 'translateY(-2px)' },
              borderRadius: 3,
              px: 5,
              py: 1.5,
              fontSize: '1.2rem',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            Quero Meu Cartão Agora
          </Button>

          <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
            Cancele a qualquer momento. Sem multa, sem complicação.
          </Typography>
        </Container>
      </Box>

      {/* Footer simples */}
      <Box sx={{ bgcolor: '#1a1a2e', py: 3, color: 'white' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              © 2026 Essencial Saúde. Todos os direitos reservados.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }}>
                Termos de Uso
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }}>
                Privacidade
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
