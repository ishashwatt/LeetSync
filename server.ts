import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";

const STATE_FILE = path.join(process.cwd(), ".sync_state.json");
const INDEX_FILE = path.join(process.cwd(), ".index_state.json");


const globalLogs: string[] = [];
function addLog(...args: any[]) {
  const msg = args
    .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
    .join(" ");
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  globalLogs.push(formatted);
  if (globalLogs.length > 500) globalLogs.shift();
}


const leetcodeAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const fakeCsrf = "1234567890abcdef1234567890abcdef";

async function pushToGithub(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
) {
  
  const cleanRepo = repo.includes("/") ? repo.split("/").pop()! : repo;
  const cleanOwner = owner.includes("/") ? owner.split("/").shift()! : owner;

  const apiUrl = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${filePath}`;
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
      let extraHelp = "";
      if (putReq.status === 404) {
        extraHelp =
          " → [CRITICAL ERROR]: GitHub returned 404 Not Found. This almost ALWAYS means your GITHUB_TOKEN does not have the 'repo' scope (Classic Token) or 'Contents: Read and Write' permissions (Fine-grained Token). Go to GitHub Developer Settings, delete your token, generate a new one with 'repo' checkbox checked, update the Railway variables, and redeploy.";
      } else if (putReq.status === 403) {
        extraHelp =
          " → [CRITICAL ERROR]: GitHub returned 403 Forbidden. Your token might be expired or lacks organization SSO approval.";
      }
      addLog(
        `❌ GitHub API Error pushing ${filePath}: [${putReq.status}] ${err}${extraHelp}`,
      );
      return false;
    }
    return true;
  } catch (e: any) {
    addLog(`❌ Failed to push ${filePath}: ${e.message}`);
    return false;
  }
}

async function fetchQuestionDetails(titleSlug: string) {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": leetcodeAgent,
      },
      body: JSON.stringify({
        query: `
          query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionFrontendId
              title
              content
              difficulty
              topicTags {
                name
                slug
              }
            }
          }
        `,
        variables: { titleSlug },
      }),
    });
    const data: any = await res.json();
    return data?.data?.question;
  } catch (e: any) {
    addLog(`❌ Error fetching question details for ${titleSlug}: ${e.message}`);
    return null;
  }
}

async function processSubmission(
  subId: string,
  titleSlug: string,
  code: string,
  langName: string,
) {
  const ghToken = process.env.GITHUB_TOKEN!;
  const ghOwner = process.env.GITHUB_OWNER!;
  const ghRepo = process.env.GITHUB_REPO!;

  addLog(`Fetching problem details for: ${titleSlug}`);
  const question = await fetchQuestionDetails(titleSlug);
  if (!question) {
    addLog(`⚠️ Skipping ${titleSlug} - could not fetch problem details.`);
    return false;
  }

  const qId = question.questionFrontendId.padStart(4, "0");
  const basePath = process.env.GITHUB_BASE_FOLDER || "LeetCode";
  const folderName = `${basePath}/${qId}-${titleSlug}`;


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
  const ext = extMap[langName] || "txt";

  const codePath = `${folderName}/solution.${ext}`;
  const readmePath = `${folderName}/README.md`;

  addLog(`Pushing code to GitHub repo '${ghRepo}' at '${codePath}'...`);
  const successCode = await pushToGithub(
    ghToken,
    ghOwner,
    ghRepo,
    codePath,
    code,
    `Add solution for ${question.title} (${langName})`,
  );

  if (successCode) {
    addLog(`Pushing README to GitHub: ${readmePath}...`);
    await pushToGithub(
      ghToken,
      ghOwner,
      ghRepo,
      readmePath,
      `# ${question.title}\n\nDifficulty: ${question.difficulty}\n\n${question.content}`,
      `Docs: Add description for ${question.title}`,
    );

    let indexState: any = {};
    if (fs.existsSync(INDEX_FILE)) {
      try {
        indexState = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
      } catch (e) {}
    }
    indexState[subId] = {
      id: subId,
      frontendId: qId,
      title: question.title,
      titleSlug: titleSlug,
      topics: question.topicTags?.map((t: any) => t.name) || [],
      difficulty: question.difficulty,
      folderName: folderName,
      langName: langName,
    };
    fs.writeFileSync(INDEX_FILE, JSON.stringify(indexState, null, 2));

    return true;
  }
  return false;
}

