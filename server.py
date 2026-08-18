"""Local server and greedy re-optimization engine for the SIH PS 92 POC."""
from datetime import datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import os
from optimizer import load_scenario, optimize as advanced_optimize

ROOT = Path(__file__).parent
PRIORITY = {"Critical": 0, "High": 1, "Normal": 2}
def d(x): return datetime.fromisoformat(x)
def overlap(a, b, c, e): return a < e and c < b

def conflicts(data):
    out=[]; jobs=data["maintenance_requests"]
    for i,j in enumerate(jobs):
        a,b=d(j["preferred_start"]),d(j["preferred_start"])+timedelta(minutes=j["duration_minutes"])
        for o in jobs[i+1:]:
            c,e=d(o["preferred_start"]),d(o["preferred_start"])+timedelta(minutes=o["duration_minutes"])
            if j["track"]==o["track"] and overlap(a,b,c,e): out.append({"message":f"{j['id']} and {o['id']} overlap on {j['track']}"})
        for t in data["train_operations"]:
            if j["track"]==t["track"] and overlap(a,b,d(t["start"]),d(t["end"])): out.append({"message":f"{j['id']} conflicts with {t['service']}"})
    return out

def optimize(data):
    scheduled=[]; manual=[]
    for j in sorted(data["maintenance_requests"],key=lambda x:(PRIORITY.get(x["priority"],3),d(x["preferred_start"]))):
        dur=timedelta(minutes=j["duration_minutes"]); selected=None
        for w in sorted((x for x in data["engineering_windows"] if x["track"]==j["track"]),key=lambda x:d(x["start"])):
            at=max(d(w["start"]),d(j["preferred_start"])); stop=d(w["end"])
            while at+dur<=stop:
                end=at+dur
                train=any(t["track"]==j["track"] and overlap(at,end,d(t["start"]),d(t["end"])) for t in data["train_operations"])
                used=any((s["track"]==j["track"] or s["crew_type"]==j["crew_type"]) and overlap(at,end,d(s["start"]),d(s["end"])) for s in scheduled)
                if not train and not used: selected=(at,end,w["id"]); break
                at+=timedelta(minutes=15)
            if selected: break
        if selected:
            a,b,w=selected; scheduled.append({**j,"start":a.isoformat(),"end":b.isoformat(),"window_id":w,"status":"scheduled"})
        else: manual.append({**j,"status":"manual_review","reason":"No continuous safe slot exists in the supplied windows."})
    capacity=sum((d(w["end"])-d(w["start"])).seconds//60 for w in data["engineering_windows"])
    return {"input_conflicts":conflicts(data),"schedule":scheduled,"manual_review":manual,"metrics":{"scheduled_jobs":len(scheduled),"manual_review_jobs":len(manual),"window_utilisation":round(sum(x["duration_minutes"] for x in scheduled)/capacity*100)}}

class API(SimpleHTTPRequestHandler):
    def reply(self,x,code=200):
        raw=json.dumps(x).encode(); self.send_response(code);self.send_header("Content-Type","application/json");self.send_header("Content-Length",len(raw));self.end_headers();self.wfile.write(raw)
    def do_OPTIONS(self):
        self.send_response(204); self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers", "Content-Type"); self.end_headers()
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path=="/api/scenario":
            name = parse_qs(parsed.query).get("scenario_name", ["baseline"])[0]
            return self.reply(load_scenario(name))
        if self.path=="/api/scenarios": return self.reply(json.loads((ROOT/"data/scenarios.json").read_text()))
        if self.path=="/api/dataset": return self.reply(json.loads((ROOT/"dataset.json").read_text()))
        return super().do_GET()
    def do_POST(self):
        if self.path!="/api/optimize": return self.reply({"error":"Not found"},404)
        try:
            incoming=json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            scenario=load_scenario(incoming.get("scenario_name", "baseline"))
            for key in ("maintenance_requests", "engineering_windows", "train_operations", "active_disruptions", "coach_maintenance_requests", "condition_alerts"):
                if key in incoming: scenario[key]=incoming[key]
            return self.reply(advanced_optimize(scenario))
        except Exception as e: return self.reply({"error":str(e)},400)
if __name__=="__main__":
    port=int(os.environ.get("PORT", "8000"))
    try:
        httpd=ThreadingHTTPServer(("",port),API)
    except OSError as error:
        if port != 8000: raise
        port=8010
        httpd=ThreadingHTTPServer(("",port),API)
        print(f"Port 8000 was busy ({error}); using {port}.")
    print(f"Open http://localhost:{port}/poc.html")
    httpd.serve_forever()
