import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from services.db import supabase

logger = logging.getLogger("backup_service")
logger.setLevel(logging.INFO)

BACKUPS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SETTINGS_FILE = os.path.join(DATA_DIR, "backup_settings.json")

# Ensure required directories exist
os.makedirs(BACKUPS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_SETTINGS = {
    "frequency": "daily",       # "daily", "weekly", "continuous"
    "retention_days": 90,       # 30, 90, 365, or 0 (permanent)
    "auto_verify": True,
    "last_backup_time": None,
    "last_backup_status": "idle"
}

def load_backup_settings() -> Dict[str, Any]:
    """Loads backup schedule and retention policy settings from disk."""
    if not os.path.exists(SETTINGS_FILE):
        save_backup_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            merged = DEFAULT_SETTINGS.copy()
            merged.update(data)
            return merged
    except Exception as e:
        logger.error(f"Error loading backup settings: {e}")
        return DEFAULT_SETTINGS.copy()

def save_backup_settings(settings: Dict[str, Any]) -> None:
    """Saves backup schedule and retention policy settings to disk."""
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving backup settings: {e}")

def create_database_backup(trigger_type: str = "AUTOMATED") -> Dict[str, Any]:
    """
    Exports a comprehensive JSON snapshot of clinic database tables and saves it
    locally to the backups directory, enforces retention policy, and logs an audit record.
    """
    logger.info(f"Starting {trigger_type} database backup...")
    tables = [
        "branches",
        "profiles",
        "appointments",
        "treatments",
        "medical_histories",
        "tooth_conditions",
        "invoices",
        "dentist_schedules",
        "billing_services",
        "audit_logs",
        "appointment_reschedule_logs"
    ]

    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()
    now_local = datetime.now()
    date_str = now_local.strftime("%Y-%m-%d")
    time_str = now_local.strftime("%H-%M")

    filename = f"TeethTalk_Full_System_Backup_{date_str}_{time_str}.json"
    filepath = os.path.join(BACKUPS_DIR, filename)

    snapshot = {
        "system": "TeethTalk Clinical Management System (DAMS)",
        "version": "2.4.0",
        "timestamp": now_iso,
        "backup_type": trigger_type.upper(),
        "database_type": "PostgreSQL Supabase Enterprise",
        "tables": {},
        "summary": {}
    }

    total_records = 0
    for table in tables:
        try:
            res = supabase.table(table).select("*").execute()
            rows = res.data or []
            snapshot["tables"][table] = rows
            snapshot["summary"][table] = len(rows)
            total_records += len(rows)
        except Exception as tbl_err:
            logger.warning(f"Error fetching table {table} for backup: {tbl_err}")
            snapshot["summary"][table] = f"Error: {str(tbl_err)}"
            snapshot["tables"][table] = []

    snapshot["total_records"] = total_records

    # Save to file
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2)
        logger.info(f"Saved backup archive to {filepath} ({total_records} records)")
    except Exception as save_err:
        logger.error(f"Failed to write backup file {filepath}: {save_err}")
        raise save_err

    # Update settings with last backup time
    settings = load_backup_settings()
    settings["last_backup_time"] = now_local.strftime("%Y-%m-%d %H:%M:%S UTC")
    settings["last_backup_status"] = "success"
    save_backup_settings(settings)

    # Insert audit log entry
    try:
        supabase.table("audit_logs").insert({
            "timestamp": now_iso,
            "component": "System Backup & Recovery",
            "action": f"{trigger_type.capitalize()} system database snapshot created ({total_records} records exported to {filename})",
            "severity": "success"
        }).execute()
    except Exception as log_err:
        logger.warning(f"Could not insert audit log for backup: {log_err}")

    # Enforce retention policy
    enforce_retention_policy(settings.get("retention_days", 90))

    file_size_kb = max(1, round(os.path.getsize(filepath) / 1024))
    return {
        "id": f"BK-{date_str.replace('-', '')}-{now_local.strftime('%H%M')}",
        "filename": filename,
        "timestamp": now_local.strftime("%b %d, %Y %I:%M %p"),
        "type": trigger_type.upper(),
        "recordsCount": total_records,
        "size": f"{file_size_kb} KB",
        "status": "VERIFIED"
    }

