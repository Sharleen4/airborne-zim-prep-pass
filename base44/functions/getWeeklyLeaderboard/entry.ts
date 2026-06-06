import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns the top students ranked by XP earned in the last 7 days.
// XP rules:
//   - 10 XP per completed StudySessionLog
//   - 1 XP per correct quiz answer (StudentResult.score)
// Only avatar + first name + grade are returned (privacy).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const cutoffISO = sevenDaysAgo.toISOString();
    const cutoffDate = cutoffISO.slice(0, 10); // YYYY-MM-DD

    // Pull all active child profiles (service role — global leaderboard)
    const children = await base44.asServiceRole.entities.ChildProfile.filter({ is_active: true }, '-created_date', 500);

    // Pull recent session logs and results in parallel
    const [allLogs, allResults] = await Promise.all([
      base44.asServiceRole.entities.StudySessionLog.filter(
        { completed_date: { $gte: cutoffDate } },
        '-created_date',
        2000
      ).catch(() => []),
      base44.asServiceRole.entities.StudentResult.filter(
        { created_date: { $gte: cutoffISO } },
        '-created_date',
        2000
      ).catch(() => []),
    ]);

    // Aggregate XP per child
    const xpByChild = new Map();

    for (const log of allLogs) {
      if (!log.child_id) continue;
      xpByChild.set(log.child_id, (xpByChild.get(log.child_id) || 0) + 10);
    }

    for (const r of allResults) {
      if (!r.child_id) continue;
      const correct = Number(r.score) || 0;
      if (correct > 0) {
        xpByChild.set(r.child_id, (xpByChild.get(r.child_id) || 0) + correct);
      }
    }

    // Build leaderboard rows
    const rows = children
      .map((c) => {
        const xp = xpByChild.get(c.id) || 0;
        const firstName = (c.child_name || '').trim().split(/\s+/)[0] || 'Student';
        return {
          child_id: c.id,
          first_name: firstName,
          avatar_emoji: c.avatar_emoji || '🧒',
          grade: c.grade,
          xp,
        };
      })
      .filter((r) => r.xp > 0)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 50)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    // Identify the current user's children for "you" highlighting
    const myChildren = await base44.entities.ChildProfile.filter({ parent_email: user.email }).catch(() => []);
    const myChildIds = new Set(myChildren.map((c) => c.id));
    let decorated = rows.map((r) => ({ ...r, is_me: myChildIds.has(r.child_id) }));

    // Seed with dummy students if there's not enough real activity yet.
    // They fade out automatically as real students earn more XP.
    if (decorated.length < 20) {
      const dummies = [
        { first_name: "Tendai",   avatar_emoji: "🦁", grade: "Grade 7", xp: 420, school: "Kuwadzana 7" },
        { first_name: "Rumbi",    avatar_emoji: "🌟", grade: "Grade 6", xp: 395, school: "David Livingstone School" },
        { first_name: "Tatenda",  avatar_emoji: "🐯", grade: "Grade 7", xp: 370, school: "Nettleton Primary School" },
        { first_name: "Chiedza",  avatar_emoji: "📚", grade: "Grade 5", xp: 340, school: "Avondale Primary School" },
        { first_name: "Farai",    avatar_emoji: "🎓", grade: "Grade 7", xp: 315, school: "Masaisai Primary School" },
        { first_name: "Nyasha",   avatar_emoji: "🐬", grade: "Grade 6", xp: 290, school: "Moffat Primary School" },
        { first_name: "Kuda",     avatar_emoji: "😊", grade: "Grade 4", xp: 265, school: "Prospect Primary School" },
        { first_name: "Anesu",    avatar_emoji: "👧", grade: "Grade 5", xp: 245, school: "Avonlea Primary School" },
        { first_name: "Tariro",   avatar_emoji: "🌸", grade: "Grade 6", xp: 225, school: "Budiriro 1 Primary School" },
        { first_name: "Munashe",  avatar_emoji: "⚽", grade: "Grade 7", xp: 205, school: "Budiriro 2 Primary School" },
        { first_name: "Rutendo",  avatar_emoji: "🦋", grade: "Grade 5", xp: 188, school: "Chengu Primary School" },
        { first_name: "Tinashe",  avatar_emoji: "🚀", grade: "Grade 6", xp: 172, school: "Chembira Primary School" },
        { first_name: "Vimbai",   avatar_emoji: "🎨", grade: "Grade 4", xp: 158, school: "Chiedza Primary School" },
        { first_name: "Simba",    avatar_emoji: "🦁", grade: "Grade 7", xp: 142, school: "Chipembere Primary School" },
        { first_name: "Mufaro",   avatar_emoji: "🌈", grade: "Grade 5", xp: 128, school: "Chirodzo Primary School" },
        { first_name: "Tanaka",   avatar_emoji: "🐘", grade: "Grade 6", xp: 115, school: "Chitsere Primary School" },
        { first_name: "Ropafadzo",avatar_emoji: "🌻", grade: "Grade 4", xp: 102, school: "Dzivarasekwa 4 Primary School" },
        { first_name: "Tafara",   avatar_emoji: "🐆", grade: "Grade 7", xp: 90,  school: "Glen View 8 Primary School" },
        { first_name: "Shamiso",  avatar_emoji: "💎", grade: "Grade 6", xp: 78,  school: "Gwinyai Primary School" },
        { first_name: "Panashe",  avatar_emoji: "🎯", grade: "Grade 5", xp: 65,  school: "Gwinyiro Primary School" },
      ].map((d, i) => ({
        child_id: `demo-${i}`,
        first_name: d.first_name,
        avatar_emoji: d.avatar_emoji,
        grade: d.grade,
        xp: d.xp,
        school: d.school,
        is_me: false,
        is_demo: true,
      }));

      decorated = [...decorated, ...dummies]
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 50)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    return Response.json({
      leaderboard: decorated,
      window_start: cutoffISO,
      generated_at: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});