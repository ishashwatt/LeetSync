# LeetSync

A lightweight Node.js background daemon that automatically synchronizes your accepted LeetCode submissions directly to a GitHub repository. 

No frontend interaction is required. Once configured, simply run the daemon on any server, and it will continuously poll your LeetCode profile for new solutions and commit them using the GitHub API.

## Features

- **Automated Synchronization**: Runs continuously in the background polling for updates.
- **Clean Structure**: Creates a dedicated folder for each problem (e.g. `0001-two-sum/`).
- **Full Problem Details**: Commits both your solution code (with the correct language extension) and a `README.md` containing the problem description and difficulty.
- **Stateless Operation**: Keeps track of synced submissions locally in a `.sync_state.json` file.
- **Frontend-Free**: A pure backend engine designed for deployment on lightweight servers or local environments.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **LeetCode Session Cookie**: You must extract your `LEETCODE_SESSION` cookie from a logged-in browser session.
- **GitHub Personal Access Token**: Requires a token with `repo` scopes to commit files to your repository.

## Configuration

Provide the following environment variables (either in a `.env` file or exported to your environment). 

```env
# Your LeetCode username
LEETCODE_USERNAME="your_leetcode_username"

# Your LeetCode session cookie (essential for fetching private code submissions)
LEETCODE_SESSION="your_leetcode_cookie_here"

# Your GitHub Access Token
GITHUB_TOKEN="ghp_your_personal_access_token"

# The GitHub account username that owns the repo
GITHUB_OWNER="your_github_username"

# The destination GitHub repository name (e.g. "leetcode-solutions")
GITHUB_REPO="your_leetcode_repository_name"

# Optional: How often the script should check LeetCode (in minutes, defaults to 5)
POLL_INTERVAL_MINUTES=5
```

## Installation

1. Clone or download this repository.
2. Install the dependencies:
   ```bash
   npm install
   ```

## Running the Daemon

### Development Mode

Run the app using the development script:
```bash
npm run dev
```

### Production Mode

Build the project and start the compiled backend:
```bash
npm run build
npm start
```

The daemon will log its initialization status, run an immediate sync check, and then sleep until the next poll interval.

### Deep Historical Sync

If you want to fetch all of your old submissions from months or years ago:
1. Ensure your app is running
2. Temporarily trigger the historical sync endpoint by visiting or curling `http://localhost:3000/api/sync-all` (or your deployed URL `https://your-app.railway.app/api/sync-all`)
3. The background daemon will start paginating through your entire history to secure old submissions.

## How it Works

1. Queries the LeetCode GraphQL API for your most recent accepted submissions.
2. Checks against the local `.sync_state.json` file to ignore submissions that have already been synced.
3. For new submissions, queries the GraphQL API again using your `LEETCODE_SESSION` cookie to retrieve your actual submitted code block and language details.
4. Uses the GitHub REST API to perform `PUT` requests, committing standard file structures directly to your target repository branch.

## Frequently Asked Questions

**Does the LeetCode session change every time?**  
No, the `LEETCODE_SESSION` cookie does *not* change every time you submit code. However, it is fundamentally a browser session cookie, which means it **will expire eventually** (usually every 14 to 30 days of inactivity).  
If LeetSync suddenly stops syncing or you start seeing `LEETCODE_SESSION` authorization errors in your server logs:
1. Log back into LeetCode on your browser.
2. Grab the new `LEETCODE_SESSION` cookie value.
3. Update your environment variables on Railway and restart the service.

*(Note: Explicitly clicking "Sign Out" on the LeetCode website will immediately invalidate your active cookie).*
