# snapcheck

Snapshot a folder, verify it later. Detect added, modified, missing, and bit-rotted files.

Zero dependencies. Reads only. Exit codes: `0` unchanged, `1` changed, `2` error.

**One-time $9, lifetime, MIT.** Buy once, use forever →
**[buy.stripe.com/eVq4gAfo66LEfmMeHk1ck08](https://buy.stripe.com/eVq4gAfo66LEfmMeHk1ck08)**

## Install (no npm account needed)

```bash
d=$(mktemp -d) && cd "$d"
curl -fsSL -O https://github.com/johnmaxwellsmith1-sketch/snapcheck/releases/download/v0.1.0/snapcheck-cli-0.1.0.tgz
mkdir -p "${HOME}/bin" && tar -xzf snapcheck-cli-0.1.0.tgz
cp package/snapcheck.mjs "${HOME}/bin/snapcheck" && chmod +x "${HOME}/bin/snapcheck"
rm -rf "$d"

snapcheck snap ~/Documents          # writes ~/Documents/.snapcheck.json
snapcheck chk  ~/Documents          # 0 unchanged / 1 changed / 2 error
snapcheck chk  ~/Documents --json    # machine-readable
```

(Make sure `~/bin` is on your `PATH`. `npm i -g @snapcheck/cli` also works once the package is published.)

## What it catches

- **Bit rot on old drives** — the same size + mtime but a different hash is a silent data-corruption signal.
- **"Did anything change in this folder since last week?"** — one command.
- **Backup verification** — snapshot the source, verify the copy matches.

## Safety

Reads the target tree only ever. Writes nothing except the manifest you ask for. Skips symlinks (no loops).

## License

MIT. Build with Ponytail ("the best code is the code you never wrote").