async function updateMasterReadme() {
  const ghToken = process.env.GITHUB_TOKEN?.trim();
  const ghOwner = process.env.GITHUB_OWNER?.trim();
  const ghRepo = process.env.GITHUB_REPO?.trim();

  if (!ghToken || !ghOwner || !ghRepo) return;
  if (!fs.existsSync(INDEX_FILE)) return;

  let indexState: any = {};
  try {
    indexState = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
  } catch (e) {
    return;
  }

  const uniqueQuestions: Record<string, any> = {};
  for (const key of Object.keys(indexState)) {
    const item = indexState[key];
    uniqueQuestions[item.frontendId] = item;
  }

  const dedupedMap: Record<string, any[]> = {};
  const dedupedNoTopic: any[] = [];

  for (const qId of Object.keys(uniqueQuestions)) {
    const item = uniqueQuestions[qId];
    if (!item.topics || item.topics.length === 0) {
      dedupedNoTopic.push(item);
    } else {
      for (const t of item.topics) {
        if (!dedupedMap[t]) dedupedMap[t] = [];
        dedupedMap[t].push(item);
      }
    }
  }

  let md = `# LeetCode Topics\n\n`;

  for (const topic of Object.keys(dedupedMap).sort()) {
    md += `## ${topic}\n`;
    dedupedMap[topic].sort(
      (a, b) => parseInt(a.frontendId, 10) - parseInt(b.frontendId, 10),
    );
    for (const item of dedupedMap[topic]) {
      // Adjust the link to be relative to where the README is located.
      // If README is at LeetCode/README.md, and code is at LeetCode/0001-two-sum/, relative path is just `0001-two-sum/`
      const localFolder = item.folderName.split("/").pop();
      md += `- [${item.frontendId} ${item.title}](./${localFolder})\n`;
    }
    md += `\n`;
  }

  if (dedupedNoTopic.length > 0) {
    md += `## Uncategorized\n`;
    dedupedNoTopic.sort(
      (a, b) => parseInt(a.frontendId, 10) - parseInt(b.frontendId, 10),
    );
    for (const item of dedupedNoTopic) {
      const localFolder = item.folderName.split("/").pop();
      md += `- [${item.frontendId} ${item.title}](./${localFolder})\n`;
    }
    md += `\n`;
  }

  const basePath = process.env.GITHUB_BASE_FOLDER || "LeetCode";
  let targetPath =
    basePath && basePath.trim() !== "" ? `${basePath}/README.md` : `README.md`;

  addLog("Pushing updated master README.md to GitHub...");
  await pushToGithub(
    ghToken,
    ghOwner,
    ghRepo,
    targetPath,
    md,
    `Docs: Update index of topics`,
  );
}

