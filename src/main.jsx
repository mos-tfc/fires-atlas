// Website entry point. The app itself (FiresAtlas.jsx) is the same file that runs in Gemini Canvas.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './FiresAtlas.jsx';

// Ask questions go to this site's own server route (functions/api/ask.js), which holds the Gemini key.
window.FIRES_ATLAS_ASK = '/api/ask';

createRoot(document.getElementById('root')).render(<App />);
