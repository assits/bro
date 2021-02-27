{
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts":{
    "build": "bro-build"
  },
  "config": {
    "commitizen": {
      "path": "./node_modules/cz-lerna-changelog"
    }
  },
  "devDependencies": {
    "@assits/bro-build": "^{{{ version }}}",
    "commitizen": "^4.2.2",
    "cz-lerna-changelog": "^2.0.3",
    "lerna": "^3.22.1"
  }
}
