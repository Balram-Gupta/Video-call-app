import React, { useContext, useState } from 'react'
import withAuth from '../utils/WithAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField, Avatar, Menu, MenuItem, Box, Typography, Divider } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import { AuthContext } from '../context/AuthContext';

function HomeComponent() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [anchorEl, setAnchorEl] = useState(null);
    
    const { user, addToUserHistory, logout } = useContext(AuthContext);
    
    let handleJoinVideoCall = async () => {
        const callTarget = meetingCode.trim();
        if (callTarget) {
            await addToUserHistory(callTarget);
            navigate(`/${encodeURIComponent(callTarget)}`);
        }
    }

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

    // Get first character of username for avatar
    const getAvatarCharacter = () => {
        if (user?.username) {
            return user.username.charAt(0).toUpperCase();
        }
        if (user?.name) {
            return user.name.charAt(0).toUpperCase();
        }
        return "U";
    };

    return (
        <>
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <h2>My Video Call</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton onClick={handleMenuOpen}>
                            <Avatar sx={{ bgcolor: '#FF9839', width: 40, height: 40 }}>
                                {getAvatarCharacter()}
                            </Avatar>
                        </IconButton>
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {user?.username || user?.name || "User"}
                            </Typography>
                            {user?.email && (
                                <Typography variant="caption" color="textSecondary">
                                    {user.email}
                                </Typography>
                            )}
                            {user?.isGuest && (
                                <Typography variant="caption" sx={{ color: '#FF9839' }}>
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
                        {/* User Info Section */}
                        <Box sx={{ px: 2, py: 1.5, bgcolor: '#f5f5f5' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon fontSize="small" sx={{ color: '#FF9839' }} />
                                {user?.username || user?.name}
                            </Typography>
                            {user?.email && (
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: '#666' }}>
                                    <EmailIcon fontSize="small" sx={{ color: '#FF9839' }} />
                                    {user.email}
                                </Typography>
                            )}
                        </Box>
                        <Divider />
                        
                        {/* History - Only for registered users */}
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
                </div>
            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2>Providing Quality Video Call Just Like Quality Education</h2>

                        {user && (
                            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                <Typography variant="body1">
                                    Welcome back, <strong>{user.username || user.name}</strong>!
                                </Typography>
                                {user.email && (
                                    <Typography variant="caption" color="textSecondary">
                                        {user.email}
                                    </Typography>
                                )}
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Ready to contact someone?
                                </Typography>
                            </Box>
                        )}

                        <div style={{ display: 'flex', gap: "10px", flexWrap: "wrap" }}>
                            <TextField 
                                onChange={e => setMeetingCode(e.target.value)} 
                                id="outlined-basic" 
                                label="Meeting code or username" 
                                variant="outlined"
                                value={meetingCode}
                            />
                            <Button 
                                onClick={handleJoinVideoCall} 
                                variant='contained'
                                disabled={!meetingCode.trim()}
                                sx={{ backgroundColor: '#FF9839', '&:hover': { backgroundColor: '#e68220' } }}
                            >
                                Start / Join
                            </Button>
                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="" />
                </div>
            </div>
        </>
    )   
}

export default withAuth(HomeComponent);
