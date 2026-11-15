# Git Branch Workflow

Use one branch per feature or fix. Commit and push your work on that branch, then merge it into `main` through a Pull Request (PR). Avoid committing directly to `main`.

## Start a new feature

Before switching branches, check whether you have uncommitted changes:

```powershell
git status --short --branch
```

If the current uncommitted changes belong to your next feature, create a branch from the current state so the changes stay with that work:

```powershell
git switch -c feature/your-feature-name
```

For future features, start from the latest `main`:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/your-feature-name
```

Use short, descriptive names, such as `feature/school-registration` or `fix/payment-validation`.

## Commit and push your feature branch

After making and checking your changes:

```powershell
git status
git add .
git commit -m "Add school registration"
git push -u origin feature/school-registration
```

The `-u` option sets the upstream for the first push. For later commits on the same branch, use:

```powershell
git push
```

## Merge the feature into `main`

On GitHub, open a PR from your feature branch into `main`. Review and merge it there. Then update your local `main`:

```powershell
git switch main
git pull --ff-only origin main
```

After the feature is merged, you can delete its branch and create a fresh branch for the next feature.

## Push vs. pull

- **Push** sends your local branch and commits to GitHub.
- **Pull** downloads and integrates changes from GitHub into your current local branch.
- A **Pull Request** is the usual, safer way to bring feature work into `main`.
