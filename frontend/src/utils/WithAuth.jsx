import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom"
import { AuthContext } from "../context/AuthContext";

const WithAuth = (WrappedComponent ) => {
    const AuthComponent = (props) => {
        const router = useNavigate();
        const { isAuthenticated, loading } = useContext(AuthContext);

        useEffect(() => {
            if(!loading && !isAuthenticated) {
                router("/auth")
            }
        }, [isAuthenticated, loading, router])

        if (loading) {
            return null;
        }

        return <WrappedComponent {...props} />
    }

    return AuthComponent;
}

export default WithAuth;
