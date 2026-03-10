import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { SyncProvider } from './features/sync/SyncContext'
import App from './App'
import './index.css'

import { version } from '../package.json';

import { ThemeProvider } from './hooks/ThemeContext';

console.log(`Light v${version} loaded`);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <SyncProvider>
                    <ThemeProvider>
                        <App />
                    </ThemeProvider>
                </SyncProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
