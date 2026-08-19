"""Constraint-based scheduling engine for the synthetic RailSync POC."""
import csv
import json
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT / "data"
# Lower rank means the job is handled first. These classes deliberately rank
# the credible failure consequence, rather than the asset name alone.
SAFETY_HIERARCHY = {
    1: "Emergency safety event",
    2: "Train-running safety defect",
    3: "Track and turnout safety defect",
    4: "Signalling and power safety defect",
    5: "Critical operational disruption",
    6: "Preventive infrastructure maintenance",
    7: "Rake turnaround and service readiness",
    8: "Routine housekeeping",
}
LEGACY_PRIORITY_RANK = {"Critical": 3, "High": 5, "Normal": 6}
RISK_BY_SAFETY_RANK = {1: 99, 2: 92, 3: 86, 4: 82, 5: 68, 6: 45, 7: 25, 8: 10}
FATIGUE_COST = {"low": 0, "medium": 15, "high": 40}
# Configurable POC profile based on Railway Servants (Hours of Work and Period of Rest) rules and Railway Board running-staff instructions. This is not an operational authorization.
RUNNING_RULES = {"hq_rest_short_hours": 12, "hq_rest_long_hours": 16, "outstation_rest_short_hours": 6, "outstation_rest_long_hours": 8, "max_consecutive_nights": 6, "periodic_rest_target_hours": 120, "max_days_away_from_hq": 3}
MAINTENANCE_MIN_REST_HOURS = 6

def at(value):
    return datetime.fromisoformat(value)

def safety_rank(job):
    """Return an explainable, fault-based rank while accepting legacy inputs."""
    try:
        rank = int(job.get("safety_rank", job.get("priority_rank")))
        if rank in SAFETY_HIERARCHY:
            return rank
    except (TypeError, ValueError):
        pass
    return LEGACY_PRIORITY_RANK.get(job.get("priority"), 8)

def safety_class(job):
    return job.get("safety_class") or SAFETY_HIERARCHY[safety_rank(job)]

def priority_key(job, time_field):
    return (safety_rank(job), at(job[time_field]))

def overlap(a, b, c, d):
    return a < d and c < b

def read_csv(name):
    with (DATA / name).open(newline="") as f:
        return list(csv.DictReader(f))

def load_scenario(scenario_name="baseline"):
    data = json.loads((ROOT / "dataset.json").read_text())
    data["network"] = json.loads((DATA / "network.json").read_text())
    # Keep the timetable as an independently editable operational input.
    data["train_operations"] = read_csv("train_operations.csv")
    data["crew_members"] = read_csv("crew_members.csv")
    data["crew_absences"] = read_csv("crew_absences.csv")
    data["running_duties"] = read_csv("running_duties.csv")
    data["rake_movements"] = read_csv("rake_movements.csv")
    data["coach_maintenance_requests"] = read_csv("coach_maintenance_requests.csv")
    data["maintenance_resources"] = read_csv("maintenance_resources.csv")
    data["condition_alerts"] = read_csv("condition_alerts.csv")
    data["active_disruptions"] = []
    data["completed_jobs"] = []
    scenarios_path = DATA / "scenarios.json"
    scenarios = json.loads(scenarios_path.read_text()) if scenarios_path.exists() else {}
    scenario = scenarios.get(scenario_name, scenarios.get("baseline", {}))
    data["scenario_name"] = scenario_name if scenario_name in scenarios else "baseline"
    data["scenario_description"] = scenario.get("description", "Baseline operating plan")
    for key in ("maintenance_requests", "coach_maintenance_requests", "condition_alerts", "train_operations"):
        if key in scenario:
            data[key] = scenario[key]
    disruptions = []
    for item in scenario.get("active_disruptions", []):
        disruptions.append(data["network"].get(item, item) if isinstance(item, str) else item)
    data["active_disruptions"] = disruptions
    for train in scenario.get("train_operations_additions", []):
        data["train_operations"].append(train)
    return data

def absent(crew_id, start, end, absences):
    return any(a["crew_id"] == crew_id and a["approved"] == "yes" and overlap(start, end, at(a["start"]), at(a["end"])) for a in absences)

def is_running_role(role):
    return role.lower() in {"loco_pilot", "guard", "assistant_loco_pilot"}

