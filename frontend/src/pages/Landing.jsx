import React, { useContext, useState, useEffect } from 'react'
import "../App.css"
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { Avatar, Box, IconButton, Menu, MenuItem, Typography, Button, CircularProgress, Divider } from '@mui/material'
import RestoreIcon from '@mui/icons-material/Restore'
import LoginIcon from '@mui/icons-material/Login'
import AppRegistrationIcon from '@mui/icons-material/AppRegistration'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import LogoutIcon from '@mui/icons-material/Logout'
import EmailIcon from '@mui/icons-material/Email'
import PersonIcon from '@mui/icons-material/Person'


export default function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, loading, loginAsGuest, logout, refreshUser } = useContext(AuthContext);
    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        if (isAuthenticated && refreshUser) {
            refreshUser(); 
        }
    }, [location.key, isAuthenticated]); 

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await logout();
        handleMenuClose();
    };

    const handleGuestLogin = async () => {
        await loginAsGuest();
        navigate("/aljk23");
    };

    const getAvatarCharacter = () => {
        if (user?.username && user.username !== "users") {
            return user.username.charAt(0).toUpperCase();
        }
        if (user?.name && user.name !== "users") {
            return user.name.charAt(0).toUpperCase();
        }
        return "U";
    };

    const getDisplayName = () => {
        if (user?.username && user.username !== "users") {
            return user.username;
        }
        if (user?.name && user.name !== "users") {
            return user.name;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return "User";
    };

    // Show loading state
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress sx={{ color: '#FF9839' }} />
            </div>
        );
    }

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>My Video Call</h2>
                </div>
                <div className='navlist'>
                    {isAuthenticated ? (
                        <>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <IconButton onClick={handleMenuOpen}>
                                    <Avatar sx={{ bgcolor: '#FF9839', width: 40, height: 40 }}>
                                        {getAvatarCharacter()}
                                    </Avatar>
                                </IconButton>
                                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333' }}>
                                        {getDisplayName()} {}
                                    </Typography>
                                    {user?.email && user.email !== "users" && (
                                        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                                            {user.email}
                                        </Typography>
                                    )}
                                    {user?.isGuest && (
                                        <Typography variant="caption" sx={{ color: '#FF9839', fontSize: '0.7rem' }}>
                                            Guest Mode
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                                PaperProps={{
                                    sx: { width: 250, mt: 1 }
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.5, bgcolor: '#f5f5f5' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PersonIcon fontSize="small" sx={{ color: '#FF9839' }} />
                                        {getDisplayName()} {/* ✅ Fixed */}
                                    </Typography>
                                    {user?.email && user.email !== "users" && (
                                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: '#666' }}>
                                            <EmailIcon fontSize="small" sx={{ color: '#FF9839' }} />
                                            {user.email}
                                        </Typography>
                                    )}
                                </Box>
                                <Divider />
                                
                                {!user?.isGuest && (
                                    <MenuItem onClick={() => { 
                                        handleMenuClose(); 
                                        navigate("/history");
                                    }}>
                                        <RestoreIcon sx={{ mr: 2, color: '#FF9839' }} /> 
                                        History
                                    </MenuItem>
                                )}
                                
                                <Divider />
                                
                                {/* Logout */}
                                <MenuItem onClick={handleLogout}>
                                    <LogoutIcon sx={{ mr: 2, color: '#FF9839' }} /> 
                                    Logout
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <>
                            <Button 
                                variant="text"
                                startIcon={<PersonAddIcon />}
                                onClick={handleGuestLogin}
                                sx={{ 
                                    color: '#39e1ffc5',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 152, 57, 0.1)'
                                    }
                                }}
                            >
                                Join as Guest
                            </Button>
                            
                            <Button 
                                variant="outlined"
                                startIcon={<AppRegistrationIcon />}
                                onClick={() => navigate("/auth")}
                                sx={{ 
                                    borderColor: '#d9d1ca',
                                    color: '#39efff',
                                    '&:hover': {
                                        borderColor: '#e68220',
                                        backgroundColor: 'rgba(255, 152, 57, 0.1)'
                                    }
                                }}
                            >
                                Register
                            </Button>
                            
                            <Button 
                                variant="contained"
                                startIcon={<LoginIcon />}
                                onClick={() => navigate("/auth")}
                                sx={{ 
                                    backgroundColor: '#39e1ffc5',
                                    '&:hover': {
                                        backgroundColor: '#e68220'
                                    }
                                }}
                            >
                                Login
                            </Button>
                        </>
                    )}
                </div>
            </nav>

            <div className="landingMainContainer">
                <div>
                    {isAuthenticated && user ? (
                        <>
                            <h1>
                                Welcome back, <span style={{ color: "#FF9839" }}>{getDisplayName()}</span>! {/* ✅ Fixed */}
                            </h1>
                            <p>Ready to connect with your loved ones?</p>
                            {user?.email && user.email !== "users" && (
                                <p style={{ fontSize: "0.9rem", color: "#666" }}>
                                    📧 {user.email}
                                </p>
                            )}
                            {user?.isGuest && (
                                <p style={{ fontSize: "0.9rem", color: "#FF9839" }}>
                                    ⚡ You're in guest mode. Register to save your history!
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <h1>
                                <span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones
                            </h1>
                            <p>Cover a distance by Apna Video Call</p>
                        </>
                    )}
                    
                    <div role='button'>
                        <Link to={isAuthenticated ? "/home" : "/auth"} style={{ 
                            backgroundColor: "#FF9839", 
                            color: "white",
                            textDecoration: "none",
                            padding: "12px 24px",
                            borderRadius: "8px",
                            display: "inline-block"
                        }}>
                            {isAuthenticated ? "Start Video Chat" : "Get Started"}
                        </Link>
                    </div>
                </div>
                <div>
                    <img src="/mobile.png" alt="Video Call Mobile App" />
                </div>
            </div>
        </div>
    )
}