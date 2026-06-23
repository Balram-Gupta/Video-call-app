import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    Container,
    Typography,
    List,
    ListItem,
    ListItemText,
    Paper,
    Box,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    CircularProgress,
    Chip,
    Alert,
    Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import RestoreIcon from '@mui/icons-material/Restore';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export default function HistoryComponent() {
    const navigate = useNavigate();
    const { user, getHistoryOfUser, logout } = useContext(AuthContext);
    const [history, setHistory] = useState([]); // Initialize as empty array
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getHistoryOfUser();
            
            console.log("History data received:", data); 
            
            //  Ensure history is always an array
            let historyArray = [];
            
            if (data && Array.isArray(data)) {
                historyArray = data;
            } else if (data && data.history && Array.isArray(data.history)) {
                historyArray = data.history;
            } else if (data && data.data && Array.isArray(data.data)) {
                historyArray = data.dta;
            } else if (data && typeof data === 'object') {
                if (data.meetings && Array.isArray(data.meetings)) {
                    historyArray = data.meetings;
                } else {
                    const values = Object.values(data);
                    if (values.length > 0 && Array.isArray(values[0])) {
                        historyArray = values[0];
                    } else {
                        console.warn("Unexpected data format:", data);
                        historyArray = [];
                    }
                }
            }
            
            setHistory(historyArray);
        } catch (err) {
            console.error("Error fetching history:", err);
            setError("Failed to load meeting history");
            setHistory([]); 
        } finally {
            setLoading(false);
        }
    };

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

    const formatDate = (dateString) => {
        if (!dateString) return "Date not available";
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return "Invalid date";
        }
    };

    //  Safety check - ensure history is array before rendering
    if (!Array.isArray(history)) {
        console.error("History is not an array:", history);
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <Typography color="error" gutterBottom>Error loading history</Typography>
                <Button variant="contained" onClick={() => navigate("/home")} sx={{ bgcolor: '#FF9839' }}>
                    Go Back Home
                </Button>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress sx={{ color: '#FF9839' }} />
            </Box>
        );
    }

    return (
        <>
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <IconButton onClick={() => navigate("/home")} sx={{ color: '#FF9839' }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <h2 style={{ color: '#FF9839' }}>Meeting History</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton onClick={handleMenuOpen}>
                            <Avatar sx={{ bgcolor: '#FF9839', width: 40, height: 40 }}>
                                {getAvatarCharacter()}
                            </Avatar>
                        </IconButton>
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333' }}>
                                {getDisplayName()}
                            </Typography>
                            {user?.email && (
                                <Typography variant="caption" sx={{ color: '#666' }}>
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

                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: '#f5f5f5' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon fontSize="small" sx={{ color: '#FF9839' }} />
                                {getDisplayName()}
                            </Typography>
                            {user?.email && (
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <EmailIcon fontSize="small" sx={{ color: '#FF9839' }} />
                                    {user.email}
                                </Typography>
                            )}
                        </Box>
                        <Divider />
                        <MenuItem onClick={() => { handleMenuClose(); navigate("/history"); }}>
                            <RestoreIcon sx={{ mr: 2, color: '#FF9839' }} /> History
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleLogout}>
                            <LogoutIcon sx={{ mr: 2, color: '#FF9839' }} /> Logout
                        </MenuItem>
                    </Menu>
                </div>
            </div>

            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h5" sx={{ color: '#FF9839', fontWeight: 'bold' }}>
                            Your Meeting History
                        </Typography>
                        <Chip 
                            label={`${history.length} meeting${history.length !== 1 ? 's' : ''}`} 
                            sx={{ bgcolor: '#FF9839', color: 'white' }}
                        />
                    </Box>
                    
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    {history.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <VideoCallIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                            <Typography variant="body1" color="textSecondary">
                                No meeting history found.
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                Start a video call to see your history here!
                            </Typography>
                            <Button 
                                variant="contained" 
                                sx={{ mt: 3, bgcolor: '#FF9839' }}
                                onClick={() => navigate("/home")}
                            >
                                Start a Meeting
                            </Button>
                        </Box>
                    ) : (
                        <List>
                            {history.map((item, index) => (
                                <ListItem 
                                    key={item._id || item.id || index}
                                    button
                                    onClick={() => navigate(`/${item.meeting_code || item.meetingCode || item.meeting_code}`)}
                                    sx={{
                                        borderBottom: '1px solid #eee',
                                        '&:hover': { 
                                            bgcolor: '#fff5eb',
                                            transform: 'translateX(5px)',
                                            transition: 'all 0.3s'
                                        },
                                        borderRadius: 1,
                                        mb: 1
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <VideoCallIcon sx={{ color: '#FF9839', fontSize: 20 }} />
                                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                    Meeting Code: {item.meeting_code || item.meetingCode || item.meeting_code}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                <AccessTimeIcon sx={{ fontSize: 14, color: '#999' }} />
                                                <Typography variant="caption" color="textSecondary">
                                                    Joined on: {formatDate(item.created_at || item.createdAt || item.createdAt)}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>
            </Container>
        </>
    );
}