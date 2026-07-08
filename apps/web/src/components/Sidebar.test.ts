import { describe, expect, it } from "vitest";
import { visibleSectionsForRole } from "./Sidebar.js";

describe("Sidebar role navigation", () => {
  it("shows every workspace section to admins", () => {
    expect(visibleSectionsForRole("ADMIN")).toEqual([
      "candidates",
      "blacklist",
      "jobs",
      "sync",
      "processes",
      "reports",
      "settings"
    ]);
  });

  it("hides admin-only settings from managers", () => {
    expect(visibleSectionsForRole("MANAGER")).toEqual([
      "candidates",
      "blacklist",
      "jobs",
      "sync",
      "processes",
      "reports"
    ]);
    expect(visibleSectionsForRole("MANAGER")).not.toContain("settings");
  });

  it("keeps recruiter navigation focused on daily CRM work", () => {
    expect(visibleSectionsForRole("RECRUITER")).toEqual([
      "candidates",
      "blacklist",
      "jobs"
    ]);
  });

  it("shows only read-only workspace sections to viewers", () => {
    expect(visibleSectionsForRole("VIEWER")).toEqual([
      "candidates",
      "blacklist",
      "jobs",
      "reports"
    ]);
    expect(visibleSectionsForRole("VIEWER")).not.toContain("sync");
    expect(visibleSectionsForRole("VIEWER")).not.toContain("settings");
  });
});
