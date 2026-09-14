# snapcheck

Snapshot a folder, verify it later. Detect added, modified, missing, and bit-rotted files.

Zero dependencies. Reads only. Exit codes: `0` unchanged, `1` changed, `2` error.

```bash
npm i -g @snapcheck/cli

snapcheck snap ~/Documents          # writes ~/Documents/.snapcheck.json
snapcheck chk  ~/Documents          # 0 unchanged / 1 changed / 2 error
snapcheck chk  ~/Documents --json    # machine-readable
```

## Why

- **Bit rot on old drives** — the same size + mtime but a different hash is a silent data-corruption signal.
- **"Did anything change in this folder since last week?"** — one command.
- **Backup verification** — snapshot the source, verify the copy matches.

## Safety

Reads the target tree only ever. Writes nothing except the manifest you ask for. Skips symlinks (no loops).

## License

MIT. Build with Ponytail ("the best code is the code you never wrote").
