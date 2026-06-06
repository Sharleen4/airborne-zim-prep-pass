import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Daily scheduled job:
// For every active SchoolHomework whose due date is today, tomorrow, or overdue (≤ 3 days),
// find class students who have NOT submitted, then email & SMS their parents.
// De-duplicates by hashing homeworkId + studentEmail + due_date so each parent
// only gets one reminder per pending exercise per day.

const APP_URL = "https://zamaaiprimary.online/";
const APP_NAME = "Zama AI Primary";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStr) {
  const due = new Date(dateStr + "T23:59:59");
  const now = new Date();
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

function reminderKey(homeworkId, studentEmail) {
  return `homework_reminder:${homeworkId}:${studentEmail}:${todayStr()}`;
}

function buildEmailHtml({ parent_name, child_name, items }) {
  const rows = items.map(i => {
    const urgency = i.days_left < 0
      ? `<span style="color:#dc2626;font-weight:bold">OVERDUE</span>`
      : i.days_left === 0
        ? `<span style="color:#d97706;font-weight:bold">Due today</span>`
        : `<span style="color:#0369a1;font-weight:bold">Due in ${i.days_left} day(s)</span>`;
    return `<tr>
      <td style="padding:10px;border-bottom:1px solid #eee">
        <strong>${i.title}</strong><br/>
        <span style="color:#666;font-size:13px">${i.class_name || ""}${i.subject ? " · " + i.subject : ""}</span>
      </td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${urgency}<br/><span style="color:#999;font-size:12px">${i.due_date}</span></td>
    </tr>`;
  }).join("");

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;border-radius:12px;text-align:center;margin-bottom:20px">
      <h1 style="color:white;margin:0;font-size:22px">Homework Reminder 📚</h1>
    </div>
    <p>Hi <strong>${parent_name || "there"}</strong>,</p>
    <p><strong>${child_name}</strong> has <strong>${items.length}</strong> exercise(s) that still need to be completed:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden">
      ${rows}
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}school-homework" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open Exercises →</a>
    </div>
    <p style="color:#666;font-size:13px">Tip: even 15 minutes of focused work today makes a big difference.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
    <p style="color:#999;font-size:12px;text-align:center">© ${new Date().getFullYear()} ${APP_NAME}</p>
  </div>`;
}

function buildSmsBody({ child_name, items }) {
  const top = items.slice(0, 2).map(i =>
    `${i.title} (${i.days_left < 0 ? "OVERDUE" : i.days_left === 0 ? "due today" : "due in " + i.days_left + "d"})`
  ).join("; ");
  const more = items.length > 2 ? ` +${items.length - 2} more` : "";
  return `Zama: ${child_name} has ${items.length} pending exercise(s): ${top}${more}. Open: ${APP_URL}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow manual admin trigger; scheduled invocations come with service token (no auth user)
    let isManual = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role !== "admin") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        isManual = true;
      }
    } catch { /* scheduled run — no user */ }

    const today = todayStr();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 3);
    const horizonStr = horizon.toISOString().slice(0, 10);
    const overdueFloor = new Date();
    overdueFloor.setDate(overdueFloor.getDate() - 3);
    const overdueFloorStr = overdueFloor.toISOString().slice(0, 10);

    // 1. Get every active exercise whose due_date is within [today-3d, today+3d]
    const allActive = await base44.asServiceRole.entities.SchoolHomework
      .filter({ is_active: true }, "-due_date", 500);
    const dueSoon = allActive.filter(h => h.due_date >= overdueFloorStr && h.due_date <= horizonStr);
    if (dueSoon.length === 0) {
      return Response.json({ success: true, exercises_checked: 0, parents_notified: 0 });
    }

    // 2. Group by class so we fetch students once per class
    const classIds = [...new Set(dueSoon.map(h => h.class_id).filter(Boolean))];
    const classMap = {};
    const studentsByClass = {};
    for (const classId of classIds) {
      const [cls, students] = await Promise.all([
        base44.asServiceRole.entities.SchoolClass.filter({ id: classId }, "-created_date", 1).then(l => l[0]).catch(() => null),
        base44.asServiceRole.entities.StudentProfile.filter({ class_id: classId, is_active: true }, "-created_date", 200).catch(() => []),
      ]);
      classMap[classId] = cls;
      studentsByClass[classId] = students;
    }

    // 3. Build per-parent reminder buckets
    const buckets = new Map(); // parent_email -> { parent_name, items: [{...}], child_name }

    for (const hw of dueSoon) {
      const cls = classMap[hw.class_id];
      const students = studentsByClass[hw.class_id] || [];
      if (students.length === 0) continue;

      // Pull submissions for this homework in one go
      const subs = await base44.asServiceRole.entities.HomeworkSubmission
        .filter({ homework_id: hw.id }, "-created_date", 500).catch(() => []);
      const submittedEmails = new Set(subs.filter(s => s.status && s.status !== "pending").map(s => s.student_email));

      for (const stu of students) {
        const stuEmail = stu.user_email || stu.parent_email;
        if (!stuEmail) continue;
        if (submittedEmails.has(stuEmail)) continue;
        if (!stu.parent_email) continue;

        const key = stu.parent_email;
        if (!buckets.has(key)) {
          buckets.set(key, {
            parent_email: stu.parent_email,
            parent_name: "",
            child_name: stu.full_name || "your child",
            items: [],
          });
        }
        buckets.get(key).items.push({
          homework_id: hw.id,
          student_email: stuEmail,
          title: hw.title,
          due_date: hw.due_date,
          days_left: daysBetween(hw.due_date),
          class_name: cls?.name || "",
          subject: "",
        });
      }
    }

    // 4. Send notifications, deduping via NotificationLog (created today with the same key)
    let parents_notified = 0;
    let emails_skipped = 0;

    for (const bucket of buckets.values()) {
      // Skip parents who already received a reminder today for the exact same set
      const todayLogs = await base44.asServiceRole.entities.NotificationLog
        .filter({ recipient_email: bucket.parent_email, notification_type: "homework_reminder" }, "-created_date", 50)
        .catch(() => []);
      const sentTodayKeys = new Set(
        todayLogs
          .filter(l => (l.sent_date || l.created_date || "").slice(0, 10) === today)
          .map(l => l.dedupe_key)
          .filter(Boolean)
      );

      // Only include items not already sent today
      const freshItems = bucket.items.filter(i => !sentTodayKeys.has(reminderKey(i.homework_id, i.student_email)));
      if (freshItems.length === 0) { emails_skipped++; continue; }

      // Try to enrich parent name
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: bucket.parent_email }, "-created_date", 1);
        bucket.parent_name = users[0]?.full_name || "";
      } catch { /* ignore */ }

      const subject = freshItems.length === 1
        ? `Reminder: ${bucket.child_name} has homework due`
        : `Reminder: ${bucket.child_name} has ${freshItems.length} pending exercises`;

      // Email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: bucket.parent_email,
          subject,
          body: buildEmailHtml({ parent_name: bucket.parent_name, child_name: bucket.child_name, items: freshItems }),
          from_name: APP_NAME,
        });
      } catch (e) {
        console.warn("email failed", bucket.parent_email, e.message);
      }

      // SMS (best-effort: lookup phone on ParentProfile)
      try {
        const parents = await base44.asServiceRole.entities.ParentProfile
          .filter({ user_email: bucket.parent_email }, "-created_date", 1).catch(() => []);
        const phone = parents[0]?.phone;
        if (phone) {
          await base44.asServiceRole.functions.invoke("sendSMS", {
            to: phone,
            message: buildSmsBody({ child_name: bucket.child_name, items: freshItems }),
          }).catch(e => console.warn("sms failed", e.message));
        }
      } catch (e) {
        console.warn("sms lookup failed", e.message);
      }

      // Log each item so future runs dedupe
      for (const i of freshItems) {
        await base44.asServiceRole.entities.NotificationLog.create({
          recipient_email: bucket.parent_email,
          notification_type: "homework_reminder",
          dedupe_key: reminderKey(i.homework_id, i.student_email),
          subject,
          sent_date: new Date().toISOString(),
          status: "sent",
          description: `${bucket.child_name}: ${i.title} (${i.due_date})`,
        }).catch(e => console.warn("log failed", e.message));
      }

      parents_notified++;
    }

    return Response.json({
      success: true,
      manual: isManual,
      exercises_checked: dueSoon.length,
      parents_notified,
      parents_skipped_already_sent: emails_skipped,
    });
  } catch (err) {
    console.error("sendHomeworkReminders error:", err.message, err.stack);
    return Response.json({ error: err.message }, { status: 500 });
  }
});