async function runSyncTask() {
  const username = process.env.LEETCODE_USERNAME?.trim();
  const session = process.env.LEETCODE_SESSION?.trim();
  const ghToken = process.env.GITHUB_TOKEN?.trim();
  const ghOwner = process.env.GITHUB_OWNER?.trim();
  const ghRepo = process.env.GITHUB_REPO?.trim();

  if (!username || !session || !ghToken || !ghOwner || !ghRepo) {
    addLog(
      "⚠️ Missing credentials. Check LEETCODE_USERNAME, LEETCODE_SESSION, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.",
    );
    return;
  }

  addLog(
    `[Recent Sync] Polling LeetCode for new submissions for ${username}...`,
  );
  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": leetcodeAgent,
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
      addLog(
        `❌ LeetCode Recent API returned ${response.status}: ${await response.text()}`,
      );
      return;
    }

    const data: any = await response.json();
    const submissions = data?.data?.recentAcSubmissionList || [];

    if (submissions.length === 0) {
      addLog("No recent accepted submissions found on LeetCode.");
      return;
    }

    let syncedIds = new Set<string>();
    if (fs.existsSync(STATE_FILE)) {
      try {
        syncedIds = new Set(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
      } catch (e) {}
    }

    let hasUpdates = false;

    for (const sub of submissions.reverse()) {
      if (syncedIds.has(sub.id)) continue;

      addLog(`Found new accepted submission: ${sub.title} [ID: ${sub.id}]`);

      
      const detailsRes = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": leetcodeAgent,
          Cookie: `LEETCODE_SESSION=${session}; csrftoken=${fakeCsrf}`,
          "x-csrftoken": fakeCsrf,
        },
        body: JSON.stringify({
          query: `
            query submissionDetails($submissionId: Int!) {
              submissionDetails(submissionId: $submissionId) {
                code
                lang { name }
              }
            }
          `,
          variables: { submissionId: parseInt(sub.id, 10) },
        }),
      });

      const detData: any = await detailsRes.json();
      const details = detData?.data?.submissionDetails;

      if (!details || !details.code) {
        addLog(
          `❌ Failed to fetch code for ${sub.title}. Your LEETCODE_SESSION cookie might be expired or invalid. (GraphQL Errors: ${JSON.stringify(detData.errors || "None")})`,
        );
        continue;
      }

      const success = await processSubmission(
        sub.id,
        sub.titleSlug,
        details.code,
        details.lang.name,
      );

      if (success) {
        syncedIds.add(sub.id);
        hasUpdates = true;
        fs.writeFileSync(
          STATE_FILE,
          JSON.stringify(Array.from(syncedIds), null, 2),
        );
        addLog(`✅ Successfully synced ${sub.title}`);
      }
    }

    if (hasUpdates) {
      addLog("🚀 Recent Sync cycle complete.");
      await updateMasterReadme();
    } else {
      addLog("👍 No new un-synced submissions to push.");
    }
  } catch (err: any) {
    addLog("❌ Sync Engine runtime error:", err.message);
  }
}

