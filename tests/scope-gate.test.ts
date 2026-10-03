import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkScope } from "@/lib/scope/gate";

const FIXTURES = path.resolve(import.meta.dirname, "fixtures");

function read(relative: string): string {
  return readFileSync(path.join(FIXTURES, relative), "utf8");
}

function txtFiles(dir: string): string[] {
  return readdirSync(path.join(FIXTURES, dir))
    .filter((name) => name.endsWith(".txt"))
    .map((name) => (dir ? `${dir}/${name}` : name));
}

describe("checkScope rejects out-of-scope documents", () => {
  const cases: Array<[string, "lease" | "terms-of-service"]> = [
    ["scope/residential-lease.txt", "lease"],
    ["scope/commercial-lease.txt", "lease"],
    ["scope/terms-of-service.txt", "terms-of-service"],
  ];
  for (const [file, kind] of cases) {
    it(`rejects ${file} as ${kind}`, () => {
      expect(checkScope(read(file))).toEqual({ ok: false, kind });
    });
  }
});

describe("checkScope passes in-scope contracts", () => {
  const inScope = [
    ...txtFiles(""),
    ...txtFiles("pairs"),
    "scope/statement-of-work.txt",
  ];

  it("finds the existing contract fixtures", () => {
    expect(inScope).toContain("adhesion-contract.txt");
    expect(inScope).toContain("clean-contract.txt");
    expect(inScope.filter((f) => f.startsWith("pairs/")).length).toBeGreaterThan(0);
  });

  for (const file of inScope) {
    it(`passes ${file}`, () => {
      expect(checkScope(read(file))).toEqual({ ok: true });
    });
  }
});

describe("checkScope edge cases", () => {
  it("passes a freelance agreement to build a landlord's website", () => {
    const text = `FREELANCE WEB DESIGN AGREEMENT
This agreement is between Oakridge Rentals, a residential landlord ("Client"), and Sam Lee, a freelancer ("Contractor").
1. Services. Contractor will design and build a website where the landlord's tenants can pay rent, request repairs and read their lease agreement online.
2. Deliverables. Contractor will deliver a homepage, a tenant portal, a rent payment page and a maintenance request form.
3. Fees. Client will pay Contractor $6,000. Contractor will invoice Client on delivery, and Client will pay each invoice within 30 days.
4. Ownership. On full payment the Client owns the deliverables.
5. Independent Contractor. Contractor is an independent contractor, not an employee of the Client.`;
    expect(checkScope(text)).toEqual({ ok: true });
  });

  it("passes a contractor agreement that requires the contractor to write an app's terms of service", () => {
    const text = `CONSULTING AGREEMENT
Client engages Consultant as an independent contractor to draft the terms of service and privacy policy for Client's app.
Deliverables: a terms of service document and a privacy policy, each reviewed with Client.
Consultant will invoice Client monthly. Client will pay each invoice within 15 days.
Client owns the deliverables on payment. Consultant may terminate on 14 days' notice.`;
    expect(checkScope(text)).toEqual({ ok: true });
  });

  it("is case-insensitive and matches whole words only", () => {
    const shouted = read("scope/residential-lease.txt").toUpperCase();
    expect(checkScope(shouted)).toEqual({ ok: false, kind: "lease" });
    // "current", "parent" and "rental" contain "rent" but are not the word "rent".
    const lookalikes = "current parent rental ".repeat(50);
    expect(checkScope(lookalikes)).toEqual({ ok: true });
  });

  it("passes empty text (other checks handle empty documents)", () => {
    expect(checkScope("")).toEqual({ ok: true });
  });
});
