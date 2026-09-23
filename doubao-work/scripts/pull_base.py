import json, subprocess, sys

BASE = "SzvXbwLAxaSPIMsQRO2chtsjnUb"
TABLES = [
    ("tblzvJL3t8Jg0ZK0", "tasks"),
    ("tbl2iR3MImnrBnnf", "tutorials"),
    ("tblQMx2dZ8gCzQ9j", "quiz"),
    ("tblfiOub4vLHpTkL", "members"),
    ("tblAPErAhLCxDTxj", "tools"),
    ("tbltX7dt0aMzMcDs", "roles"),
]

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return json.loads(r.stdout)

def fetch_table(table_id):
    out = []
    offset = 0
    while True:
        r = run(["lark-cli", "base", "+record-list",
                 "--base-token", BASE, "--table-id", table_id,
                 "--limit", "200", "--offset", str(offset),
                 "--as", "user", "--format", "json"])
        data = r["data"]["data"]
        field_ids = r["data"]["field_id_list"]
        field_types = r["data"]["field_type_list"]
        field_names = r["data"].get("field_name_list") or r["data"].get("field_names") or []
        # field names may need separate mapping; use field_type_list order aligned with field_id_list
        rows = []
        for rec in data:
            row = {}
            for i, fid in enumerate(field_ids):
                fname = None
                # try to fetch field names via a second call if not present
                row[i] = rec[i] if i < len(rec) else None
            out.extend(data)
        if not r["data"].get("has_more"):
            break
        offset += len(data)
    return r  # return last response for field names

# Simpler: fetch all records raw, then map via field list
def get_fields(table_id):
    r = run(["lark-cli", "base", "+field-list", "--base-token", BASE,
             "--table-id", table_id, "--as", "user"])
    return r["data"]["fields"]

def fetch_all(table_id):
    out = []
    offset = 0
    while True:
        r = run(["lark-cli", "base", "+record-list",
                 "--base-token", BASE, "--table-id", table_id,
                 "--limit", "200", "--offset", str(offset),
                 "--as", "user", "--format", "json"])
        data = r["data"]["data"]
        out.extend(data)
        if not r["data"].get("has_more"):
            break
        offset += len(data)
    return out

result = {}
for table_id, key in TABLES:
    fields = get_fields(table_id)
    # map field_id -> name
    id2name = {f["id"]: f["name"] for f in fields}
    # get one record to find the order of field_id_list
    r = run(["lark-cli", "base", "+record-list",
             "--base-token", BASE, "--table-id", table_id,
             "--limit", "1", "--as", "user", "--format", "json"])
    field_ids = r["data"]["field_id_list"]
    records = fetch_all(table_id)
    rows = []
    for rec in records:
        row = {}
        for i, fid in enumerate(field_ids):
            name = id2name.get(fid, fid)
            val = rec[i] if i < len(rec) else None
            row[name] = val
        rows.append(row)
    result[key] = rows
    print(f"{key}: {len(rows)} rows")

with open("/Users/tqqq/Documents/git/dw/multibillion/feishu-ai/doubao-work/docs/workbench-data.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print("saved")
