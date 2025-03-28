const express = require('express');
const path = require('path');
const app = express();
const port = 8000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(port, () => {
    console.log(`FPS Game running at http://localhost:${port}`);
    console.log('Controls:');
    console.log('- WASD: Movement');
    console.log('- Mouse: Look around');
    console.log('- Left Click: Shoot');
});