import { Router, type IRouter, Request, Response } from "express";
import { getCRPOverrides, updateCRPOverrides } from "../lib/crp-config";

const router: IRouter = Router();

function checkAdminKey(req: Request, res: Response): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(403).json({ error: "forbidden", message: "Admin API is not enabled. Set ADMIN_API_KEY to enable it." });
    return false;
  }
  const provided = req.headers["x-admin-key"];
  if (!provided || provided !== adminKey) {
    res.status(403).json({ error: "forbidden", message: "Invalid or missing x-admin-key header." });
    return false;
  }
  return true;
}

router.get("/admin/crp/version", (req: Request, res: Response): void => {
  if (!checkAdminKey(req, res)) return;
  res.json(getCRPOverrides());
});

router.patch("/admin/crp/version", (req: Request, res: Response): void => {
  if (!checkAdminKey(req, res)) return;

  const { softwareVersion, lastReleasedAt } = req.body as Record<string, unknown>;

  const updates: { softwareVersion?: string | null; lastReleasedAt?: string | null } = {};

  if (softwareVersion !== undefined) {
    if (softwareVersion !== null && typeof softwareVersion !== "string") {
      res.status(400).json({ error: "bad_request", message: "softwareVersion must be a string or null." });
      return;
    }
    updates.softwareVersion = softwareVersion as string | null;
  }

  if (lastReleasedAt !== undefined) {
    if (lastReleasedAt !== null && typeof lastReleasedAt !== "string") {
      res.status(400).json({ error: "bad_request", message: "lastReleasedAt must be a string or null." });
      return;
    }
    updates.lastReleasedAt = lastReleasedAt as string | null;
  }

  const updated = updateCRPOverrides(updates);
  res.json(updated);
});

export default router;
