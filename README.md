# phonikud-paper

Submission for the Phonikud project.

# Develop

```console

export GITHUB_TOKEN="..."
export REPO="https://github.com/acousticfold/submission-889"

# Stage and commit as anonymous author
git add .
git -c user.name="Anonymous" -c user.email="anonymous@example.com" -c commit.gpgsign=false commit -m "Initial submission"

# Push using token in URL (credential helper bypassed)
git push "https://anonymoususer:${GITHUB_TOKEN}@github.com/acousticfold/submission-889.git" main
```
