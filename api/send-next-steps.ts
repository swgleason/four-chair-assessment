declare const process: { env: Record<string, string | undefined> };

const CHAIR_STAGES: Record<number, string> = {
  1: "The Seeker",
  2: "The Believer",
  3: "The Worker",
  4: "Disciple-Maker",
};

export interface NextStepsRequestBody {
  chair?: number;
  senderName?: string;
  senderEmail?: string;
  message?: string;
  website?: string; // Honeypot field
  company?: string; // Honeypot alias
}

export interface ProcessResult {
  status: number;
  body: {
    ok: boolean;
    error?: string;
  };
}

function isValidEmail(email: unknown): boolean {
  return (
    typeof email === "string" &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

export async function processNextStepsSubmission(
  payload: NextStepsRequestBody,
  env: Record<string, string | undefined> = process.env,
  fetchFn: typeof fetch = fetch,
): Promise<ProcessResult> {
  // 1. Honeypot check: If non-empty, silently succeed without sending email
  if (
    (typeof payload.website === "string" && payload.website.trim().length > 0) ||
    (typeof payload.company === "string" && payload.company.trim().length > 0)
  ) {
    return { status: 200, body: { ok: true } };
  }

  // 2. Validate input fields
  const chair = Number(payload.chair);
  if (![1, 2, 3, 4].includes(chair)) {
    return {
      status: 400,
      body: { ok: false, error: "Valid chair number (1-4) is required." },
    };
  }

  const senderName = payload.senderName?.trim();
  if (!senderName || senderName.length > 100) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Name is required and must be under 100 characters.",
      },
    };
  }

  const senderEmail = payload.senderEmail?.trim();
  if (!senderEmail || !isValidEmail(senderEmail) || senderEmail.length > 254) {
    return {
      status: 400,
      body: { ok: false, error: "A valid email address is required." },
    };
  }

  const message = payload.message?.trim();
  if (!message || message.length > 3000) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Message is required and must be under 3000 characters.",
      },
    };
  }

  // 3. Server environment variables
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      status: 503,
      body: {
        ok: false,
        error: "Next steps service is temporarily unconfigured.",
      },
    };
  }

  // 4. Look up configured chair contact from Supabase REST API
  let contactEmail: string | null = null;
  let contactName: string | null = null;

  try {
    const contactUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/chair_contacts?chair=eq.${chair}&is_enabled=eq.true&select=chair,contact_name,contact_email,is_enabled`;
    const dbRes = await fetchFn(contactUrl, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    });

    if (!dbRes.ok) {
      return {
        status: 503,
        body: {
          ok: false,
          error: "Unable to retrieve chair contact information.",
        },
      };
    }

    const contacts = (await dbRes.json()) as Array<{
      contact_name: string | null;
      contact_email: string;
      is_enabled: boolean;
    }>;

    if (!Array.isArray(contacts) || contacts.length === 0 || !contacts[0].contact_email) {
      return {
        status: 400,
        body: {
          ok: false,
          error: "Next-steps outreach is not currently configured for this chair.",
        },
      };
    }

    contactEmail = contacts[0].contact_email;
    contactName = contacts[0].contact_name;
  } catch {
    return {
      status: 503,
      body: {
        ok: false,
        error: "Failed to connect to contact service.",
      },
    };
  }

  // 5. Send email via Resend
  const resendApiKey = env.RESEND_API_KEY;
  if (!resendApiKey) {
    return {
      status: 503,
      body: {
        ok: false,
        error: "Email delivery service is currently unconfigured.",
      },
    };
  }

  const fromEmail =
    env.NEXT_STEPS_FROM_EMAIL || "OCUPC Four Chairs <onboarding@resend.dev>";
  const stageLabel = CHAIR_STAGES[chair] || `Chair ${chair}`;
  const subject = `[Four Chairs] Next Steps: Chair ${chair} (${stageLabel}) - ${senderName}`;

  const greeting = contactName ? `Hello ${contactName},` : "Hello,";
  const textBody = `${greeting}

A participant has completed the Four Chair Assessment and sent a request regarding their next steps.

---
Participant Details:
Name: ${senderName}
Email: ${senderEmail}
Assessment Result: Chair ${chair} (${stageLabel})

Message from Participant:
${message}
---

You can reply directly to this email to get in touch with ${senderName}.
`;

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #252a28; line-height: 1.6;">
  <p style="font-size: 16px;">${greeting}</p>
  <p style="font-size: 16px;">A participant has completed the <strong>Four Chair Assessment</strong> and requested encouragement or guidance on their next steps.</p>
  
  <div style="background-color: #f5f3ee; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border: 1px solid #b7c0ba;">
    <h3 style="margin-top: 0; color: #385e55; font-size: 18px;">Participant Details</h3>
    <p style="margin: 6px 0;"><strong>Name:</strong> ${senderName}</p>
    <p style="margin: 6px 0;"><strong>Email:</strong> <a href="mailto:${senderEmail}" style="color: #385e55;">${senderEmail}</a></p>
    <p style="margin: 6px 0;"><strong>Result:</strong> Chair ${chair} (${stageLabel})</p>
  </div>

  <div style="background-color: #ffffff; border-left: 4px solid #385e55; padding: 16px 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
    <h4 style="margin-top: 0; color: #545d59;">Message:</h4>
    <p style="white-space: pre-wrap; margin: 0; font-size: 15px;">${message}</p>
  </div>

  <p style="font-size: 14px; color: #545d59; margin-top: 24px;">You can reply directly to this email to connect with ${senderName}.</p>
</div>
`;

  try {
    const resendRes = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [contactEmail],
        reply_to: senderEmail,
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", errText);
      return {
        status: 502,
        body: { ok: false, error: "Failed to dispatch email notification." },
      };
    }

    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error("Resend fetch error:", err);
    return {
      status: 502,
      body: { ok: false, error: "Error communicating with email service." },
    };
  }
}

// Default export supporting both Vercel Web Standard and Node.js Serverless Function signatures
export default async function handler(req: any, res?: any) {
  // If invoked with Web Standard Request (req instanceof Request or has .json())
  if (typeof req.json === "function" || (typeof Request !== "undefined" && req instanceof Request)) {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      const result = await processNextStepsSubmission(body);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // If invoked with Node.js req/res signature
  if (res && typeof res.status === "function") {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const result = await processNextStepsSubmission(body);
      return res.status(result.status).json(result.body);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }
  }

  return { status: 500, body: { ok: false, error: "Unsupported runtime" } };
}
