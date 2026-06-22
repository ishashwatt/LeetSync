import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const STATE_FILE = path.join(process.cwd(), ".sync_state.json");

async function pushToGithub(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  try {
    const getReq = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "LeetCode-Sync-Backend",
      },
    });

    let sha = "";
    if (getReq.ok) {
      const d: any = await getReq.json();
      sha = d.sha;
    }

    const body: any = {
      message,
      content: Buffer.from(content).toString("base64"),
    };
    if (sha) body.sha = sha;

    const putReq = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "LeetCode-Sync-Backend",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!putReq.ok) {
      const err = await putReq.text();
      console.error(`GitHub API Error: ${err}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Failed to push ${filePath}:`, e);
    return false;
  }
}

async function runSyncTask() {
  const username = process.env.LEETCODE_USERNAME;
  const session = process.env.LEETCODE_SESSION;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghOwner = process.env.GITHUB_OWNER;
  const ghRepo = process.env.GITHUB_REPO;

  if (!username || !session || !ghToken || !ghOwner || !ghRepo) {
    console.log(
      "⚠️ Missing credentials. Set LEETCODE_USERNAME, LEETCODE_SESSION, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO to enable background sync.",
    );
    return;
  }

  try {
    console.log(
      `[${new Date().toISOString()}] Polling LeetCode for new submissions for ${username}...`,
    );
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: `LEETCODE_SESSION=${session}`,
      },
      body: JSON.stringify({
        query: `
          query recentAcSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
              id
              title
              titleSlug
              timestamp
            }
          }
        `,
        variables: { username, limit: 15 },
      }),
    });

    if (!response.ok) {
      console.error(
        `LeetCode API returned ${response.status}: ${await response.text()}`,
      );
      return;
    }

    const data: any = await response.json();
    const submissions = data?.data?.recentAcSubmissionList || [];

    if (submissions.length === 0) {
      console.log("No recent accepted submissions found.");
      return;
    }

    let syncedIds = new Set<string>();
    if (fs.existsSync(STATE_FILE)) {
      syncedIds = new Set(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
    }

    let hasUpdates = false;

    for (const sub of submissions.reverse()) {
      if (syncedIds.has(sub.id)) continue;

      console.log(
        `Found new accepted submission: ${sub.title} [ID: ${sub.id}]`,
      );

      const detailsRes = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Cookie: `LEETCODE_SESSION=${session}`,
        },
        body: JSON.stringify({
          query: `
            query submissionDetails($submissionId: Int!) {
              submissionDetails(submissionId: $submissionId) {
                code
                lang { name }
                question {
                  questionFrontendId
                  title
                  titleSlug
                  content
                  difficulty
                }
              }
            }
          `,
          variables: { submissionId: parseInt(sub.id, 10) },
        }),
      });

      const detData: any = await detailsRes.json();
      const details = detData?.data?.submissionDetails;

      if (!details || !details.code) {
        console.error(
          `Failed to fetch code for ${sub.title}. Your LEETCODE_SESSION cookie might be expired or invalid.`,
        );
        continue;
      }

      const qId = details.question.questionFrontendId.padStart(4, "0");
      const folderName = `${qId}-${details.question.titleSlug}`;

      const extMap: Record<string, string> = {
        cpp: "cpp",
        java: "java",
        python: "py",
        python3: "py",
        javascript: "js",
        typescript: "ts",
        csharp: "cs",
        c: "c",
        golang: "go",
        rust: "rs",
      };
      const ext = extMap[details.lang.name] || "txt";

      const codePath = `${folderName}/solution.${ext}`;
      const readmePath = `${folderName}/README.md`;

      console.log(`Pushing code to GitHub: ${codePath}...`);
      const successCode = await pushToGithub(
        ghToken,
        ghOwner,
        ghRepo,
        codePath,
        details.code,
        `Add solution for ${details.question.title} (${details.lang.name})`,
      );

      if (successCode) {
        console.log(`Pushing README to GitHub: ${readmePath}...`);
        await pushToGithub(
          ghToken,
          ghOwner,
          ghRepo,
          readmePath,
          `# ${details.question.title}\n\nDifficulty: ${details.question.difficulty}\n\n${details.question.content}`,
          `Docs: Add description for ${details.question.title}`,
        );
        syncedIds.add(sub.id);
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(Array.from(syncedIds), null, 2),
      );
      console.log("LeetCode sync state saved effectively.");
    }
  } catch (err) {
    console.error("Sync Engine runtime error:", err);
  }
}

