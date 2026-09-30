# Update or remove TRUSS

With the [quick start](../getting-started.md) layout, TRUSS is a Git clone inside your project's `.truss/`. Updating and removing it are Git operations.

## Check what you have

```bash
node .truss/bin/truss.mjs --version
```

That prints `truss 0.2.2` or later. A release older than 0.2.2 has no `--version`; run `git describe --tags` inside `.truss/` instead. The [changelog](../../../CHANGELOG.md) lists what each release changes, with upgrade notes.

## Update to the latest release

```bash
cd .truss
git pull
cd ..
node .truss/bin/truss.mjs doctor
```

## Pin a release, or go back to one

```bash
cd .truss
git fetch --tags
git checkout v0.2.3      # a detached HEAD, on purpose: nothing moves until you say so
cd ..
```

To follow the latest release again, run `git checkout main && git pull` inside `.truss/`.

## Keep your files safe while you do it

Your `config.yaml`, `state.json`, `verification/` and `handoffs/` sit inside the clone, as files Git does not track. `git pull` and `git checkout` leave them alone. **`git clean -fd` deletes them, and `git stash -u` sets them aside**, so do not run either inside `.truss/`. Keep a copy of your configuration outside it (see [ADR 0001](../development/decisions/0001-local-project-configuration.md)).

## Remove TRUSS

1. **Delete the directory**: `rm -rf .truss`. That removes TRUSS, the project configuration, the local state, the verification evidence and the handoff notes. Copy out anything you want to keep first.
2. **Take `.truss/` out of `.gitignore`**, and the TRUSS lines out of your `AGENTS.md`.
3. **Keep `openspec/`.** It holds your specifications and belongs to OpenSpec, and nothing in it depends on TRUSS. To remove OpenSpec as well: `npm uninstall --global @fission-ai/openspec`.
4. **Forget the approvals** (optional): they live in `trusted.json` under `$TRUSS_HOME`, by default `~/.config/truss/`, outside the project. Deleting the file only means you would be asked again.

Your application does not depend on `.truss/`, so it keeps working without it (see [project structure](../reference/project-structure.md)).
