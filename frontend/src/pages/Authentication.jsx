import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../context/AuthContext';
import { Snackbar } from '@mui/material';

const defaultTheme = createTheme();

export default function Authentication() {

    //  States
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [otp, setOtp] = React.useState("");

    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");

    const [formState, setFormState] = React.useState(0); // 0 = login, 1 = signup
    const [otpSent, setOtpSent] = React.useState(false);

    const [open, setOpen] = React.useState(false);

    const { handleLogin } = React.useContext(AuthContext);

    const handleAuth = async () => {
        try {
            setError("");

            if (formState === 0) {
                await handleLogin(email, password);
            }

            if (formState === 1) {

                // Step 1: Send OTP
                if (!otpSent) {
                    const res = await fetch("http://localhost:8000/api/auth/send-otp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email })
                    });

                    const data = await res.json();

                    if (!res.ok) throw new Error(data.message);

                    setOtpSent(true);
                    setMessage("OTP sent to your email");
                    setOpen(true);
                }

                else {
                    const res = await fetch("http://localhost:8000/api/auth/verify-otp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            email,
                            username,
                            password,
                            otp
                        })
                    });

                    const data = await res.json();

                    if (!res.ok) throw new Error(data.message);

                    setMessage("Signup successful");
                    setOpen(true);

                    setFormState(0);
                    setOtpSent(false);
                    setEmail("");
                    setOtp("");
                    setUsername("");
                    setPassword("");
                }
            }

        } catch (err) {
            setError(err.message || "Something went wrong");
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main" sx={{ height: '100vh' }}>
                <CssBaseline />

                {/* Left Image */}
                <Grid
                    item
                    xs={false}
                    sm={4}
                    md={7}
                    sx={{
                        backgroundImage: 'url(https://source.unsplash.com/random?wallpapers)',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />

                {/* Right Form */}
                <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
                    <Box
                        sx={{
                            my: 8,
                            mx: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                            <LockOutlinedIcon />
                        </Avatar>

                        <Typography component="h1" variant="h5">
                            {formState === 0 ? "Sign In" : "Sign Up"}
                        </Typography>

                        {/* Toggle Buttons */}
                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant={formState === 0 ? "contained" : "outlined"}
                                onClick={() => {
                                    setFormState(0);
                                    setOtpSent(false);
                                }}
                            >
                                Sign In
                            </Button>

                            <Button
                                sx={{ ml: 2 }}
                                variant={formState === 1 ? "contained" : "outlined"}
                                onClick={() => {
                                    setFormState(1);
                                    setOtpSent(false);
                                }}
                            >
                                Sign Up
                            </Button>
                        </Box>

                        {/* Form */}
                        <Box component="form" noValidate sx={{ mt: 2 }}>

                            {/* LOGIN FORM */}
                            {formState === 0 && (
                                <>
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        label="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />

                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </>
                            )}

                            {/* SIGNUP STEP 1: EMAIL */}
                            {formState === 1 && !otpSent && (
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    label="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            )}

                            {/* SIGNUP STEP 2: OTP + DETAILS */}
                            {formState === 1 && otpSent && (
                                <>
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        label="OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />

                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        label="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />

                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </>
                            )}

                            {/* Error */}
                            <Typography color="error" variant="body2">
                                {error}
                            </Typography>

                            {/* Submit Button */}
                            <Button
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                onClick={handleAuth}
                            >
                                {formState === 0
                                    ? "Login"
                                    : otpSent
                                        ? "Verify OTP & Register"
                                        : "Send OTP"}
                            </Button>
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            {/* Snackbar */}
            <Snackbar
                open={open}
                autoHideDuration={4000}
                message={message}
                onClose={() => setOpen(false)}
            />
        </ThemeProvider>
    );
}
