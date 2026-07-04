import { createContext, useCallback, useContext, useState } from 'react';
import Cookies from 'js-cookie';
import { userService } from '../services/userService';

const AuthContext = createContext(null);

const COOKIE_OPTIONS = { expires: 7, sameSite: 'Lax' };

function readUserFromCookies() {
  const token = Cookies.get('token');
  if (!token) return null;
  return {
    token,
    id: Cookies.get('id'),
    name: Cookies.get('name'),
    role: Cookies.get('role'),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUserFromCookies);

  const login = useCallback(async (userName, password) => {
    const data = await userService.login(userName, password);
    Cookies.set('token', data.token, COOKIE_OPTIONS);
    Cookies.set('name', data.user_name, COOKIE_OPTIONS);
    Cookies.set('role', data.user_role, COOKIE_OPTIONS);
    Cookies.set('id', data.user_id, COOKIE_OPTIONS);
    setUser({
      token: data.token,
      id: data.user_id,
      name: data.user_name,
      role: data.user_role,
    });
  }, []);

  const register = useCallback(
    async (userName, password) => {
      await userService.register(userName, password);
      await login(userName, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    ['token', 'name', 'role', 'id'].forEach((key) => Cookies.remove(key));
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Provider + hook in one file is the idiomatic context pattern; the hook
// export is fine for fast refresh in practice
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
