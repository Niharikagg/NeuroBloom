import React from 'react';
import { createRoot } from 'react-dom/client';
import FocusRecovery from '../FocusRecovery.jsx';

function PreviewApp() {
  return (
    <FocusRecovery
      onLog={(session) => {
        console.log('Focus Recovery session', session);
      }}
    />
  );
}

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<PreviewApp />);
