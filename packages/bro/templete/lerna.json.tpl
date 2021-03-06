{
  "version": "independent",
  "npmClient": "yarn",
  "useWorkspaces": true,
  "changelog": {
    "labels": {
      "pr(enhancement)": ":rocket: Enhancement",
      "pr(bug)": ":bug: Bug Fix",
      "pr(documentation)": ":book: Documentation",
      "pr(dependency)": ":deciduous_tree: Dependency",
      "pr(chore)": ":turtle: Chore"
    },
    "cacheDir": ".changelog"
  },
  "command": {
    "version": {
      "exact": true
    },
    "publish": {
      "conventionalCommits": true
    }
  },
  "ignoreChanges": ["**/*.md", "**/*.test.ts", "**/*.e2e.ts", "**/test/**"]
}
