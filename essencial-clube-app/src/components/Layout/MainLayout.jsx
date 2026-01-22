import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
  useTheme, useMediaQuery, Avatar, Menu, MenuItem, Tooltip, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StarsIcon from '@mui/icons-material/Stars'; // NOVO: Importar StarsIcon que estava faltando
import SettingsIcon from '@mui/icons-material/Settings'; // NOVO: Ícone para Configurações
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'; // NOVO: Ícone para Comissões
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'; // NOVO: Ícone para Saques
import LogoutIcon from '@mui/icons-material/Logout';
import logo from '../../assets/logo.png'; // NOVO: Importar logo que estava faltando

const drawerWidth = 240;

const getNavItems = (tipo) => {
  const iconMap = {
    home: <HomeIcon />,
    premios: <CardGiftcardIcon />,
    indicar: <PeopleIcon />,
    perfil: <PersonIcon />,
    lancar: <QrCode2Icon />,
    historico: <HistoryIcon />,
    dashboard: <AdminPanelSettingsIcon />,
    usuarios: <PeopleIcon />,
    resgates: <CardGiftcardIcon />,
    parceiros: <StorefrontIcon />,
    premiosAdmin: <StarsIcon />,
    commissionConfigs: <SettingsIcon />, // NOVO: Ícone para Configurações de Comissão
    comissoes: <AttachMoneyIcon />, // NOVO: Ícone para Comissões do Parceiro
    saques: <AccountBalanceWalletIcon />, // NOVO: Ícone para Saques
  };

  const items = {
    cliente: [
      { to: '/dashboard', label: 'Início', icon: iconMap.home },
      { to: '/premios', label: 'Prêmios', icon: iconMap.premios },
      { to: '/indicar', label: 'Indicar', icon: iconMap.indicar },
    ],
    parceiro: [
      { to: '/parceiro', label: 'Início', icon: iconMap.home },
      { to: '/parceiro/lancar', label: 'Lançar Pontos', icon: iconMap.lancar },
      { to: '/parceiro/historico', label: 'Histórico', icon: iconMap.historico },
      { to: '/parceiro/comissoes', label: 'Comissões', icon: iconMap.comissoes }, // NOVO: Link para Comissões do Parceiro
    ],
    admin: [
      { to: '/admin', label: 'Dashboard', icon: iconMap.dashboard },
      { to: '/admin/usuarios', label: 'Usuários', icon: iconMap.usuarios },
      { to: '/admin/resgates', label: 'Resgates', icon: iconMap.resgates },
      { to: '/admin/parceiros', label: 'Parceiros', icon: iconMap.parceiros },
      { to: '/admin/premios', label: 'Prêmios', icon: iconMap.premiosAdmin },
      { to: '/admin/commission-configs', label: 'Comissões', icon: iconMap.commissionConfigs },
      { to: '/admin/payouts', label: 'Saques', icon: iconMap.saques }, // NOVO: Link para Gestão de Saques
    ],
  };

  return items[tipo] || items.cliente;
};

const getInitials = (name) => {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState(null);

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const navItems = getNavItems(user?.tipo);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate('/login');
  };
  
  const handleProfile = () => {
    handleCloseUserMenu();
    navigate('/perfil');
  }

  const drawerContent = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1, '& a': { textDecoration: 'none' } }}>
        <NavLink to={user?.tipo === 'cliente' ? '/dashboard' : `/`}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="Essencial Saúde" style={{ height: 40 }} />
            <Typography variant="h6" sx={{ ml: 1, color: 'primary.main', fontWeight: 'bold' }}>
              Clube
            </Typography>
          </Box>
        </NavLink>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.to} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.to}
              end
              onClick={!isMdUp ? handleDrawerToggle : undefined}
              sx={{
                '&.active': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          color: 'text.primary',
          boxShadow: 'inset 0px -1px 1px rgba(0, 0, 0, 0.05)'
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          
          <Tooltip title="Opções do usuário">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                {getInitials(user?.nome)}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight="bold">{user?.nome}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user?.tipo}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfile}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Perfil</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Sair</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant={isMdUp ? 'permanent' : 'temporary'}
          open={isMdUp ? true : mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.08)'
            },
          }}
          PaperProps={{
            elevation: 0
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: 'background.default',
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}