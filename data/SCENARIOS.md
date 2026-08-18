# RailSync demonstration scenarios

The named scenarios are stored in `scenarios.json` and can be selected through the optimizer or API.

- `baseline` — normal timetable, planned maintenance, rake jobs and crew rostering.
- `no_maintenance` — zero maintenance requests and zero active alerts; timetable and crew planning still run.
- `planned_conflicts` — overlapping maintenance requests and train conflicts.
- `track_failure` — Track-B signal failure; traffic-aware rerouting is attempted.
- `blocked_alternate` — Track-B failure with a halted consist on Track-C; rerouting is rejected for manual review.
- `condition_alert` — active condition alert creates urgent rake inspection during turnaround.
- `back_to_back_critical` — two critical alerts arrive close together; safe work is sequenced and impossible cases go to manual review.

API examples:

```bash
curl -s http://localhost:8000/api/scenarios
curl -s -X POST http://localhost:8000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{"scenario_name":"blocked_alternate"}'
```
