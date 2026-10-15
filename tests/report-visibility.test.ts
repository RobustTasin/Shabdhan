import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../server/config/database", () => ({

  pool: {

    query: vi.fn(),

  },

}));


vi.mock("../server/config/cloudinary", () => ({
  cloudinary: {
    uploader: {
      upload: vi.fn(),
      destroy: vi.fn(),
    },
  },
}));

import app from "../server/app";
import { pool } from "../server/config/database";

const queryMock = vi.mocked(pool.query);

const REPORT_ID = "report-test-001";
const OWNER_ID = "owner-test-001";
const MODERATOR_ID = "moderator-test-001";
const REGULAR_USER_ID = "regular-user-test-001";
const INACTIVE_USER_ID = "inactive-user-test-001";
const SECRET = "shabdhan-test-only-secret";

const publishedReport = {
  id: REPORT_ID,
  title: "Published report",
  description: "Public description",
  status: "PUBLISHED",
  verification_status: "VERIFIED",
  reporter_id: OWNER_ID,
  reporter: {
    id: OWNER_ID,
    username: "report-owner",
    is_verified: false,
  },
};

const draftReport = {
  ...publishedReport,
  title: "Private draft",
  status: "DRAFT",
  verification_status: "PENDING",
};

const users: Record<string, Record<string, unknown>> = {
  [OWNER_ID]: {
    id: OWNER_ID,
    username: "report-owner",
    role: "USER",
    is_active: true,
  },
  [MODERATOR_ID]: {
    id: MODERATOR_ID,
    username: "moderator",
    role: "MODERATOR",
    is_active: true,
  },
  [REGULAR_USER_ID]: {
    id: REGULAR_USER_ID,
    username: "regular-user",
    role: "USER",
    is_active: true,
  },
  [INACTIVE_USER_ID]: {
    id: INACTIVE_USER_ID,
    username: "inactive-user",
    role: "USER",
    is_active: false,
  },
};

function tokenFor(id: string) {
  return jwt.sign({ id }, SECRET);
}

function configureDatabase(report: typeof publishedReport) {
  queryMock.mockImplementation((async (sql: unknown, values?: unknown[]) => {
    const text = String(sql);
    const params = values ?? [];

    if (text.includes("FROM users") && text.includes("WHERE id = $1")) {
      const user = users[String(params[0])];
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 } as never;
    }

    if (text.includes("FROM reports r") && text.includes("JOIN users u")) {
      const requestedId = params[0];
      const userId = params[1];
      const isModerator = params[2] === true;

      const visible =
        report.id === requestedId &&
        (
          (report.status === "PUBLISHED" &&
            report.verification_status === "VERIFIED") ||
          report.reporter_id === userId ||
          isModerator
        );

      return {
        rows: visible ? [{ ...report }] : [],
        rowCount: visible ? 1 : 0,
      } as never;
    }

    throw new Error(`Unexpected database query in test: ${text}`);
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/reports/:id visibility", () => {
  it("allows anonymous access to published, verified reports", async () => {
    configureDatabase(publishedReport);

    const response = await request(app).get(`/api/reports/${REPORT_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.report.title).toBe("Published report");
    expect(response.body.report).not.toHaveProperty("reporter_id");
  });

  it("does not expose a draft to anonymous visitors", async () => {
    configureDatabase(draftReport);

    const response = await request(app).get(`/api/reports/${REPORT_ID}`);

    expect(response.status).toBe(404);
  });

  it("allows the owner to view their own draft", async () => {
    configureDatabase(draftReport);

    const response = await request(app)
      .get(`/api/reports/${REPORT_ID}`)
      .set("Authorization", `Bearer ${tokenFor(OWNER_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body.report.title).toBe("Private draft");
    expect(response.body.report).not.toHaveProperty("reporter_id");
  });

  it("allows a moderator to view a draft", async () => {
    configureDatabase(draftReport);

    const response = await request(app)
      .get(`/api/reports/${REPORT_ID}`)
      .set("Authorization", `Bearer ${tokenFor(MODERATOR_ID)}`);

    expect(response.status).toBe(200);
  });

  it("rejects an invalid bearer token", async () => {
    configureDatabase(publishedReport);

    const response = await request(app)
      .get(`/api/reports/${REPORT_ID}`)
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });

  it("rejects inactive accounts", async () => {
    configureDatabase(draftReport);

    const response = await request(app)
      .get(`/api/reports/${REPORT_ID}`)
      .set("Authorization", `Bearer ${tokenFor(INACTIVE_USER_ID)}`);

    expect(response.status).toBe(403);
  });

  it("does not trust an ADMIN role claim absent from the database role", async () => {
    configureDatabase(draftReport);
    const forgedToken = jwt.sign(
      { id: REGULAR_USER_ID, role: "ADMIN" },
      SECRET
    );

    const response = await request(app)
      .get(`/api/reports/${REPORT_ID}`)
      .set("Authorization", `Bearer ${forgedToken}`);

    expect(response.status).toBe(404);
  });

  it("returns 404 for a report that does not exist", async () => {
    configureDatabase(publishedReport);

    const response = await request(app)
      .get("/api/reports/nonexistent-report");

    expect(response.status).toBe(404);
  });
});