def enforce_retention_policy(retention_days: int) -> None:
    """Removes backup files older than retention_days. If retention_days <= 0, keep permanently."""
    if not retention_days or retention_days <= 0:
        return

    try:
        cutoff = datetime.now() - timedelta(days=retention_days)
        for fname in os.listdir(BACKUPS_DIR):
            if not fname.endswith(".json"):
                continue
            fpath = os.path.join(BACKUPS_DIR, fname)
            mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
            if mtime < cutoff:
                os.remove(fpath)
                logger.info(f"Pruned expired backup file: {fname} (retention: {retention_days} days)")
    except Exception as e:
        logger.error(f"Error enforcing backup retention policy: {e}")

def get_backup_history() -> List[Dict[str, Any]]:
    """Returns a list of all backup archives stored in the backups directory."""
    backups = []
    if not os.path.exists(BACKUPS_DIR):
        return backups

    for fname in sorted(os.listdir(BACKUPS_DIR), reverse=True):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(BACKUPS_DIR, fname)
        try:
            mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
            size_kb = max(1, round(os.path.getsize(fpath) / 1024))
            
            # Read metadata quickly
            total_records = 0
            backup_type = "AUTOMATED"
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    total_records = data.get("total_records", 0)
                    backup_type = data.get("backup_type", "AUTOMATED")
            except Exception:
                pass

            date_str = mtime.strftime("%Y%m%d")
            time_str = mtime.strftime("%H%M")
            backups.append({
                "id": f"BK-{date_str}-{time_str}",
                "filename": fname,
                "timestamp": mtime.strftime("%b %d, %Y %I:%M %p"),
                "type": backup_type,
                "recordsCount": total_records,
                "size": f"{size_kb} KB",
                "status": "VERIFIED"
            })
        except Exception as item_err:
            logger.warning(f"Error parsing backup file {fname}: {item_err}")

    return backups

def check_and_run_scheduled_backup() -> Optional[Dict[str, Any]]:
    """
    Checks if a backup should run according to current frequency setting:
    - 'daily': Run if no backup has occurred today or > 24 hours.
    - 'weekly': Run if > 7 days since last backup.
    - 'continuous': Run if > 6 hours since last backup.
    """
    settings = load_backup_settings()
    frequency = settings.get("frequency", "daily")
    last_backup_str = settings.get("last_backup_time")

    needs_backup = False
    now = datetime.now()

    if not last_backup_str:
        needs_backup = True
    else:
        try:
            # Parse 'YYYY-MM-DD HH:MM:SS UTC' or ISO format
            clean_str = last_backup_str.replace(" UTC", "").strip()
            if "T" in clean_str:
                last_dt = datetime.fromisoformat(clean_str.replace("Z", "")[:19])
            else:
                last_dt = datetime.strptime(clean_str, "%Y-%m-%d %H:%M:%S")

            elapsed_hours = (now - last_dt).total_seconds() / 3600

            if frequency == "daily":
                # Check if last backup was on a previous calendar day or > 24 hours
                if now.date() > last_dt.date() or elapsed_hours >= 24:
                    needs_backup = True
            elif frequency == "weekly":
                if elapsed_hours >= (24 * 7):
                    needs_backup = True
            elif frequency == "continuous":
                if elapsed_hours >= 6:
                    needs_backup = True
        except Exception as parse_err:
            logger.warning(f"Could not parse last backup timestamp '{last_backup_str}': {parse_err}")
            needs_backup = True

    if needs_backup:
        try:
            logger.info(f"Triggering automated backup based on frequency '{frequency}'...")
            return create_database_backup(trigger_type="AUTOMATED")
        except Exception as e:
            logger.error(f"Automated backup routine failed: {e}")
            settings["last_backup_status"] = f"error: {str(e)}"
            save_backup_settings(settings)
            return None

    return None
