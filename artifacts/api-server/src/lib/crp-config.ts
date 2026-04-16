import fs from "fs";
import path from "path";

export interface CRPOverrides {
  softwareVersion: string | null;
  lastReleasedAt: string | null;
}

const CONFIG_FILE = path.resolve(process.cwd(), "crp-override.json");

const HARDCODED_DEFAULTS: CRPOverrides = {
  softwareVersion: "v1.3.1278",
  lastReleasedAt: "2026-04-16T00:00:00.000Z",
};

function readFromFile(): Partial<CRPOverrides> | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(raw) as Partial<CRPOverrides>;
    }
  } catch {
  }
  return null;
}

let _overrides: CRPOverrides | null = null;

function load(): CRPOverrides {
  const fromFile = readFromFile();
  if (fromFile) {
    return {
      softwareVersion: fromFile.softwareVersion ?? process.env.CRP_SOFTWARE_VERSION ?? HARDCODED_DEFAULTS.softwareVersion,
      lastReleasedAt: fromFile.lastReleasedAt ?? process.env.CRP_LAST_RELEASED_AT ?? HARDCODED_DEFAULTS.lastReleasedAt,
    };
  }
  return {
    softwareVersion: process.env.CRP_SOFTWARE_VERSION ?? HARDCODED_DEFAULTS.softwareVersion,
    lastReleasedAt: process.env.CRP_LAST_RELEASED_AT ?? HARDCODED_DEFAULTS.lastReleasedAt,
  };
}

export function getCRPOverrides(): CRPOverrides {
  if (!_overrides) {
    _overrides = load();
  }
  return _overrides;
}

export function updateCRPOverrides(updates: Partial<CRPOverrides>): CRPOverrides {
  const current = getCRPOverrides();
  _overrides = {
    softwareVersion: updates.softwareVersion !== undefined ? updates.softwareVersion : current.softwareVersion,
    lastReleasedAt: updates.lastReleasedAt !== undefined ? updates.lastReleasedAt : current.lastReleasedAt,
  };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(_overrides, null, 2), "utf8");
  } catch {
  }
  return _overrides;
}

export function reloadCRPOverrides(): CRPOverrides {
  _overrides = load();
  return _overrides;
}
