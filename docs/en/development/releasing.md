# Releasing

A release is a pull request that raises the version, followed by a tag and a GitHub release. Nothing is automated: this page is the checklist.

## Before the pull request

1. Start from an up-to-date `main`, on a branch such as `release/vX.Y.Z`.
2. Raise the version without tagging:

   ```bash
   npm version X.Y.Z --no-git-tag-version --ignore-scripts
   ```

   This updates `package.json` and `package-lock.json`.
3. In `CHANGELOG.md`, turn the entries under `[Unreleased]` into a `[X.Y.Z] - date` section: a one-paragraph summary, **Upgrade notes** (say so when there are none), then what was added, changed and fixed.
4. Update the places that spell out the version. `npm run check:docs` fails until they match `package.json`:
   - the pinned clone (`--branch vX.Y.Z`) in the README, in [Getting started](../getting-started.md) and in [Use TRUSS in CI](../guides/ci.md), and the `git checkout vX.Y.Z` in [Update or remove TRUSS](../guides/update-and-remove.md);
   - the example output of `--version` in the [CLI reference](../reference/cli.md);
   - the placeholder in `.github/ISSUE_TEMPLATE/bug_report.yml`;
   - the same lines in the Spanish pages under `docs/es/`.
5. Run `npm run ci` and open the pull request. It needs the required matrix jobs green, like any other.

## After the merge

Update `main`. Extract the changelog section as the release notes first and check that the file is not empty, so a release is never published without them:

```bash
awk -v v="X.Y.Z" '$0 ~ "^## \\[" v "\\]" {f=1; next} /^## \[/ {f=0} f && (NF || p) {p=1; print}' CHANGELOG.md > release-notes.md
test -s release-notes.md && wc -l release-notes.md
```

Then tag and publish:

```bash
git tag -a vX.Y.Z -m "TRUSS vX.Y.Z" <merge-commit>
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --latest --title "TRUSS vX.Y.Z" --notes-file release-notes.md
```

That `awk` runs the same on macOS and Linux; a `sed` one-liner that works on one fails on the other. Delete `release-notes.md` afterwards, it is not part of the repository.

Tags are annotated. The guides pin a tag, so a tag is never moved or deleted once published: a mistake is fixed by the next release.

## What the checks cover

`check:docs` compares the version in those places with `package.json` (see [Continuous integration](ci.md#documentation-check)). It cannot tell whether the changelog is complete, or whether the release contract pages ([v0.2](../reference/release-v0.2.md)) still describe what ships: read them before you tag.