def required_rest_hours(duty):
    if not is_running_role(duty["required_role"]):
        return MAINTENANCE_MIN_REST_HOURS
    duration = at(duty["end"]) - at(duty["start"])
    if duty.get("duty_location", "hq") == "outstation":
        return RUNNING_RULES["outstation_rest_long_hours"] if duration >= timedelta(hours=8) else RUNNING_RULES["outstation_rest_short_hours"]
    return RUNNING_RULES["hq_rest_long_hours"] if duration >= timedelta(hours=8) else RUNNING_RULES["hq_rest_short_hours"]

def night_duty(duty):
    start = at(duty["start"])
    return start.hour >= 22 or start.hour < 6

def eligibility_reason(member, duty, assignments, absences):
    start, end = at(duty["start"]), at(duty["end"])
    if member["status"] != "available" or member["role"] != duty["required_role"].lower():
        return "role or availability status does not match"
    if duty["track"] not in member["qualified_sections"].split("|"):
        return "route/section learning is missing"
    if duty["required_qualification"] and duty["required_qualification"] not in member["qualified_equipment"].split("|"):
        return "traction/equipment qualification is missing"
    if member.get("medical_status", "fit") != "fit":
        return "medical restriction"
    if start < at(member["availability_start"]) or end > at(member["availability_end"]):
        return "outside availability window"
    rest = required_rest_hours(duty)
    if start - at(member["last_sign_off"]) < timedelta(hours=rest):
        return f"required rest not met ({rest}h)"
    if absent(member["crew_id"], start, end, absences):
        return "approved leave/training/medical absence"
    if is_running_role(duty["required_role"]) and int(member.get("days_away_from_hq", "0")) >= RUNNING_RULES["max_days_away_from_hq"] and duty.get("duty_location", "hq") == "outstation":
        return "maximum time away from headquarters reached"
    if is_running_role(duty["required_role"]) and int(member.get("periodic_rest_hours_this_month", "120")) < RUNNING_RULES["periodic_rest_target_hours"]:
        return "periodic rest target is due"
    if night_duty(duty) and int(member.get("consecutive_night_duties", "0")) >= RUNNING_RULES["max_consecutive_nights"]:
        return "consecutive night-duty limit reached"
    if any(a["crew_id"] == member["crew_id"] and overlap(start, end, at(a["start"]), at(a["end"])) for a in assignments):
        return "overlapping duty"
    return ""

def eligible(member, duty, assignments, absences):
    return not eligibility_reason(member, duty, assignments, absences)

def choose(candidates):
    return min(candidates, key=lambda m: (FATIGUE_COST[m["fatigue_band"]], int(m["night_duties_last_7d"]), m["crew_id"]))

def roster_duties(duties, members, absences):
    assignments, uncovered, by_id = [], [], {m["crew_id"]: m for m in members}
    for duty in sorted(duties, key=lambda x: at(x["start"])):
        previous = by_id.get(duty.get("assigned_crew_id", ""))
        if previous and eligible(previous, duty, assignments, absences):
            crew = previous
        else:
            options = [m for m in members if eligible(m, duty, assignments, absences)]
            crew = choose(options) if options else None
        if crew:
            assignments.append({"duty_id": duty["duty_id"], "service": duty["service"], "role": duty["required_role"], "crew_id": crew["crew_id"], "start": duty["start"], "end": duty["end"], "status": "assigned"})
        else:
            reasons = [eligibility_reason(m, duty, assignments, absences) for m in members]
            uncovered.append({"duty_id": duty["duty_id"], "service": duty["service"], "role": duty["required_role"], "status": "manual_review", "reason": "No eligible crew after Indian-Railways-style rest, route, medical, qualification and absence checks.", "checks": sorted(set(x for x in reasons if x))})
    return assignments, uncovered

def _segment(network, track):
    return next((s for s in network.get("segments", []) if s["track"] == track), {})

