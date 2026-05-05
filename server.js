const app = require('./app');
const newsService = require('./services/news');

const port = process.env.PORT || 3000;
const refreshIntervalMs = Number(process.env.NEWS_REFRESH_INTERVAL_MS) || 5 * 60 * 1000;

app.listen(port, (err) => {
    if (err) {
        return console.error('Failed to start server:', err);
    }
    console.log(`Server is listening on ${port}`);
    newsService.startPeriodicRefresh(refreshIntervalMs);
    console.log(`[refresh] periodic cache refresh every ${refreshIntervalMs}ms`);
});
