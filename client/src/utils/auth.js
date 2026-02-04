const TOKEN_KEY = 'trustchain_token'

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

export const getAuthHeaders = () => {
  const token = getAuthToken()
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