async function runHistoricalSyncTask() {
  const username = process.env.LEETCODE_USERNAME?.trim();
  const session = process.env.LEETCODE_SESSION?.trim();
  const ghToken = process.env.GITHUB_TOKEN?.trim();
  const ghOwner = process.env.GITHUB_OWNER?.trim();
  const ghRepo = process.env.GITHUB_REPO?.trim();

  if (!username || !session || !ghToken || !ghOwner || !ghRepo) {
    addLog("⚠️ Missing credentials for historical sync.");
    return;
  }

  let offset = 0;
  const limit = 20;
  let hasNext = true;

  addLog(
    `[Historical Sync] Starting deep background sync for ALL old submissions...`,
  );

  try {
    while (hasNext) {
      addLog(`[Historical Sync] Fetching page offset ${offset}...`);

      const response = await fetch(
        `https://leetcode.com/api/submissions/?offset=${offset}&limit=${limit}`,
        {
          headers: {
            "User-Agent": leetcodeAgent,
            Cookie: `LEETCODE_SESSION=${session}; csrftoken=${fakeCsrf}`,
            "x-csrftoken": fakeCsrf,
          },
        },
      );

      if (!response.ok) {
        addLog(
          `❌ [Historical Sync] LeetCode API error ${response.status}: ${await response.text()}`,
        );
        break;
      }

      const data: any = await response.json();
      const submissions = data?.submissions_dump || [];
      hasNext = data?.has_next || false;

      const accepted = submissions.filter(
        (s: any) => s.status_display === "Accepted",
      );

      let syncedIds = new Set<string>();
      if (fs.existsSync(STATE_FILE)) {
        try {
          syncedIds = new Set(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
        } catch (e) {}
      }

      for (const sub of accepted.reverse()) {
        const subIdStr = sub.id.toString();
        if (syncedIds.has(subIdStr)) continue;

        addLog(
          `[Historical Sync] Processing old submission: ${sub.title} [ID: ${sub.id}]`,
        );

        let code = sub.code;
        let lang = sub.lang;

        
        if (!code) {
          addLog(
            `Code missing from dump for ${sub.title}, fetching via GraphQL...`,
          );
          const detailsRes = await fetch("https://leetcode.com/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": leetcodeAgent,
              Cookie: `LEETCODE_SESSION=${session}; csrftoken=${fakeCsrf}`,
              "x-csrftoken": fakeCsrf,
            },
            body: JSON.stringify({
              query: `
                query submissionDetails($submissionId: Int!) {
                  submissionDetails(submissionId: $submissionId) { code lang { name } }
                }
              `,
              variables: { submissionId: sub.id },
            }),
          });
          const detData: any = await detailsRes.json();
          const details = detData?.data?.submissionDetails;
          if (!details || !details.code) {
            addLog(
              `❌ [Historical Sync] Could not fetch code for ${sub.title}`,
            );
            continue;
          }
          code = details.code;
          lang = details.lang.name;
        }

        const success = await processSubmission(
          subIdStr,
          sub.title_slug,
          code,
          lang,
        );

        if (success) {
          let currentIds = new Set<string>();
          if (fs.existsSync(STATE_FILE)) {
            try {
              currentIds = new Set(
                JSON.parse(fs.readFileSync(STATE_FILE, "utf8")),
              );
            } catch (e) {}
          }
          currentIds.add(subIdStr);
          fs.writeFileSync(
            STATE_FILE,
            JSON.stringify(Array.from(currentIds), null, 2),
          );
          addLog(`✅ [Historical Sync] Successfully pushed ${sub.title}`);
        }

        
        await new Promise((r) => setTimeout(r, 1500));
      }

      offset += limit;
      await new Promise((r) => setTimeout(r, 2000));
    }

    addLog(
      "🎉 [Historical Sync] Deep sync fully completed! All old codes are pushed.",
    );
    await updateMasterReadme();
  } catch (err: any) {
    addLog("❌ [Historical Sync] Engine runtime error:", err.message);
  }
}

