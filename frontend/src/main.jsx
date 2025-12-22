import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ThemeProvider } from './context/contextThemeProvider'
import { store } from './store/store'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
   <StrictMode>
    <Provider store={store}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>
)