def _traffic_checks(candidate, route, trains, accepted, network):
    """Return explainable traffic/safety conflicts for a candidate route."""
    safety = network.get("safety", {})
    headway = int(candidate.get("minimum_headway_minutes", safety.get("default_headway_minutes", 10)))
    start, end = at(candidate["start"]), at(candidate["end"])
    expanded_start, expanded_end = start - timedelta(minutes=headway), end + timedelta(minutes=headway)
    segment = _segment(network, route)
    conflicts = []
    for other in [*trains, *accepted]:
        if other.get("id") == candidate.get("id") or other.get("track") != route:
            continue
        other_start = at(other.get("actual_start", other["start"]))
        other_end = at(other.get("actual_end", other["end"]))
        status = str(other.get("status", "running")).lower()
        if status in {"halted", "stopped", "blocked"} and other_start <= end and other_end >= start:
            conflicts.append(f"halted/blocked train {other.get('service', other.get('id'))} ahead on {route}")
        elif overlap(expanded_start, expanded_end, other_start, other_end):
            conflicts.append(f"block/headway conflict with {other.get('service', other.get('id'))} on {route}")
        direction = candidate.get("direction")
        other_direction = other.get("direction")
        if direction and other_direction and direction != other_direction and overlap(start, end, other_start, other_end):
            conflicts.append(f"opposing-direction movement with {other.get('service', other.get('id'))}")
        other_segment = _segment(network, other.get("track"))
        shared = set([segment.get("from"), segment.get("to")]) & set([other_segment.get("from"), other_segment.get("to")])
        if shared and overlap(start, end, other_start, other_end):
            conflicts.append(f"station throat conflict at {sorted(shared)[0]} with {other.get('service', other.get('id'))}")
    return sorted(set(conflicts))

def reroute_trains(trains, network, disruptions):
    plan, accepted = [], []
    for train in sorted(trains, key=lambda x: at(x["start"])):
        start, end = at(train["start"]), at(train["end"])
        incident = next((d for d in disruptions if d["track"] == train["track"] and overlap(start, end, at(d["start"]), at(d["end"]))), None)
        alternatives = network["reroute_options"].get(train["track"], []) if incident else []
        candidate = {**train, "start": train["start"], "end": train["end"]}
        route, route_conflicts = None, {}
        for alternative in alternatives:
            checks = _traffic_checks(candidate, alternative, trains, accepted, network)
            route_conflicts[alternative] = checks
            if not checks:
                route = alternative
                break
        if route:
            item = {**train, "original_track": train["track"], "track": route, "status": "rerouted", "reason": incident["reason"], "traffic_checks": [f"{route}: clear block, headway and station-throat checks"]}
        elif incident:
            reasons = [f"{track}: {', '.join(checks)}" for track, checks in route_conflicts.items() if checks]
            item = {**train, "status": "manual_review", "reason": "No safe alternate route after traffic checks.", "traffic_checks": reasons or ["No configured alternate route"]}
        else:
            item = {**train, "status": "on_plan", "traffic_checks": [f"{train['track']}: baseline movement"]}
        plan.append(item)
        accepted.append(item)
    return plan

def schedule_maintenance(requests, windows, trains, members, absences, assignments):
    scheduled, manual = [], []
    for job in sorted(requests, key=lambda x: priority_key(x, "preferred_start")):
        duration, selected = timedelta(minutes=job["duration_minutes"]), None
        for window in sorted((w for w in windows if w["track"] == job["track"]), key=lambda x: at(x["start"])):
            start, stop = max(at(window["start"]), at(job["preferred_start"])), at(window["end"])
            while start + duration <= stop:
                end = start + duration
                crew_duty = {"start": start.isoformat(), "end": end.isoformat(), "track": job["track"], "required_role": job["crew_type"], "required_qualification": job.get("equipment", "")}
                options = [m for m in members if eligible(m, crew_duty, assignments, absences)]
                busy_train = any(t["track"] == job["track"] and overlap(start, end, at(t["start"]), at(t["end"])) for t in trains)
                busy_job = any(s["track"] == job["track"] and overlap(start, end, at(s["start"]), at(s["end"])) for s in scheduled)
                if not busy_train and not busy_job and options:
                    selected = (start, end, window["id"], choose(options))
                    break
                start += timedelta(minutes=15)
            if selected:
                break
        if selected:
            start, end, window_id, crew = selected
            assignments.append({"duty_id": job["id"], "service": job["title"], "role": job["crew_type"], "crew_id": crew["crew_id"], "start": start.isoformat(), "end": end.isoformat()})
            scheduled.append({**job, "start": start.isoformat(), "end": end.isoformat(), "window_id": window_id, "assigned_crew_id": crew["crew_id"], "status": "scheduled"})
        else:
            manual.append({**job, "status": "manual_review", "reason": "No safe window with a conflict-free, eligible crew."})
    return scheduled, manual


