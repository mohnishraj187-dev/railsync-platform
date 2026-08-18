# Railway Maintenance Scheduling — SIH PS 92 POC data

These files provide a safe demo dataset; they are **synthetic** and contain no operational railway data.

## Crew and fatigue dataset

`data/crew_members.csv`, `data/crew_absences.csv` and `data/running_duties.csv` provide a fictional crew-roster scenario. It includes loco pilots, guards, track/OHE/signal/inspection staff, qualifications, availability, recent duty indicators, leave and deliberately uncovered duties. See [the data dictionary](data/CREW_DATA.md) for the fields and POC safety rules.

This data is for decision-support demonstrations only: a real roster must use the railway administration's approved duty, rest, medical, competence and privacy rules.

## Data you can use later

- Railway/metro open-data portals: timetable, station, route and service information.
- Mock data for the POC: manually create maintenance requests, crew rosters and engineering blocks (the included approach).
- A real deployment: integrate a railway's maintenance-management system, traffic-control/timetable system, crew system and asset register, subject to the organisation's approval and security rules.

Do not use live operational schedules or safety-critical control data in a student demo without formal permission.

## Run the example

```bash
cd /home/mohnish/Projects/railway-maintenance-poc
python3 simulate.py
```

It writes `schedule_result.json`, which your frontend can load or receive through an API.

## Frontend API shape

Use these endpoints in a later backend:

- `GET /api/maintenance-requests` → `maintenance_requests.csv`
- `GET /api/engineering-windows` → `engineering_windows.csv`
- `POST /api/optimize` → run `simulate.py`, return `schedule_result.json`

Show the input jobs as yellow cards. Mark `conflicts_detected` red. Render `optimized_schedule` as green blocks on the Gantt chart; any item with `needs_manual_review` is orange.
