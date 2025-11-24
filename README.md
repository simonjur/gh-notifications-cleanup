# GitHub Notifications Cleaner

> [!WARNING]
> Developed for my personal use, but feel free to fork and use it at your own risk.

this script will help you clean up your GitHub notifications by marking
those on closed pull requests or issues as read.

## Status

[![Lint And Format Check](https://github.com/simonjur/gh-notifications-cleanup/actions/workflows/ci.yaml/badge.svg)](https://github.com/simonjur/gh-notifications-cleanup/actions/workflows/ci.yaml) [![CodeQL](https://github.com/simonjur/gh-notifications-cleanup/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/simonjur/gh-notifications-cleanup/actions/workflows/github-code-scanning/codeql) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=simonjur_gh-notifications-cleanup&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=simonjur_gh-notifications-cleanup)

## Packages

![Node.js](https://img.shields.io/badge/node-24-brightgreen) ![ESLint](https://img.shields.io/badge/ESLint-checked-blue) ![Prettier](https://img.shields.io/badge/Prettier-code--style-pink) ![Octokit](https://img.shields.io/badge/Octokit-GitHub--API-orange) ![Commander.js](https://img.shields.io/badge/Commander.js-CLI--tool-red) ![GitHub Copilot](https://img.shields.io/badge/GitHub-Copilot-blue)

## To list notifications that can be cleaned up, run:

```bash
npm run cleaner list
```

## To mark those notifications as read, run:

```bash
npm run cleaner clean
```
