#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOVERNED = ("quality","compliance","security","runbooks","evidence","change-control")
EXPECTED = {
    "quality/README.md","quality/record-template.md",
    "compliance/README.md","compliance/record-template.md",
    "security/README.md","security/record-template.md",
    "runbooks/README.md","runbooks/runbook-template.md",
    "evidence/README.md","evidence/redaction-policy.md","evidence/directory-owners.yml",
    "evidence/schemas/directory-ownership.schema.json",
    "evidence/schemas/evidence-item.schema.json",
    "evidence/schemas/evidence-register.schema.json",
    "evidence/readiness/register.yml",
    "evidence/templates/evidence-item.example.yml",
    "change-control/README.md","change-control/change-register.yml",
    "change-control/change-record-template.yml",
    "change-control/schemas/change-record.schema.json",
}
SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "database credential URL": re.compile(r"\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?)://[^/\s:@]+:[^@\s/]+@", re.I),
    "secret assignment": re.compile(r"\b(?:API_KEY|SECRET_KEY|CLIENT_SECRET|DATABASE_URL|WEBHOOK_SECRET|PRIVATE_KEY)\s*[:=]\s*[^\s\"']{8,}", re.I),
    "provider secret key": re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}\b"),
    "JWT-like token": re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b"),
}
PII_PATTERNS = {
    "email address": re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
    "Nigerian phone number": re.compile(r"(?<!\d)(?:\+234|234|0)[789]\d{9}(?!\d)"),
    "possible bank account number": re.compile(r"(?<![\d-])\d{10}(?![\d-])"),
}
class ValidationError(Exception): pass

def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise ValidationError(f"{path.relative_to(ROOT)}: invalid JSON-compatible YAML/JSON: {e}")

def is_type(value, spec):
    if isinstance(spec, list):
        return any(is_type(value, x) for x in spec)
    return {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "number": isinstance(value, (int,float)) and not isinstance(value, bool),
        "boolean": isinstance(value, bool),
        "null": value is None,
    }.get(spec, True)

