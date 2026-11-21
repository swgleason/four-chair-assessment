import { describe, expect, it, vi } from "vitest";
import handler, { processNextStepsSubmission } from "./send-next-steps";

describe("processNextStepsSubmission", () => {
  const dummyEnv = {
    SUPABASE_URL: "https://test-project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    RESEND_API_KEY: "re_test_key_123",
    NEXT_STEPS_FROM_EMAIL: "OCUPC <test@ocupc.com>",
  };

  it("returns 200 without sending email when honeypot website is filled", async () => {
    const fetchSpy = vi.fn();
    const result = await processNextStepsSubmission(
      {
        chair: 1,
        senderName: "Bot",
        senderEmail: "bot@example.com",
        message: "Spam link",
        website: "https://spam.com",
      },
      dummyEnv,
      fetchSpy as any,
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates required fields and returns 400 for invalid inputs", async () => {
    const fetchSpy = vi.fn();

    // Invalid chair
    const r1 = await processNextStepsSubmission(
      {
        chair: 0,
        senderName: "Name",
        senderEmail: "test@example.com",
        message: "Message",
      },
      dummyEnv,
      fetchSpy as any,
    );
    expect(r1.status).toBe(400);

    // Missing/whitespace name
    const r2 = await processNextStepsSubmission(
      {
        chair: 1,
        senderName: "   ",
        senderEmail: "test@example.com",
        message: "Message",
      },
      dummyEnv,
      fetchSpy as any,
    );
    expect(r2.status).toBe(400);

    // Invalid email
    const r3 = await processNextStepsSubmission(
      {
        chair: 1,
        senderName: "Name",
        senderEmail: "invalid-email",
        message: "Message",
      },
      dummyEnv,
      fetchSpy as any,
    );
    expect(r3.status).toBe(400);

    // Empty message
    const r4 = await processNextStepsSubmission(
      {
        chair: 1,
        senderName: "Name",
        senderEmail: "test@example.com",
        message: "",
      },
      dummyEnv,
      fetchSpy as any,
    );
    expect(r4.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 503 if Supabase server credentials are missing", async () => {
    const result = await processNextStepsSubmission(
      {
        chair: 2,
        senderName: "Jane",
        senderEmail: "jane@example.com",
        message: "Hello",
      },
      {}, // empty env
    );

    expect(result.status).toBe(503);
    expect(result.body.error).toContain("temporarily unconfigured");
  });

  it("returns 400 when no contact is configured or enabled for the chair", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const result = await processNextStepsSubmission(
      {
        chair: 3,
        senderName: "Jane",
        senderEmail: "jane@example.com",
        message: "Hello",
      },
      dummyEnv,
      mockFetch as any,
    );

    expect(result.status).toBe(400);
    expect(result.body.error).toContain("not currently configured");
  });

  it("successfully looks up chair contact and dispatches Resend email", async () => {
    let resendPayload: any = null;

    const mockFetch = vi.fn().mockImplementation((url: string, options: any) => {
      if (url.includes("chair_contacts")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                contact_name: "Pastor Dave",
                contact_email: "pastordave@ocupc.com",
                is_enabled: true,
              },
            ]),
        });
      }

      if (url.includes("api.resend.com")) {
        resendPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "resend_id_123" }),
        });
      }

      return Promise.reject(new Error("Unknown URL"));
    });

    const result = await processNextStepsSubmission(
      {
        chair: 2,
        senderName: "Sarah Connor",
        senderEmail: "sarah@example.com",
        message: "I want to join a discipleship group.",
      },
      dummyEnv,
      mockFetch as any,
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    expect(resendPayload).toBeDefined();
    expect(resendPayload.to).toEqual(["pastordave@ocupc.com"]);
    expect(resendPayload.reply_to).toBe("sarah@example.com");
    expect(resendPayload.subject).toContain("Chair 2 (The Believer)");
    expect(resendPayload.text).toContain("Sarah Connor");
    expect(resendPayload.text).toContain("I want to join a discipleship group.");
  });
});

describe("Vercel Serverless Function Handler", () => {
  it("rejects non-POST HTTP methods", async () => {
    const req = {
      method: "GET",
    };
    const res = {
      statusCode: 200,
      jsonPayload: null as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonPayload = data;
        return this;
      },
    };

    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
