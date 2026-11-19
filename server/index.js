import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const profiles = JSON.parse(await fs.readFile(path.join(here, "profiles.json"), "utf8"));
const statePath = path.join(here, "state.json");
const app = express();
const port = Number(process.env.PORT) || 3001;
const publicProfiles = new Map(profiles.map(({ likesUser, ...profile }) => [profile.id, profile]));
let state;
let writes = Promise.resolve();

try {
  state = JSON.parse(await fs.readFile(statePath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  state = { swipes: {} };
}

app.use(express.json({ limit: "10kb" }));

app.get("/feed", (_request, response) => {
  const feed = profiles
    .filter((profile) => !state.swipes[profile.id])
    .map(({ likesUser, ...profile }) => profile);
  response.json({ profiles: feed });
});

app.post("/swipe", async (request, response, next) => {
  const { profileId, action } = request.body ?? {};
  if (typeof profileId !== "string" || !publicProfiles.has(profileId)) {
    return response.status(400).json({ error: "Choose a profile from the feed." });
  }
  if (action !== "like" && action !== "pass") {
    return response.status(400).json({ error: "Action must be like or pass." });
  }
  if (state.swipes[profileId]) {
    return response.status(409).json({ error: "This profile has already been swiped on." });
  }

  state.swipes[profileId] = action;
  try {
    await persistState();
  } catch (error) {
    delete state.swipes[profileId];
    return next(error);
  }

  const matched = action === "like" && profiles.find((profile) => profile.id === profileId).likesUser;
  response.json({
    matched: Boolean(matched),
    match: matched ? publicProfiles.get(profileId) : null
  });
});

app.get("/matches", (_request, response) => {
  const matches = profiles
    .filter((profile) => profile.likesUser && state.swipes[profile.id] === "like")
    .map(({ likesUser, ...profile }) => profile);
  response.json({ matches });
});

app.use((error, _request, response, _next) => {
  console.error("Request failed:", error);
  response.status(500).json({ error: "Something went wrong. Please try again." });
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(here, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_request, response) => response.sendFile(path.join(distPath, "index.html")));
}

app.listen(port, () => {
  console.log(`Coy Discover API listening on http://localhost:${port}`);
});

function persistState() {
  writes = writes.then(async () => {
    const temporaryPath = `${statePath}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(state, null, 2));
    await fs.rename(temporaryPath, statePath);
  });
  return writes;
}
