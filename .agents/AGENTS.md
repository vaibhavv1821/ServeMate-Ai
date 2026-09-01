# Workspace Rules for ServMate

## Automatic Version Control Rule
- **Push on Every Step**: After completing any implementation step, bug fix, feature addition, or documentation update, automatically commit the changes locally with a conventional commit message and push to GitHub (`git push origin main`).
- **Secret Protection**: Ensure `.env` and sensitive credentials remain listed in `.gitignore` and are never committed to git.
