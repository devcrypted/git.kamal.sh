require('dotenv').config();

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'aworkaround';
const GITHUB_API = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

let repoCache = {};
let cachePopulated = false;

// Fetch repos and update cache
async function fetchRepos() {
    const headers = {
        'User-Agent': 'aworkaround-forwarder/1.0',  // Add User-Agent
    };

    // Add token if available
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(GITHUB_API, { headers });

    // Handle non-200 responses
    if (!response.ok) {
        console.error(`GitHub API Error: ${response.status} - ${response.statusText}`);
        const text = await response.text();  // Log the raw response
        console.error('Response:', text);
        throw new Error('Failed to fetch repos.');
    }

    const repos = await response.json();

    // Cache the repos
    repoCache = repos.reduce((acc, repo) => {
        acc[repo.name.toLowerCase()] = repo.html_url;
        return acc;
    }, {});
    cachePopulated = true;
}

// Handle incoming requests and redirect
export default {
    async fetch(request) {
        if (!cachePopulated) {
            try {
                await fetchRepos();
            } catch (err) {
                return new Response('Error fetching repos.', { status: 500 });
            }
        }

        const url = new URL(request.url);
        const repoName = url.pathname.substring(1).toLowerCase();
        if (repoName == "") {
            return new Response('200 OK', { status: 200 });
        }
        const targetUrl = repoCache[repoName];

        if (targetUrl) {
            return Response.redirect(targetUrl, 301);
        } else {
            return new Response('Repo not found.', { status: 404 });
        }
    }
}

// Scheduled event to refresh the cache
export const scheduled = {
    async fetch() {
        try {
            await fetchRepos();
        } catch (err) {
            console.error('Scheduled fetch failed:', err);
        }
    }
};
