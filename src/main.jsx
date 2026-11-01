import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DeliveryNotificationProvider } from './context/DeliveryNotificationContext.jsx'
import { CatalogueProvider } from './context/CatalogueContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider remembers who is logged in and shares it with every page */}
      <AuthProvider>
        <DeliveryNotificationProvider>
          <CatalogueProvider>
            {/* CartProvider needs the logged-in user and current database catalogue. */}
            <CartProvider>
              <App />
            </CartProvider>
          </CatalogueProvider>
        </DeliveryNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
