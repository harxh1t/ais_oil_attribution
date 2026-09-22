# Methodology for this investigation

Generated: 2026-09-21T12:24:30.669357+00:00
Config snapshot: see `config_snapshot.yaml` in this bundle.

## Regime Classification
Decision: **delayed**
Rationale: User explicitly specified 'delayed' regime via CLI argument.
*Note: This classification follows an explicit engineering rule (see sources.md).*

## Attribution Method
Ranking method used: `borda`
Metrics:
- Discrete Fréchet distance (curve shape parity)
- DCPA / TCPA (kinematic closest point of approach and time offset)
- AIS coverage completeness discount (applied once to confidence score)

*No peer-reviewed formula exists for combining these into a single attribution probability; see sources.md for scientific foundations.*