async function runMigrationTask() {
  const ghToken = process.env.GITHUB_TOKEN?.trim();
  const ghOwnerRaw = process.env.GITHUB_OWNER?.trim();
  const ghRepoRaw = process.env.GITHUB_REPO?.trim();

  if (!ghToken || !ghOwnerRaw || !ghRepoRaw) {
    addLog("⚠️ Missing credentials for migration.");
    return;
  }

  const cleanRepo = ghRepoRaw.split("/").pop()!;
  let cleanOwner = ghOwnerRaw;
  if (cleanOwner.includes("github.com/")) {
    cleanOwner = cleanOwner.split("github.com/")[1].split("/")[0];
  }

  const basePath = process.env.GITHUB_BASE_FOLDER || "LeetCode";

  addLog(
    `[Migration] Starting root folder scan for ${cleanOwner}/${cleanRepo}...`,
  );

  try {
    const rootRes = await fetch(
      `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/`,
      {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          "User-Agent": "LeetCode-Sync-Backend",
        },
      },
    );

    if (!rootRes.ok) {
      addLog(
        `❌ [Migration] Failed to list root repository contents: ${await rootRes.text()}`,
      );
      return;
    }

    const rootFiles = await rootRes.json();
    
    const foldersToMove = rootFiles.filter(
      (f: any) => f.type === "dir" && /^\\d{4}-/.test(f.name),
    );

    if (foldersToMove.length === 0) {
      addLog(
        `[Migration] No LeetCode folders found in the repo's root directory. Nothing to move!`,
      );
      return;
    }

    for (const folder of foldersToMove) {
      addLog(
        `[Migration] Moving folder: ${folder.name} -> ${basePath}/${folder.name}`,
      );

      const folderRes = await fetch(
        `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${folder.name}`,
        {
          headers: {
            Authorization: `Bearer ${ghToken}`,
            "User-Agent": "LeetCode-Sync-Backend",
          },
        },
      );
      const files = await folderRes.json();

      for (const file of files) {
        if (file.type === "file") {
          const fileDataRes = await fetch(file.url, {
            headers: {
              Authorization: `Bearer ${ghToken}`,
              "User-Agent": "LeetCode-Sync-Backend",
            },
          });
          const fileData = await fileDataRes.json();

          const decodedText = Buffer.from(fileData.content, "base64").toString(
            "utf8",
          );

          const newPath = `${basePath}/${folder.name}/${file.name}`;
          const success = await pushToGithub(
            ghToken,
            cleanOwner,
            cleanRepo,
            newPath,
            decodedText,
            `Move ${file.name} to ${basePath}`,
          );

          if (success) {
            await fetch(
              `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${file.path}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${ghToken}`,
                  "User-Agent": "LeetCode-Sync-Backend",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: `Cleanup old ${file.path}`,
                  sha: file.sha,
                }),
              },
            );
            addLog(`✅ [Migration] Moved ${file.name} successfully.`);
          }

          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    addLog(`🎉 [Migration] Finished moving folders to ${basePath}/`);
    await updateMasterReadme();
  } catch (e: any) {
    addLog(`❌ [Migration] Error: ${e.message}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  
  app.get("/logs", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (globalLogs.length === 0) {
      res.send("No logs available yet. The daemon just booted or hasn't run.");
    } else {
      res.send(globalLogs.join("\n"));
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Daemon is running" });
  });

  app.get("/api/trigger", (req, res) => {
    addLog("--- Manual Recent Sync Triggered ---");
    runSyncTask();
    res.json({
      status: "ok",
      message: "Recent Sync triggered. Check the /logs endpoint to see output.",
    });
  });

  app.get("/api/sync-all", (req, res) => {
    addLog("--- Manual Historical Sync Triggered ---");
    runHistoricalSyncTask();
    res.json({
      status: "ok",
      message:
        "Historical Sync started. This will take a while. Check the /logs endpoint.",
    });
  });

  app.get("/api/migrate", (req, res) => {
    addLog("--- Manual Migration Triggered ---");
    runMigrationTask();
    res.json({
      status: "ok",
      message:
        "Migration started to move root folders. Check the /logs endpoint.",
    });
  });

  
  app.get("*", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <body style="font-family: monospace; background: #000; color: #0f0; padding: 2rem;">
        <h1>LeetSync Backend Engine Active</h1>
        <p>This is a headless daemon. There is no frontend UI here.</p>
        <hr style="border-color: #333;" />
        <ul>
          <li><a href='/logs' style="color: #0f0;">View Engine Logs (/logs)</a> &larr; USE THIS TO DEBUG ANY ISSUES</li>
          <li><a href='/api/trigger' style="color: #0f0;">Trigger Recent Sync (/api/trigger)</a></li>
          <li><a href='/api/sync-all' style="color: #0f0;">Trigger Historical Deep Sync (/api/sync-all)</a></li>
          <li><a href='/api/migrate' style="color: #0f0;">Migrate Root Folders to LeetCode/ (/api/migrate)</a> &larr; RUN THIS ONCE TO CLEAN UP</li>
        </ul>
      </body>
    `);
  });

  app.listen(PORT, "0.0.0.0", () => {
    addLog(`== Background daemon running on port ${PORT} ==`);
    addLog("Starting initial startup sync check...");
    runSyncTask();

    const intervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES || 5);
    setInterval(runSyncTask, intervalMinutes * 60 * 1000);
    addLog(
      `Continuous recent polling enabled every ${intervalMinutes} minutes.`,
    );
  });
}

startServer();
