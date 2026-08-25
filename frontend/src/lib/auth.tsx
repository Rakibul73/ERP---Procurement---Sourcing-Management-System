import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('erp_token')
    const savedUser = localStorage.getItem('erp_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const result = await window.go.main.App.Login({ username, password })
      setToken(result.token)
      setUser(result.user)
      localStorage.setItem('erp_token', result.token)
      localStorage.setItem('erp_user', JSON.stringify(result.user))
    } catch (err: unknown) {
      const error = err as { Message?: string }
      throw new Error(error.Message || 'Login failed')
    }
  }

  const register = async (username: string, email: string, password: string, fullName: string) => {
    try {
      await window.go.main.App.Register({ username, email, password, fullName })
      const result = await window.go.main.App.Login({ username, password })
      setToken(result.token)
      setUser(result.user)
      localStorage.setItem('erp_token', result.token)
      localStorage.setItem('erp_user', JSON.stringify(result.user))
    } catch (err: unknown) {
      const error = err as { Message?: string }
      throw new Error(error.Message || 'Registration failed')
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
