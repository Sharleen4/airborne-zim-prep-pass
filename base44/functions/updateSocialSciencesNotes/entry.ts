import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get Social Science subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: "Social Science" });
    if (!subjects.length) {
      return Response.json({ error: 'Social Science subject not found' }, { status: 404 });
    }
    const subjectId = subjects[0].id;

    // Get all topics
    const allTopics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId });
    const topicMap = {};
    allTopics.forEach(t => {
      topicMap[t.name] = t.id;
    });

    const notesData = [
      {
        topicName: "Identity",
        overview: "Identity is who a person is and is influenced by family, culture, religion and community. Family relationships help shape behaviour and values. A good marriage is built on love, trust, respect, honesty and communication.",
        key_concepts: "Conflict Resolution Methods:\n• Dialogue\n• Counselling\n• Respect\n• Mediation\n• Family meetings",
        important_facts: "• Identity is shaped by family and society\n• Good marriages require respect and communication\n• Conflict causes include stress and money problems\n• Conflict can lead to divorce or separation\n• Family conflicts may be caused by financial problems, poor communication, unfaithfulness and substance abuse",
        exam_tips: "Define identity and explain causes and effects of family conflict."
      },
      {
        topicName: "National History and Governance",
        overview: "Zimbabwe gained independence on 18 April 1980 after the liberation struggle. Sovereignty means self-rule without foreign control. Zimbabwe has three arms of government: Executive (President and Cabinet), Legislature (Parliament), and Judiciary (Courts).",
        key_concepts: "Arms of Government:\n• Executive - President and Cabinet\n• Legislature - Parliament\n• Judiciary - Courts\n\nInternational Participation:\n• Member of SADC\n• Member of United Nations",
        important_facts: "• Independence brought self-governance\n• Government ensures law and order\n• Zimbabwe participates in global cooperation\n• Independence date: 18 April 1980",
        exam_tips: "Know independence date and functions of government."
      },
      {
        topicName: "Heritage",
        overview: "Heritage is what we inherit from the past. It can be tangible (monuments, artefacts, cultural sites) or intangible (traditions, customs, language). Heritage preserves culture, promotes tourism, and builds national identity.",
        key_concepts: "Tangible Heritage:\n• Monuments\n• Artefacts\n• Cultural sites\n\nIntangible Heritage:\n• Traditions\n• Customs\n• Language\n\nFood Preservation:\nIndigenous: Sun drying, Smoking, Salting\nModern: Refrigeration, Canning, Freezing",
        important_facts: "• Heritage preserves culture\n• Heritage promotes tourism\n• Heritage builds national identity\n• Tangible heritage is physical\n• Intangible heritage is non-physical",
        exam_tips: "Differentiate tangible vs intangible heritage."
      },
      {
        topicName: "Work and Leisure",
        overview: "Work provides income and improves living standards. Human capital development involves education and skills training. Self-reliance means depending on one's own skills. Tourism is travel for leisure or business and contributes to the economy.",
        key_concepts: "Leisure Activities:\n• Sports\n• Music\n• Reading\n• Travelling\n\nHuman Capital Development:\n• Education\n• Skills training\n• Self-reliance",
        important_facts: "• Work creates wealth\n• Skills development improves employment\n• Tourism creates jobs\n• Self-reliance is important\n• Leisure improves wellbeing",
        exam_tips: "Explain importance of tourism in Zimbabwe."
      },
      {
        topicName: "Transport and Communication",
        overview: "Transport moves people and goods using road, rail, air and water. Communication involves sharing information through phones, internet, letters and radio. Road safety reduces accidents.",
        key_concepts: "Types of Transport:\n• Road\n• Rail\n• Air\n• Water\n\nCommunication Methods:\n• Phones\n• Internet\n• Letters\n• Radio\n\nAccident Prevention:\n• Following road signs\n• Using seat belts\n• Avoiding alcohol",
        important_facts: "• Causes of accidents: Speeding, Drunk driving, Poor roads, Carelessness\n• Road safety reduces accidents\n• Transport is essential for economy\n• Communication shares information\n• Prevention saves lives",
        exam_tips: "Explain transport importance and accident prevention."
      },
      {
        topicName: "Shelter",
        overview: "Shelter protects people from weather and danger. Types include traditional huts, modern houses and flats. Settlement is influenced by water availability, employment, climate and transport.",
        key_concepts: "Types of Shelter:\n• Traditional huts\n• Modern houses\n• Flats\n\nFactors Affecting Settlement:\n• Water availability\n• Employment\n• Climate\n• Transport\n\nHousing Solutions:\n• Government housing programs\n• Rural development\n• New building technologies",
        important_facts: "• Housing shortages exist\n• High costs limit housing\n• Urbanisation affects settlement\n• Shelter is a basic need\n• Government programs help",
        exam_tips: "State factors influencing settlement."
      },
      {
        topicName: "Global Issues",
        overview: "Global issues affect many countries. Desertification is land becoming dry due to deforestation, overgrazing, climate change and poor farming. Effects include hunger, poverty and migration.",
        key_concepts: "Desertification Causes:\n• Deforestation\n• Overgrazing\n• Climate change\n• Poor farming\n\nSolutions:\n• Tree planting\n• Conservation farming\n• Irrigation",
        important_facts: "• Desertification causes hunger\n• Poor farming contributes to desertification\n• Tree planting helps conservation\n• Climate change affects desertification\n• Migration results from desertification",
        exam_tips: "Explain causes and solutions of desertification."
      },
      {
        topicName: "Managing Change",
        overview: "Puberty is the stage when children become adults. Physical changes include body growth and voice changes. Emotional changes include mood changes and attraction. Social changes bring new responsibilities.",
        key_concepts: "Coping Strategies:\n• Guidance from parents\n• Hygiene\n• Education\n• Counselling\n\nTypes of Changes:\nPhysical: Body growth, Voice changes\nEmotional: Mood changes, Attraction\nSocial: New responsibilities",
        important_facts: "• Puberty brings physical changes\n• Emotional changes occur during puberty\n• Social changes create new responsibilities\n• Guidance helps cope with change\n• Education supports development",
        exam_tips: "Identify physical and emotional changes."
      },
      {
        topicName: "Social Etiquette",
        overview: "Social etiquette is acceptable behaviour in society. Examples include respect, politeness and good communication. Workplace behaviour includes punctuality, respect and teamwork.",
        key_concepts: "Communication Skills:\n• Listening\n• Speaking clearly\n• Confidence\n\nWorkplace Behaviour:\n• Punctuality\n• Respect\n• Teamwork\n\nSocial Examples:\n• Respect\n• Politeness\n• Good communication",
        important_facts: "• Respect is essential\n• Good communication matters\n• Punctuality shows responsibility\n• Teamwork improves productivity\n• Listening is important",
        exam_tips: "Explain importance of good manners."
      },
      {
        topicName: "Rights and Responsibilities",
        overview: "Rights are freedoms people have. Responsibilities are duties people must do. Examples of rights include education, protection and health. Consumer rights include safe products, information and choice.",
        key_concepts: "Examples of Rights:\n• Education\n• Protection\n• Health\n\nResponsibilities:\n• Obey laws\n• Respect others\n• Protect property\n\nConsumer Rights:\n• Safe products\n• Information\n• Choice\n\nGender Equity:\n• Equal opportunities for males and females",
        important_facts: "• Rights and responsibilities go together\n• Consumer rights protect people\n• Gender equity is important\n• Laws protect rights\n• Everyone has responsibilities",
        exam_tips: "Differentiate rights and responsibilities."
      },
      {
        topicName: "Health",
        overview: "Health is physical, mental and social wellbeing. Communicable diseases include cholera, TB and HIV. Non-communicable diseases include diabetes and cancer. Prevention includes hygiene, vaccination and healthy diet.",
        key_concepts: "First Aid Examples:\n• Cleaning wounds\n• Bandaging\n\nPrevention Methods:\n• Hygiene\n• Vaccination\n• Healthy diet\n\nDiseases:\nCommunicable: Cholera, TB, HIV\nNon-communicable: Diabetes, Cancer",
        important_facts: "• Health has three dimensions\n• Hygiene prevents disease\n• Vaccination protects people\n• First aid is immediate help\n• Diet affects health",
        exam_tips: "Explain disease prevention methods."
      },
      {
        topicName: "Career Guidance and Financial Literacy",
        overview: "Career guidance helps learners choose professions. Study skills include time management, note taking and revision. Financial literacy involves saving, budgeting and spending wisely.",
        key_concepts: "Study Skills:\n• Time management\n• Note taking\n• Revision\n\nFinancial Literacy:\n• Saving\n• Budgeting\n• Spending wisely\n\nCareer Choice Factors:\n• Interests\n• Skills\n• Education\n• Opportunities",
        important_facts: "• Career planning is important\n• Study skills improve results\n• Financial literacy is essential\n• Interests guide career choice\n• Skills determine success",
        exam_tips: "Explain importance of career planning."
      },
      {
        topicName: "Religion",
        overview: "Religion involves belief in a supreme being. Major religions include Christianity, Islam, Judaism and African Traditional Religion. Religion provides moral guidance, social unity and peace promotion.",
        key_concepts: "Major Religions:\n• Christianity\n• Islam\n• Judaism\n• African Traditional Religion\n\nImportance of Religion:\n• Moral guidance\n• Social unity\n• Peace promotion",
        important_facts: "• Religion guides morality\n• Different religions coexist\n• Religion promotes peace\n• Beliefs shape values\n• Religion builds community",
        exam_tips: "State differences between religions."
      },
      {
        topicName: "Social Services and Volunteerism",
        overview: "Social services help vulnerable people. Examples include hospitals, schools and orphanages. Volunteerism is helping without payment and benefits include community development and skills development.",
        key_concepts: "Social Services Examples:\n• Hospitals\n• Schools\n• Orphanages\n\nHumanitarian Organisations:\n• Red Cross\n• UNICEF\n\nVolunteerism Benefits:\n• Community development\n• Skills development\n• Helping vulnerable groups",
        important_facts: "• Volunteerism helps communities\n• Social services are important\n• Organisations support vulnerable people\n• Skills develop through volunteering\n• Communities benefit from service",
        exam_tips: "Explain importance of volunteerism."
      }
    ];

    let updated = 0;
    const errors = [];

    for (const noteData of notesData) {
      const topicId = topicMap[noteData.topicName];
      if (!topicId) {
        errors.push(`Topic not found: ${noteData.topicName}`);
        continue;
      }

      // Get or create note for this topic
      const existing = await base44.asServiceRole.entities.Note.filter({ topic_id: topicId });
      
      if (existing.length > 0) {
        // Update existing note
        await base44.asServiceRole.entities.Note.update(existing[0].id, {
          overview: noteData.overview,
          key_concepts: noteData.key_concepts,
          important_facts: noteData.important_facts,
          exam_tips: noteData.exam_tips,
          is_ai_generated: false
        });
      } else {
        // Create new note
        await base44.asServiceRole.entities.Note.create({
          topic_id: topicId,
          subject_id: subjectId,
          overview: noteData.overview,
          key_definitions: "",
          key_concepts: noteData.key_concepts,
          zimbabwe_examples: "",
          important_facts: noteData.important_facts,
          common_mistakes: "",
          summary: "",
          exam_tips: noteData.exam_tips,
          is_ai_generated: false
        });
      }
      updated++;
    }

    return Response.json({
      success: true,
      message: `Updated Social Sciences notes`,
      stats: {
        updated,
        errors: errors.length > 0 ? errors : null
      }
    });
  } catch (error) {
    console.error("Update error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});