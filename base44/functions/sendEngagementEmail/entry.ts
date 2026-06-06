import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = "https://zamaaiprimary.online/";
const APP_NAME = "Zama AI Primary";

const DEFAULT_TEMPLATES = {
  welcome: {
    subject: "Welcome to Zama AI Primary, {{parent_name}}! 🎉",
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">Welcome to Zama AI Primary! 🎓</h1>
      </div>
      <p>Hi <strong>{{parent_name}}</strong>,</p>
      <p>We're thrilled to have <strong>{{child_name}}</strong> join our learning platform! Your 14-day free trial has started.</p>
      <p>Here's what you can do right now:</p>
      <ul>
        <li>📚 Explore Grade 7 topics and study notes</li>
        <li>🧠 Take practice quizzes and mock exams</li>
        <li>📊 Track your child's progress in real-time</li>
        <li>📝 Assign homework directly from the parent dashboard</li>
      </ul>
      <div style="text-align:center;margin:30px 0">
        <a href="${APP_URL}" style="background:#6366f1;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Start Learning Now →</a>
      </div>
      <p style="color:#666;font-size:13px">Questions? Simply reply to this email — we're here to help!</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
      <p style="color:#999;font-size:12px;text-align:center">© ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}" style="color:#6366f1">Visit our website</a></p>
    </div>`,
  },
  weekly_summary: {
    subject: "{{child_name}}'s Weekly Learning Summary 📊",
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:30px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">Weekly Progress Report 📈</h1>
      </div>
      <p>Hi <strong>{{parent_name}}</strong>,</p>
      <p>Here's how <strong>{{child_name}}</strong> performed this week on Zama AI Primary.</p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #6366f1">
        <p style="margin:0;font-size:15px">Keep encouraging {{child_name}} to study every day — consistency is the key to exam success! 💪</p>
      </div>
      <div style="text-align:center;margin:30px 0">
        <a href="${APP_URL}" style="background:#6366f1;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">View Full Progress →</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
      <p style="color:#999;font-size:12px;text-align:center">© ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}" style="color:#6366f1">zamaaiprimary.online</a></p>
    </div>`,
  },
  inactivity_alert: {
    subject: "We miss {{child_name}}! Time to get back on track 📚",
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">Don't lose your streak! ⏰</h1>
      </div>
      <p>Hi <strong>{{parent_name}}</strong>,</p>
      <p>We noticed <strong>{{child_name}}</strong> hasn't logged in for a few days. Regular practice is the fastest path to exam success!</p>
      <p>Even just <strong>15 minutes a day</strong> can make a huge difference in Grade 7 preparation.</p>
      <div style="text-align:center;margin:30px 0">
        <a href="${APP_URL}" style="background:#f59e0b;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Resume Studying Now →</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
      <p style="color:#999;font-size:12px;text-align:center">© ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}" style="color:#6366f1">zamaaiprimary.online</a></p>
    </div>`,
  },
  trial_expiry_reminder: {
    subject: "⚠️ {{child_name}}'s free trial ends in {{trial_days_remaining}} day(s)",
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:30px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">Trial Ending Soon ⏳</h1>
      </div>
      <p>Hi <strong>{{parent_name}}</strong>,</p>
      <p><strong>{{child_name}}</strong>'s free trial expires in <strong>{{trial_days_remaining}} day(s)</strong>. Don't let their learning momentum stop!</p>
      <p>Subscribe now to keep full access to:</p>
      <ul>
        <li>✅ All Grade 4–7 study notes and topics</li>
        <li>✅ Unlimited practice quizzes and mock exams</li>
        <li>✅ Parent dashboard and progress tracking</li>
        <li>✅ Homework assignment tools</li>
      </ul>
      <div style="text-align:center;margin:30px 0">
        <a href="{{payment_link}}" style="background:#ef4444;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Subscribe Now →</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
      <p style="color:#999;font-size:12px;text-align:center">© ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}" style="color:#6366f1">zamaaiprimary.online</a></p>
    </div>`,
  },
  improvement_praise: {
    subject: "🌟 {{child_name}} is improving — great news!",
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">Amazing Progress! 🌟</h1>
      </div>
      <p>Hi <strong>{{parent_name}}</strong>,</p>
      <p>We have great news! <strong>{{child_name}}</strong> just scored <strong>{{score}}%</strong> on <strong>{{subject}} — {{topic}}</strong>. That's a significant improvement!</p>
      <p>Keep encouraging them — every session builds confidence for the big exam. 🎯</p>
      <div style="text-align:center;margin:30px 0">
        <a href="${APP_URL}" style="background:#6366f1;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">See Full Progress →</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
      <p style="color:#999;font-size:12px;text-align:center">© ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}" style="color:#6366f1">zamaaiprimary.online</a></p>
    </div>`,
  },
  payment_confirmation: {
    subject: "✅ Payment Confirmed — Welcome to Zama AI Primary!",
    body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:30px;border-radius:12px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:24px">Payment Confirmed ✅</h1>
      </div>
      <p>Hi <strong>{{parent_name}}</strong>,</p>
      <p>Thank you! Your subscription payment has been received and <strong>{{child_name}}</strong>'s account is now fully active.</p>
      <p>You now have full access to all learning materials. Let's ace that Grade 7 exam! 🎓</p>
      <div style="text-align:center;margin:30px 0">
        <a href="${APP_URL}" style="background:#22c55e;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Start Learning →</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
      <p style="color:#999;font-size:12px;text-align:center">© ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}" style="color:#6366f1">zamaaiprimary.online</a></p>
    </div>`,
  },
};

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, val || "");
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      email_type,
      recipient_email,
      parent_name = "",
      child_name = "",
      subject: subjectOverride,
      score = "",
      subject: emailSubject = "",
      topic = "",
      trial_days_remaining = "",
      payment_link = `${APP_URL}payment`,
    } = body;

    if (!email_type || !recipient_email) {
      return Response.json({ error: "email_type and recipient_email are required" }, { status: 400 });
    }

    // Check monthly email limit: max 8 emails per user per month
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthStart = new Date(year, month - 1, 1).toISOString();
    const monthEnd = new Date(year, month, 1).toISOString();

    const existingLogs = await base44.asServiceRole.entities.EmailLog.filter({ recipient_email });
    const thisMonthLogs = existingLogs.filter(l =>
      l.sent_date && l.sent_date >= monthStart && l.sent_date < monthEnd && l.status === "sent"
    );

    if (thisMonthLogs.length >= 8) {
      console.log(`Email limit reached for ${recipient_email} this month (${thisMonthLogs.length}/8). Skipping.`);
      return Response.json({ skipped: true, reason: "monthly_limit_reached", count: thisMonthLogs.length });
    }

    // Fetch template from DB, fallback to defaults
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ template_type: email_type, is_active: true });
    const dbTemplate = templates[0];
    const defaultTemplate = DEFAULT_TEMPLATES[email_type];

    if (!dbTemplate && !defaultTemplate) {
      return Response.json({ error: `No template found for type: ${email_type}` }, { status: 400 });
    }

    const vars = {
      parent_name,
      child_name,
      score,
      subject: emailSubject,
      topic,
      trial_days_remaining,
      payment_link,
    };

    const rawSubject = dbTemplate?.subject || defaultTemplate.subject;
    const rawBody = dbTemplate?.body_html || defaultTemplate.body_html;
    const finalSubject = fillTemplate(rawSubject, vars);
    const finalBody = fillTemplate(rawBody, vars);

    // Send email
    let status = "sent";
    let error_message = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient_email,
        subject: finalSubject,
        body: finalBody,
        from_name: APP_NAME,
      });
    } catch (e) {
      status = "failed";
      error_message = e.message;
      console.error("Email send failed:", e.message);
    }

    // Log it
    await base44.asServiceRole.entities.EmailLog.create({
      recipient_email,
      parent_name,
      email_type,
      subject: finalSubject,
      sent_date: now.toISOString(),
      status,
      error_message,
    });

    return Response.json({ success: status === "sent", status, monthly_count: thisMonthLogs.length + 1 });
  } catch (err) {
    console.error("sendEngagementEmail error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});