async function runHistoricalSyncTask() {
  const username = process.env.LEETCODE_USERNAME;
  const session = process.env.LEETCODE_SESSION;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghOwner = process.env.GITHUB_OWNER;
  const ghRepo = process.env.GITHUB_REPO;

  if (!username || !session || !ghToken || !ghOwner || !ghRepo) {
    console.log("⚠️ Missing credentials for historical sync.");
    return;
  }

  let offset = 0;
  const limit = 20;
  let hasNext = true;

  console.log(
    `[Historical Sync] Starting deep background sync for all old submissions belonging to ${username}...`,
  );

  try {
    while (hasNext) {
      console.log(
        `[Historical Sync] Fetching submission history offset ${offset}...`,
      );
      const response = await fetch(
        `https://leetcode.com/api/submissions/?offset=${offset}&limit=${limit}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Cookie: `LEETCODE_SESSION=${session}`,
          },
        },
      );

      if (!response.ok) {
        console.error(
          `[Historical Sync] LeetCode API error ${response.status}: ${await response.text()}`,
        );
        break;
      }

      const data: any = await response.json();
      const submissions = data?.submissions_dump || [];
      hasNext = data?.has_next || false;

      // Filter only Accepted
      const accepted = submissions.filter(
        (s: any) => s.status_display === "Accepted",
      );

      let syncedIds = new Set<string>();
      if (fs.existsSync(STATE_FILE)) {
        syncedIds = new Set(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
      }

      for (const sub of accepted.reverse()) {
        const subIdStr = sub.id.toString();
        if (syncedIds.has(subIdStr)) continue;

        console.log(
          `[Historical Sync] Processing old submission: ${sub.title} [ID: ${sub.id}]`,
        );

        const detailsRes = await fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Cookie: `LEETCODE_SESSION=${session}`,
          },
          body: JSON.stringify({
            query: `
              query submissionDetails($submissionId: Int!) {
                submissionDetails(submissionId: $submissionId) {
                  code
                  lang { name }
                  question {
                    questionFrontendId
                    title
                    titleSlug
                    content
                    difficulty
                  }
                }
              }
            `,
            variables: { submissionId: sub.id },
          }),
        });

        const detData: any = await detailsRes.json();
        const details = detData?.data?.submissionDetails;

        if (!details || !details.code) {
          console.error(
            `[Historical Sync] Failed to fetch code for ${sub.title} (${sub.id}).`,
          );
          continue;
        }

        const qId = details.question.questionFrontendId.padStart(4, "0");
        const folderName = `${qId}-${details.question.titleSlug}`;

        const extMap: Record<string, string> = {
          cpp: "cpp",
          java: "java",
          python: "py",
          python3: "py",
          javascript: "js",
          typescript: "ts",
          csharp: "cs",
          c: "c",
          golang: "go",
          rust: "rs",
        };
        const ext = extMap[details.lang.name] || "txt";

        const codePath = `${folderName}/solution.${ext}`;
        const readmePath = `${folderName}/README.md`;

        console.log(`[Historical Sync] Pushing to GitHub: ${codePath}...`);
        const successCode = await pushToGithub(
          ghToken,
          ghOwner,
          ghRepo,
          codePath,
          details.code,
          `Add historical solution for ${details.question.title} (${details.lang.name})`,
        );

        if (successCode) {
          await pushToGithub(
            ghToken,
            ghOwner,
            ghRepo,
            readmePath,
            `# ${details.question.title}\n\nDifficulty: ${details.question.difficulty}\n\n${details.question.content}`,
            `Docs: Add historical description for ${details.question.title}`,
          );

          // Re-read file before writing to avoid overwriting state changes from parallel tasks
          let currentIds = new Set<string>();
          if (fs.existsSync(STATE_FILE)) {
            currentIds = new Set(
              JSON.parse(fs.readFileSync(STATE_FILE, "utf8")),
            );
          }
          currentIds.add(subIdStr);
          fs.writeFileSync(
            STATE_FILE,
            JSON.stringify(Array.from(currentIds), null, 2),
          );
        }

        // Sleep briefly to avoid LeetCode rate limits
        await new Promise((r) => setTimeout(r, 1500));
      }

      offset += limit;
      // Sleep slightly between pages
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log("[Historical Sync] Deep sync successfully completed.");
  } catch (err) {
    console.error("[Historical Sync] Engine runtime error:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "LeetCode background sync daemon is running",
    });
  });

  // Manual trigger endpoint for testing
  app.get("/api/trigger", async (req, res) => {
    console.log("Manual sync triggered via /api/trigger");
    await runSyncTask();
    res.json({
      status: "ok",
      message: "Sync task completed. Check your server logs for details.",
    });
  });

  // Manual trigger endpoint for historical sync
  app.get("/api/sync-all", (req, res) => {
    console.log("Historical sync triggered via /api/sync-all");
    // Run in background without blocking response
    runHistoricalSyncTask();
    res.json({
      status: "ok",
      message:
        "Historical sync task initiated in the background. Check your server logs for details.",
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Background daemon running on port ${PORT}`);

    runSyncTask();

    const intervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES || 5);
    setInterval(runSyncTask, intervalMinutes * 60 * 1000);
    console.log(
      `Continuous background polling enabled. Triggering checks every ${intervalMinutes} minutes.`,
    );
  });
}

startServer();
