import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Use a global variable to store the root to prevent double creation
const globalAny: any = globalThis;
if (!globalAny.__root) {
  globalAny.__root = ReactDOM.createRoot(rootElement);
}
const root = globalAny.__root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
