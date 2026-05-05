const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, (err) => {
    if (err) {
        return console.error('Failed to start server:', err);
    }
    console.log(`Server is listening on ${port}`);
});
