import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const transactionQuery = vi.hoisted(() => vi.fn());

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

vi.mock("../server/utils/transaction", () => ({
  withTransaction: vi.fn(
    async (work: (client: { query: typeof transactionQuery }) => Promise<unknown>) =>
      work({ query: transactionQuery })
  ),
}));

vi.mock("../server/utils/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../server/utils/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import app from "../server/app";
import { pool } from "../server/config/database";
import { createNotification } from "../server/utils/notifications";

const queryMock = vi.mocked(pool.query);

const REPORT_ID = "report-review-test";
const MODERATOR_ID = "moderator-review-test";
const USER_ID = "user-review-test";
const SECRET = "shabdhan-test-only-secret";

function tokenFor(id: string) {
  return jwt.sign({ id }, SECRET);
}

function configureUser(role: "MODERATOR" | "USER") {
  queryMock.mockImplementation((async (sql: unknown, values?: unknown[]) => {
    const text = String(sql);
    if (text.includes("FROM users") && text.includes("WHERE id = $1")) {
      const user = {
        id: values?.[0],
        username: role === "MODERATOR" ? "moderator" : "regular-user",
        role,
        is_active: true,
      };
      return { rows: [user], rowCount: 1 } as never;
    }

    if (text.includes("SELECT") && text.includes("reporter_id") && text.includes("FROM reports")) {
      return {
        rows: [{ reporter_id: USER_ID, title: "Test report" }],
        rowCount: 1,
      } as never;
    }

    if (text.includes("SELECT") && text.includes("FROM reports") && text.includes("WHERE id = $1")) {
      return {
        rows: [{ id: REPORT_ID, verification_status: "PENDING" }],
        rowCount: 1,
      } as never;
    }

    throw new Error(`Unexpected database query: ${text}`);
  }) as never);

  transactionQuery.mockImplementation(async (sql: unknown) => {
    const text = String(sql);
    if (text.includes("FOR UPDATE")) {
      return { rows: [{ status: "DRAFT", verification_status: "PENDING" }], rowCount: 1 };
    }
    if (text.includes("UPDATE reports")) {
      return {
        rows: [{
          id: REPORT_ID,
          reporter_id: USER_ID,
          title: "Test report",
          status: "PUBLISHED",
          verification_status: "VERIFIED",
          published_at: "2026-10-16T00:00:00.000Z",
          updated_at: "2026-10-16T00:00:00.000Z",
        }],
        rowCount: 1,
      };
    }
    throw new Error(`Unexpected transaction query: ${text}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/reports/:id/verify", () => {
  it("lets a moderator verify a report and notifies its reporter", async () => {
    configureUser("MODERATOR");

    const response = await request(app)
      .patch(`/api/reports/${REPORT_ID}/verify`)
      .set("Authorization", `Bearer ${tokenFor(MODERATOR_ID)}`)
      .send({ verification_status: "VERIFIED" });

    expect(response.status).toBe(200);
    expect(response.body.report.verification_status).toBe("VERIFIED");
    expect(response.body.report.status).toBe("PUBLISHED");
    expect(response.body.report.published_at).toBeTruthy();
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        type: "REPORT_VERIFIED",
        entityId: REPORT_ID,
        message: 'Your report "Test report" is now verified.',
      })
    );
  });

  it("rejects report review by a regular user", async () => {
    configureUser("USER");

    const response = await request(app)
      .patch(`/api/reports/${REPORT_ID}/verify`)
      .set("Authorization", `Bearer ${tokenFor(USER_ID)}`)
      .send({ verification_status: "VERIFIED" });

    expect(response.status).toBe(403);
    expect(transactionQuery).not.toHaveBeenCalled();
  });

  it("rejects unsupported verification statuses", async () => {
    configureUser("MODERATOR");

    const response = await request(app)
      .patch(`/api/reports/${REPORT_ID}/verify`)
      .set("Authorization", `Bearer ${tokenFor(MODERATOR_ID)}`)
      .send({ verification_status: "APPROVED" });

    expect(response.status).toBe(400);
    expect(transactionQuery).not.toHaveBeenCalled();
  });
});
