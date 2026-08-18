# Render deployment

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository.
3. Render reads `render.yaml` and creates the backend Web Service and frontend Static Site.
4. After the backend URL is available, set the frontend environment variable `VITE_API_BASE` to that URL and redeploy the frontend.
