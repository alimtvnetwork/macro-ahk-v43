---
name: release assets publish contract
description: A GitHub Release is valid only when release.yml uploads built ZIP assets, installers, checksums, and notes; source-code archives/tags alone are invalid.
type: constraint
---
## Rule

A `v*` tag or GitHub's auto-generated **Source code (zip/tar.gz)** archives do
not count as a Marco release.

A release is valid only after `.github/workflows/release.yml` has uploaded all
required built assets to the GitHub Release page:

- `marco-extension-{VER}.zip`
- `macro-controller-{VER}.zip`
- `marco-sdk-{VER}.zip`
- `xpath-{VER}.zip`
- `prompts-{VER}.zip` when prompts exist
- `install.ps1`
- `install.sh`
- `VERSION.txt`
- `changelog.md`
- `checksums.txt`
- `RELEASE_NOTES.md` or equivalent body content

## Root cause pattern

The recurring symptom is a tag/release page with only GitHub source archives and
no built ZIPs. That means the release publication contract did not run to
completion. Known causes:

1. Tag/release created from GitHub UI or metadata tooling without a successful
   `release.yml` run.
2. `workflow_dispatch` runs against the default branch instead of checking out
   the requested tag, so assets/notes can come from the wrong commit.
3. Release notes use the current tag as the "previous tag" when the workflow is
   running on that tag, making the changelog range `${VER}..HEAD` weak or empty.
4. Release metadata files such as `.gitmap/release/*.json` are not authoritative
   because `