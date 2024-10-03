## Here are some dev notes:

#### Measure project lines of code  with cloc:
```bash
ls | grep -v 'package-lock.json|node_modules' | xargs cloc
```

#### Add Conventional Commits hook to Git:
Repo follows [Conventional Commits](https://www.conventionalcommits.org).
Below is how to properly initialize pre-commit hooks after cloning repo:
1. Install commitizen and pre-commit, i.e. using pipx:
   ```bash
   pipx install commitizen pre-commit
   ```
2. Initialize commitizen to install hooks into git:
   ```bash
   cz init
   ```
   Or (alternatively):
   ```bash
   pre-commit install --install-hooks
   ```

