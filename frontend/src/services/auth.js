import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser'

class AuthService {
  constructor() {
    this.msalConfig = {
      auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin + '/auth/callback'
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false
      }
    }

    this.msalInstance = new PublicClientApplication(this.msalConfig)
    this.loginRequest = {
      scopes: ['User.Read', 'openid', 'profile', 'email']
    }
  }

  async initialize() {
    await this.msalInstance.initialize()
    const response = await this.msalInstance.handleRedirectPromise()
    if (response) return this.handleResponse(response)

    const accounts = this.msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      this.msalInstance.setActiveAccount(accounts[0])
      return accounts[0]
    }
    return null
  }

  async login() {
    return this.msalInstance.loginRedirect(this.loginRequest)
  }

  async getToken() {
    const account = this.msalInstance.getActiveAccount()
    if (!account) throw new Error('No active account')
    try {
      const response = await this.msalInstance.acquireTokenSilent({ ...this.loginRequest, account })
      return response.accessToken
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        return this.msalInstance.acquireTokenRedirect(this.loginRequest)
      }
      throw error
    }
  }

  handleResponse(response) {
    this.msalInstance.setActiveAccount(response.account)
    return response.account
  }

  logout() {
    return this.msalInstance.logoutRedirect()
  }

  getUser() {
    return this.msalInstance.getActiveAccount()
  }
}

export default new AuthService()