def validate_schema(value, schema, where="$"):
    if "type" in schema and not is_type(value, schema["type"]):
        raise ValidationError(f"{where}: expected {schema['type']}, got {type(value).__name__}")
    if "const" in schema and value != schema["const"]:
        raise ValidationError(f"{where}: must equal {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        raise ValidationError(f"{where}: unexpected value {value!r}")
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            raise ValidationError(f"{where}: string is too short")
        if "pattern" in schema and not re.fullmatch(schema["pattern"], value):
            raise ValidationError(f"{where}: does not match {schema['pattern']}")
        if schema.get("format") == "date-time":
            try: dt.datetime.fromisoformat(value.replace("Z","+00:00"))
            except ValueError: raise ValidationError(f"{where}: invalid date-time")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            raise ValidationError(f"{where}: expected at least {schema['minItems']} items")
        for i,item in enumerate(value):
            validate_schema(item, schema.get("items", {}), f"{where}[{i}]")
    if isinstance(value, dict):
        required=schema.get("required",[])
        missing=[k for k in required if k not in value]
        if missing: raise ValidationError(f"{where}: missing {missing}")
        props=schema.get("properties",{})
        if schema.get("additionalProperties") is False:
            extra=sorted(set(value)-set(props))
            if extra: raise ValidationError(f"{where}: unexpected properties {extra}")
        for k,v in value.items():
            if k in props: validate_schema(v, props[k], f"{where}.{k}")

def scan_text(text: str, include_pii: bool):
    hits=[]
    for name,rx in SECRET_PATTERNS.items():
        if rx.search(text): hits.append(name)
    if include_pii:
        for name,rx in PII_PATTERNS.items():
            if rx.search(text): hits.append(name)
    return hits

def validate_redaction():
    failures=[]
    for dirname in GOVERNED:
        base=ROOT/dirname
        for path in base.rglob("*"):
            if not path.is_file(): continue
            text=path.read_text(encoding="utf-8")
            include_pii = dirname == "evidence" and path.suffix.lower() not in {".json"}
            hits=scan_text(text, include_pii)
            if hits: failures.append(f"{path.relative_to(ROOT)}: {', '.join(sorted(set(hits)))}")
    if failures: raise ValidationError("redaction scan failed:\n" + "\n".join(failures))

def validate_foundation():
    missing=[p for p in sorted(EXPECTED) if not (ROOT/p).is_file()]
    if missing: raise ValidationError(f"missing required files: {missing}")
    for d in GOVERNED:
        if not (ROOT/d).is_dir(): raise ValidationError(f"missing directory {d}/")
    owner_schema=load_json(ROOT/"evidence/schemas/directory-ownership.schema.json")
    owners=load_json(ROOT/"evidence/directory-owners.yml")
    validate_schema(owners, owner_schema, "directory-owners")
    paths=[x["path"] for x in owners["directories"]]
    expected=[x+"/" for x in GOVERNED]
    if sorted(paths)!=sorted(expected): raise ValidationError("owner registry does not cover exactly six governed directories")
    ev_schema=load_json(ROOT/"evidence/schemas/evidence-item.schema.json")
    ev=load_json(ROOT/"evidence/templates/evidence-item.example.yml")
    validate_schema(ev, ev_schema, "evidence-example")
    if not ev["is_example"] or ev["status"]=="PASS":
        raise ValidationError("evidence example must be clearly marked and cannot be PASS")
    reg_schema=load_json(ROOT/"evidence/schemas/evidence-register.schema.json")
    reg=load_json(ROOT/"evidence/readiness/register.yml")
    validate_schema(reg, reg_schema, "evidence-register")
    if reg["status"]=="PASS" or reg["evidence_item_ids"]:
        raise ValidationError("foundation readiness register cannot claim PASS or real evidence")
    if len(set(reg["gate_files"]))!=14:
        raise ValidationError("readiness register must reference 14 unique gate files")
    for rel in reg["gate_files"]:
        gate=load_json(ROOT/rel)
        if gate["gate_id"] != Path(rel).stem:
            raise ValidationError(f"{rel}: gate ID mismatch")
        if gate["status"]!="NOT_STARTED" or gate["decision"]!="HOLD":
            raise ValidationError(f"{rel}: foundation gate must remain NOT_STARTED/HOLD")
        if gate["contains_personal_data"] or gate["contains_secrets"]:
            raise ValidationError(f"{rel}: unsafe content declaration")
    ch_schema=load_json(ROOT/"change-control/schemas/change-record.schema.json")
    ch=load_json(ROOT/"change-control/change-record-template.yml")
    validate_schema(ch, ch_schema, "change-record-example")
    if not ch["is_example"] or ch["status"] not in {"DRAFT","HOLD"}:
        raise ValidationError("change example must remain DRAFT/HOLD")
    cr=load_json(ROOT/"change-control/change-register.yml")
    if cr["record_ids"] or cr["contains_personal_data"] or cr["contains_secrets"]:
        raise ValidationError("foundation change register must be empty and safe")
    validate_redaction()
    return {
        "directories": len(GOVERNED),
        "gate_files": len(reg["gate_files"]),
        "schemas": 4,
        "foundation_records": 2,
    }

def self_test():
    samples = {
        "private key": "-----BEGIN PRIVATE KEY-----\nnot-a-real-key",
        "database URL": "postgresql://user:password@db.invalid/noma",
        "provider key": "sk_test_1234567890ABCDEF",
        "email": "student@example.invalid",
        "phone": "+2348012345678",
        "bank": "account 0123456789",
    }
    missed=[]
    for name,text in samples.items():
        if not scan_text(text, include_pii=True): missed.append(name)
    if missed: raise ValidationError(f"redaction self-test missed: {missed}")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--redaction-only", action="store_true")
    args=p.parse_args()
    try:
        if args.redaction_only:
            validate_redaction()
            print("PASS: governed directories contain no detected secrets or personal-data patterns")
        else:
            result=validate_foundation()
            print(f"PASS: {result['directories']} governed directories, {result['gate_files']} readiness gates, {result['schemas']} schemas")
        if args.self_test:
            self_test()
            print("PASS: injected secret and personal-data samples were rejected")
    except ValidationError as e:
        print(f"FAIL: {e}", file=sys.stderr)
        return 1
    return 0
if __name__=="__main__":
    raise SystemExit(main())
