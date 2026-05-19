import type { FairLaunchCoin } from "@workspace/api-client-react";

export type SortField = "rank" | "price" | "volume24h" | "change30d" | "launchYear" | "stakingApy" | "softwareVersion" | "lastReleasedAt" | "activeNodes";
export type SortDir = "asc" | "desc";

export const MOBILE_SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "price", label: "Price" },
  { field: "volume24h", label: "24h Vol" },
  { field: "change30d", label: "30D %" },
  { field: "activeNodes", label: "Nodes" },
  { field: "stakingApy", label: "Yield" },
  { field: "launchYear", label: "Year" },
  { field: "lastReleasedAt", label: "Release" },
];

export function sortCoins(coins: FairLaunchCoin[], field: SortField, dir: SortDir): FairLaunchCoin[] {
  return [...coins].sort((a, b) => {
    if (field === "softwareVersion") {
      const aStr = a.softwareVersion ?? "";
      const bStr = b.softwareVersion ?? "";
      return dir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }
    let aVal: number;
    let bVal: number;
    switch (field) {
      case "rank": aVal = a.rank; bVal = b.rank; break;
      case "price": aVal = a.price ?? -Infinity; bVal = b.price ?? -Infinity; break;
      case "volume24h": aVal = a.volume24h ?? -Infinity; bVal = b.volume24h ?? -Infinity; break;
      case "change30d": aVal = a.change30d ?? -Infinity; bVal = b.change30d ?? -Infinity; break;
      case "launchYear": aVal = a.launchYear; bVal = b.launchYear; break;
      case "stakingApy": aVal = a.stakingApy ?? -Infinity; bVal = b.stakingApy ?? -Infinity; break;
      case "lastReleasedAt": {
        const aTs = a.lastReleasedAt ? new Date(a.lastReleasedAt).getTime() : -Infinity;
        const bTs = b.lastReleasedAt ? new Date(b.lastReleasedAt).getTime() : -Infinity;
        aVal = aTs; bVal = bTs; break;
      }
      case "activeNodes": aVal = a.activeNodes ?? -Infinity; bVal = b.activeNodes ?? -Infinity; break;
      default: aVal = a.rank; bVal = b.rank;
    }
    return dir === "asc" ? aVal - bVal : bVal - aVal;
  });
}
