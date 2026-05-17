const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const backendEnvPath = path.join(backendDir, '.env');

function parseEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadBackendEnv() {
  if (!fs.existsSync(backendEnvPath)) {
    return {};
  }

  return fs.readFileSync(backendEnvPath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key) {
        return env;
      }

      env[key] = parseEnvValue(trimmed.slice(separatorIndex + 1));
      return env;
    }, {});
}

const backendEnv = loadBackendEnv();

const nodeApp = (name, script) => ({
  name,
  cwd: backendDir,
  script,
  env: backendEnv,
});

const pythonApp = (name, script, args = []) => ({
  name,
  cwd: backendDir,
  script,
  args,
  interpreter: 'python3',
  env: backendEnv,
});

module.exports = {
  apps: [
    nodeApp('coregist-gateway', 'gateway/app.js'),
    nodeApp('coregist-user', 'services/user-service/app.js'),
    nodeApp('coregist-news-service', 'services/news-service/app.js'),
    nodeApp('coregist-search-service', 'services/search-service/app.js'),
    pythonApp('coregist-scheduler', 'services/scheduler/app.py'),
    pythonApp('coregist-news-rss-worker', 'services/news_scraper/app.py', ['--worker-mode', 'rss']),
    pythonApp('coregist-news-keyword-worker', 'services/news_scraper/app.py', ['--worker-mode', 'keyword']),
    pythonApp('coregist-content-processing', 'services/content_processing/app.py'),
    pythonApp('coregist-ai-dispatcher', 'services/ai_dispatcher/app.py'),
    pythonApp('coregist-ai-analysis', 'services/ai_analysis/app.py'),
    pythonApp('coregist-notification', 'services/notification/app.py'),
    pythonApp('coregist-agent-config', 'services/agent_config/app.py'),
    pythonApp('coregist-skill-config', 'services/skill_config/app.py'),
  ],
};
