import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Console easter egg
console.log(
  `%c
   ██╗  ██╗███████╗██████╗  ██████╗ 
   ╚██╗██╔╝██╔════╝██╔══██╗██╔═══██╗
    ╚███╔╝ █████╗  ██████╔╝██║   ██║
    ██╔██╗ ██╔══╝  ██╔══██╗██║   ██║
   ██╔╝ ██╗███████╗██║  ██║╚██████╔╝
   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ 
   
   Hey there, fellow developer! 🐙
   Thanks for checking out my portfolio.
   Built with React + Vite + Framer Motion
   
   GitHub: github.com/lxrdxe7o
  `,
  'color: #58a6ff; font-family: monospace;'
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
