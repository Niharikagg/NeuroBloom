import React from 'react';
import { createRoot } from 'react-dom/client';
import FocusRecovery from './FocusRecovery.jsx';

const container = document.getElementById('app');

if (container) {
  createRoot(container).render(<FocusRecovery />);
}
