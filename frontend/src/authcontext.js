import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({
        id: null,
        role: null, // 'technician' or 'expert'
    });

    const login = (id, role) => {
        setUser({ id, role });
    };

    const logout = () => {
        setUser({ id: null, role: null });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};