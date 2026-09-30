# Update or remove TRUSS

With the [quick start](../getting-started.md) layout, TRUSS is a Git clone inside your project's `.truss/`, pinned to a release. Updating and removing it are Git operations.

## Check what you have

```bash
node .truss/bin/truss.mjs --version
```

That prints `truss 0.2.2` or later. A release older than 0.2.2 has no `--version`; run `git describe --tags` inside `.truss/` instead. The [changelog](../../../CHANGELOG.md) lists what each release changes, with upgrade notes.

## Update to a newer release, or go back to one

The quick start pins the clone to a release. To move to another one, fetch the tags and check out the one you want:

```bash
cd .truss
git fetch --tags
git checkout v0.2.7      # a detached HEAD, on purpose: nothing moves until you say so
cd ..
node .truss/bin/truss.mjs doctor
```

The [changelog](../../../CHANGELOG.md) and the [releases page](https://github.com/nicohe/truss/releases) list the releases. An older tag takes you back the same way.

## Follow `main` instead

What has been merged and not yet released is on `main`. The pinned clone only knows its release tag, so tell it about `main` first:

```bash
cd .truss
git remote set-branches --add origin main
git fetch --depth 1 origin main
git checkout main
cd ..
```

From then on `git pull` inside `.truss/` keeps it up to date. `truss --version` still prints the number of the last release, so say that you are on `main` when you report a problem. Go back to a release with the section above.

## Keep your files safe while you do it

Your `config.yaml`, `state.json`, `verification/` and `handoffs/` sit inside the clone, as files Git does not track. `git pull` and `git checkout` leave them alone. **`git clean -fd` deletes them, and `git stash -u` sets them aside**, so do not run either inside `.truss/`. Keep a copy of your configuration outside it (see [ADR 0001](../development/decisions/0001-local-project-configuration.md)).

## Remove TRUSS

1. **Delete the directory**: `rm -rf .truss`. That removes TRUSS, the project configuration, the local state, the verification evidence and the handoff notes. Copy out anything you want to keep first.
2. **Take `.truss/` out of `.gitignore`**, and the TRUSS lines out of your `AGENTS.md`.
3. **Keep `openspec/`.** It holds your specifications and belongs to OpenSpec, and nothing in it depends on TRUSS. To remove OpenSpec as well: `npm uninstall --global @fission-ai/openspec`.
4. **Forget the approvals** (optional): they live in `trusted.json` under `$TRUSS_HOME`, by default `~/.config/truss/`, outside the project. Deleting the file only means you would be asked again.

Your application does not depend on `.truss/`, so it keeps working without it (see [project structure](../reference/project-structure.md)).
