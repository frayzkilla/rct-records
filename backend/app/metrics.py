import os
import re
import stat
import time
from datetime import UTC, datetime
from pathlib import Path

import psutil


def safe(call):
    try:
        return call()
    except (OSError, ValueError, AttributeError, psutil.Error):
        return None


def network_counters():
    host_proc = os.getenv("HOST_PROC")
    if host_proc:
        counters = {}
        for line in (Path(host_proc) / "1/net/dev").read_text().splitlines()[2:]:
            name, values = line.split(":", 1)
            values = values.split()
            counters[name.strip()] = (int(values[0]), int(values[8]))
    else:
        counters = {name: (item.bytes_recv, item.bytes_sent) for name, item in psutil.net_io_counters(pernic=True, nowrap=False).items()}
    names = [name for name in counters if not re.match(r"^(lo$|docker|veth|br-|virbr|tun|tap|wg)", name)]
    return {"received": sum(counters[name][0] for name in names), "sent": sum(counters[name][1] for name in names), "interfaces": names}


def cpu_usage(before, after):
    values = []
    for first, last in zip(before, after):
        total = sum(last) - sum(first)
        total -= (getattr(last, "guest", 0) - getattr(first, "guest", 0)) + (getattr(last, "guest_nice", 0) - getattr(first, "guest_nice", 0))
        idle = last.idle - first.idle + getattr(last, "iowait", 0) - getattr(first, "iowait", 0)
        values.append(round(max(0, min(100, (total - idle) / total * 100)), 1) if total > 0 else 0)
    return values


def snapshot():
    if os.getenv("HOST_PROC"):
        psutil.PROCFS_PATH = os.environ["HOST_PROC"]
    cpu_before = safe(lambda: psutil.cpu_times(percpu=True))
    disk_before = safe(lambda: psutil.disk_io_counters(nowrap=False))
    net_before = safe(network_counters)
    started = time.monotonic()
    time.sleep(0.3)
    cpu_after = safe(lambda: psutil.cpu_times(percpu=True))
    disk_after = safe(lambda: psutil.disk_io_counters(nowrap=False))
    net_after = safe(network_counters)
    elapsed = time.monotonic() - started
    cores = cpu_usage(cpu_before, cpu_after) if cpu_before and cpu_after else []
    memory = safe(psutil.virtual_memory)
    swap = safe(psutil.swap_memory)
    disk = safe(lambda: psutil.disk_usage(os.getenv("HOST_ROOT", Path.cwd().anchor)))
    boot = safe(psutil.boot_time)
    return {
        "at": datetime.now(UTC).isoformat(),
        "scope": "VPS" if os.getenv("HOST_PROC") else "Локальное окружение",
        "cpu": {"percent": round(sum(cores) / len(cores), 1) if cores else None, "cores": cores, "count": len(cores), "load": safe(lambda: list(os.getloadavg()))},
        "memory": {"total": memory.total, "used": memory.total - memory.available, "available": memory.available, "percent": memory.percent} if memory else None,
        "swap": {"total": swap.total, "used": swap.used, "percent": swap.percent} if swap else None,
        "disk": {"total": disk.total, "used": disk.used, "free": disk.free, "percent": disk.percent} if disk else None,
        "diskIo": {"read": max(0, disk_after.read_bytes - disk_before.read_bytes) / elapsed, "write": max(0, disk_after.write_bytes - disk_before.write_bytes) / elapsed} if disk_before and disk_after else None,
        "network": {"received": max(0, net_after["received"] - net_before["received"]) / elapsed, "sent": max(0, net_after["sent"] - net_before["sent"]) / elapsed, "interfaces": net_after["interfaces"]} if net_before and net_after else None,
        "uptime": time.time() - boot if boot else None,
    }


def media_usage(root: Path):
    extensions = {"audio": {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"}, "images": {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}}
    result = {key: {"count": 0, "bytes": 0} for key in extensions}
    result["incomplete"] = False
    def on_error(error):
        result["incomplete"] = True
    for directory, folders, files in os.walk(root, followlinks=False, onerror=on_error):
        folders[:] = [name for name in folders if not (Path(directory) / name).is_symlink()]
        for name in files:
            path = Path(directory) / name
            if path.is_symlink():
                continue
            kind = next((key for key, values in extensions.items() if path.suffix.lower() in values), None)
            if kind:
                try:
                    info = path.stat(follow_symlinks=False)
                except OSError:
                    result["incomplete"] = True
                    continue
                if not stat.S_ISREG(info.st_mode):
                    continue
                result[kind]["count"] += 1
                result[kind]["bytes"] += info.st_size
    return result
