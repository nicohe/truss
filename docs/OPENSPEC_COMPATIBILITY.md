# OpenSpec compatibility contract

TRUSS v0.1 supports stable OpenSpec releases in this range:

```text
>=1.0.0 <2.0.0
```

TRUSS treats OpenSpec as an independently owned required dependency. It detects and evaluates the installed CLI but never upgrades, downgrades, or overwrites OpenSpec automatically.

## States

- `compatible`: stable OpenSpec 1.x; workflows may continue.
- `too_old`: version is below 1.0.0; workflows requiring OpenSpec must stop.
- `unsupported_newer`: version is 2.0.0 or newer; TRUSS must stop until compatibility is explicitly added.
- `unknown`: version cannot be parsed or is a prerelease; compatibility is not assumed.
- `missing`: CLI is not installed.

A newer 1.x release is accepted by the v0.1 contract. A future major version is deliberately fail-closed because it may change commands, project layout, or artifact semantics.

TRUSS does not silently run `openspec update` and does not silently install a different version. The user remains in control of OpenSpec lifecycle changes.