def schedule_rake_maintenance(requests, movements, resources, members, absences, assignments, dynamic_alerts):
    jobs = list(requests)
    by_rake = {r["rake_id"]: r for r in movements}
    for alert in dynamic_alerts:
        if alert["alert_status"] != "active" or not alert.get("rake_id") or any(j["rake_id"] == alert["rake_id"] and j["status"] == "condition_alert" for j in jobs):
            continue
        rake = by_rake.get(alert["rake_id"])
        if not rake:
            continue
        jobs.append({"request_id": alert["alert_id"], "rake_id": alert["rake_id"], "location": rake["location"], "maintenance_type": alert["recommended_action"], "priority": alert["severity"], "safety_rank": alert.get("safety_rank"), "safety_class": alert.get("safety_class"), "duration_minutes": "60", "earliest_start": rake["arrival"], "latest_end": alert["due_by"], "required_crew": "inspection", "required_resource": "pit_bay", "reason": alert.get("recommended_action", "Condition alert inspection"), "risk_if_delayed": "Asset may be released with an unresolved safety condition.", "predicted_duration_minutes": 60, "duration_confidence": "high", "status": "condition_alert", "source_status": "condition_alert"})
    scheduled, manual, used_resources = [], [], []
    for job in sorted(jobs, key=lambda x: priority_key(x, "earliest_start")):
        movement = by_rake.get(job["rake_id"])
        if not movement:
            manual.append({**job, "status": "manual_review", "reason": "Rake movement not found."})
            continue
        duration = timedelta(minutes=int(job["duration_minutes"]))
        start = max(at(job["earliest_start"]), at(movement["arrival"]))
        limit = min(at(job["latest_end"]), at(movement["scheduled_departure"]))
        selected = None
        while start + duration <= limit:
            end = start + duration
            resource = next((r for r in resources if r["resource_type"] == job["required_resource"] and r["location"] == job["location"] and r["status"] == "available" and start >= at(r["available_start"]) and end <= at(r["available_end"]) and not any(u["resource_id"] == r["resource_id"] and overlap(start, end, at(u["start"]), at(u["end"])) for u in used_resources)), None)
            duty = {"start": start.isoformat(), "end": end.isoformat(), "track": "Track-C" if job["location"] == "ST-C" else "Track-B", "required_role": job["required_crew"], "required_qualification": ""}
            options = [m for m in members if eligible(m, duty, assignments, absences)]
            crew = choose(options) if options else None
            if resource and crew:
                selected = (start, end, resource, crew)
                break
            start += timedelta(minutes=15)
        if selected:
            start, end, resource, crew = selected
            assignments.append({"duty_id": job["request_id"], "service": job["maintenance_type"], "role": job["required_crew"], "crew_id": crew["crew_id"], "start": start.isoformat(), "end": end.isoformat()})
            used_resources.append({"resource_id": resource["resource_id"], "start": start.isoformat(), "end": end.isoformat()})
            scheduled.append({**job, "start": start.isoformat(), "end": end.isoformat(), "resource_id": resource["resource_id"], "assigned_crew_id": crew["crew_id"], "source_status": job.get("status"), "status": "scheduled"})
        else:
            manual.append({**job, "status": "manual_review", "reason": "No bay, crew and turnaround slot before rake departure."})
    return scheduled, manual

