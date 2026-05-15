import { describe, it, expect } from "vitest";
import { formatMoney, formatPrice, formatPercent, formatRelativeTime } from "./format";

describe("formatMoney", () => {
  it("returns em-dash for null/undefined", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });

  it("formats trillions", () => {
    expect(formatMoney(1_500_000_000_000)).toBe("$1.50T");
  });

  it("formats billions", () => {
    expect(formatMoney(2_300_000_000)).toBe("$2.30B");
  });

  it("formats millions", () => {
    expect(formatMoney(5_000_000)).toBe("$5.00M");
  });

  it("formats thousands", () => {
    expect(formatMoney(1_500)).toBe("$1.50K");
  });

  it("formats small amounts", () => {
    expect(formatMoney(42.5)).toBe("$42.50");
  });
});

describe("formatPrice", () => {
  it("returns em-dash for null/undefined", () => {
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice(undefined)).toBe("—");
  });

  it("formats prices >= 1000 without decimals", () => {
    expect(formatPrice(50000)).toBe("$50,000");
  });

  it("formats prices >= 1 with 2 decimals", () => {
    expect(formatPrice(42.5)).toBe("$42.50");
  });

  it("formats prices >= 0.01 with 4 decimals", () => {
    expect(formatPrice(0.1234)).toBe("$0.1234");
  });

  it("formats sub-cent prices with 6 decimals", () => {
    expect(formatPrice(0.00123456)).toBe("$0.001235");
  });
});

describe("formatPercent", () => {
  it("returns em-dash for null/undefined", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });

  it("adds plus sign for positive", () => {
    expect(formatPercent(5.5)).toBe("+5.50%");
  });

  it("keeps minus sign for negative", () => {
    expect(formatPercent(-3.2)).toBe("-3.20%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });
});

describe("formatRelativeTime", () => {
  it("returns em-dash for null/undefined", () => {
    expect(formatRelativeTime(null)).toBe("—");
    expect(formatRelativeTime(undefined)).toBe("—");
  });

  it("returns 'just now' for future dates", () => {
    const future = new Date(Date.now() + 1000).toISOString();
    expect(formatRelativeTime(future)).toBe("just now");
  });

  it("returns 'today' for less than 1 day", () => {
    const recent = new Date(Date.now() - 12 * 3600_000).toISOString();
    expect(formatRelativeTime(recent)).toBe("today");
  });

  it("returns '1 day ago' for ~1 day", () => {
    const oneDay = new Date(Date.now() - 24 * 3600_000).toISOString();
    expect(formatRelativeTime(oneDay)).toBe("1 day ago");
  });

  it("returns 'X days ago' for < 30 days", () => {
    const fiveDays = new Date(Date.now() - 5 * 24 * 3600_000).toISOString();
    expect(formatRelativeTime(fiveDays)).toBe("5 days ago");
  });
});
