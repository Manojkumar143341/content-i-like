const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const apiKey = 'MY_YOUTUBE_API'; 

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})

app.get('/analyze', async (req, res) => {
    const videoId = req.query.videoId;
    
    if (!videoId) {
        return res.status(400).json({ error: 'Video ID is required' });
    }

    try {

        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
        const videoResponse = await fetch(videoUrl);
        const videoData = await videoResponse.json();
        const video = videoData.items[0];

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&key=${apiKey}`;
        const commentsResponse = await fetch(commentsUrl);
        const commentsData = await commentsResponse.json();

        const comments = commentsData.items.map(item => item.snippet.topLevelComment.snippet.textDisplay);

        const sentiment = require('sentiment');
        const sentimentAnalyzer = new sentiment();
        let positive = 0, negative = 0, neutral = 0;

        comments.forEach(comment => {
            const result = sentimentAnalyzer.analyze(comment);
            if (result.score > 0) positive++;
            else if (result.score < 0) negative++;
            else neutral++;
        });

        res.json({
            videoDetails: {
                title: video.snippet.title,
                category: video.snippet.categoryId,
                views: video.statistics.viewCount,
                likes: video.statistics.likeCount
            },
            sentimentResults: {
                positive,
                negative,
                neutral
            }
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