def optimize(data):
    train_plan = reroute_trains(data["train_operations"], data["network"], data.get("active_disruptions", []))
    conflicts = []
    for i, job in enumerate(data["maintenance_requests"]):
        start, end = at(job["preferred_start"]), at(job["preferred_start"]) + timedelta(minutes=job["duration_minutes"])
        for other in data["maintenance_requests"][i + 1:]:
            other_end = at(other["preferred_start"]) + timedelta(minutes=other["duration_minutes"])
            if job["track"] == other["track"] and overlap(start, end, at(other["preferred_start"]), other_end):
                conflicts.append({"message": f"{job['id']} and {other['id']} overlap on {job['track']}"})
        for train in train_plan:
            if job["track"] == train["track"] and overlap(start, end, at(train["start"]), at(train["end"])):
                conflicts.append({"message": f"{job['id']} conflicts with {train['service']}"})
    crew_assignments, uncovered = roster_duties(data["running_duties"], data["crew_members"], data["crew_absences"])
    schedule, manual = schedule_maintenance(data["maintenance_requests"], data["engineering_windows"], train_plan, data["crew_members"], data["crew_absences"], crew_assignments)
    rake_schedule, rake_manual = schedule_rake_maintenance(data["coach_maintenance_requests"], data["rake_movements"], data["maintenance_resources"], data["crew_members"], data["crew_absences"], crew_assignments, data["condition_alerts"])
    manual.extend(rake_manual)
    capacity = sum(int((at(w["end"]) - at(w["start"])).total_seconds() // 60) for w in data["engineering_windows"])
    decisions = []
    # The controller queue follows the fault-based safety hierarchy. Active
    # alerts remain visible, but are not automatically ranked above a more
    # severe verified failure on another asset.
    decision_jobs = [*schedule, *manual, *rake_schedule]
    decision_jobs.sort(key=lambda job: (
        safety_rank(job),
        at(job["start"]) if job.get("start") else at(job.get("earliest_start", "9999-12-31T23:59:59")),
    ))
    for job in decision_jobs:
        scheduled = job.get("status") == "scheduled"
        priority = job.get("priority", "Normal")
        rank = safety_rank(job)
        classification = safety_class(job)
        checks = [f"Rank {rank}: {classification}", f"Legacy severity: {priority}"]
        if scheduled:
            checks += ["no train conflict", "eligible crew selected/reassigned", "engineering/resource window available"]
            reason = "Scheduled: all safety, crew, resource and time-window checks passed."
        else:
            reason_text = job.get("reason", "Manual review required.")
            checks += ["safe slot or eligible crew reassignment could not resolve it", "controller approval required"]
            reason = f"Rejected for automatic scheduling: {reason_text}"
        decisions.append({"job_id": job.get("id", job.get("request_id")), "title": job.get("title", job.get("maintenance_type", "Rake maintenance")), "priority": priority, "safety_rank": rank, "safety_class": classification, "status": "scheduled" if scheduled else "manual_review", "checks": checks, "reason": reason, "predicted_duration_minutes": job.get("predicted_duration_minutes", job.get("duration_minutes")), "start": job.get("start"), "end": job.get("end"), "track": job.get("track"), "risk_if_delayed": job.get("risk_if_delayed"), "source_status": job.get("source_status")})
    active_alerts = [a for a in data["condition_alerts"] if a.get("alert_status") == "active"]
    top_alert = min(active_alerts, key=safety_rank, default=None)
    top_rank = safety_rank(top_alert) if top_alert else 8
    risk_summary = {"score": min(99, RISK_BY_SAFETY_RANK[top_rank] + max(0, len(active_alerts)-1) * 2) if top_alert else 18, "severity": top_alert.get("severity", "Normal") if top_alert else "Normal", "safety_rank": top_rank if top_alert else None, "safety_class": safety_class(top_alert) if top_alert else "No active safety issue", "asset": top_alert.get("asset", "Network baseline") if top_alert else "Network baseline", "alert_id": top_alert.get("alert_id") if top_alert else None, "active_alerts": len(active_alerts), "basis": "Fault-based safety rank and active-alert count"}
    return {"input_conflicts": conflicts, "schedule": schedule, "rake_schedule": rake_schedule, "manual_review": manual, "decision_trace": decisions, "risk_summary": risk_summary, "train_plan": train_plan, "crew_assignments": crew_assignments, "uncovered_duties": uncovered, "metrics": {"scheduled_jobs": len(schedule), "rake_jobs_scheduled": len(rake_schedule), "manual_review_jobs": len(manual), "window_utilisation": round(sum(j["duration_minutes"] for j in schedule) / capacity * 100), "crew_covered_duties": len(crew_assignments), "crew_uncovered_duties": len(uncovered), "rerouted_trains": sum(t["status"] == "rerouted" for t in train_plan), "condition_alerts_processed": len(data["condition_alerts"])}}
