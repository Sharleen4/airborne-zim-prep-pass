import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get Science and Technology subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: "Science and Technology" });
    if (!subjects.length) {
      return Response.json({ error: 'Science and Technology subject not found' }, { status: 404 });
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
        topicName: "Health and Hygiene Practices",
        overview: "Health and hygiene practices help prevent diseases and promote wellbeing. The respiratory system helps the body breathe by taking in oxygen and removing carbon dioxide. The main parts are the nose, trachea, lungs and diaphragm. The nose filters air while the lungs exchange gases.",
        key_concepts: "Respiratory Diseases:\n• Asthma\n• Bronchitis\n• Tuberculosis\n\nFood Safety:\n• Cleanliness\n• Separation of raw and cooked foods\n• Proper cooking\n• Refrigeration\n\nChronic Diseases:\n• Hypertension\n• Diabetes\n• Cancer\n\nEpidemic Diseases:\n• Cholera\n• Malaria\n• Influenza\n• COVID-19",
        important_facts: "• Hygiene prevents disease\n• Food safety protects health\n• Pollution damages lungs\n• Chronic diseases can be managed\n• Air pollution causes breathing problems\n• Vaccination prevents epidemics\n• Chronic diseases caused by poor diet and lack of exercise",
        exam_tips: "Know causes, prevention and examples of diseases."
      },
      {
        topicName: "Food and Nutrition",
        overview: "Food provides nutrients needed for growth and energy. A balanced diet includes carbohydrates for energy, proteins for growth, fats for energy storage, vitamins for protection and minerals for body regulation.",
        key_concepts: "Nutrients and Functions:\n• Carbohydrates – energy\n• Proteins – growth\n• Fats – energy storage\n• Vitamins – protection\n• Minerals – body regulation\n\nFood Storage:\nTraditional: Granaries, Drying\nModern: Refrigeration, Freezing\n\nFood Preparation:\n• Must be hygienic\n• Prevents contamination",
        important_facts: "• Balanced diet is important\n• Poor storage causes food spoilage\n• Hygiene prevents food poisoning\n• Different nutrients have different functions\n• Food storage extends shelf life",
        exam_tips: "Know nutrients and their functions."
      },
      {
        topicName: "Crops, Plants and Animals",
        overview: "Plants are important because they provide food, medicine and oxygen. Photosynthesis is the process by which plants make food using sunlight, water and carbon dioxide. Plants store food as starch.",
        key_concepts: "Photosynthesis:\n• Uses sunlight, water and carbon dioxide\n• Produces food and oxygen\n\nUses of Plants:\n• Food\n• Medicine\n• Building materials\n• Oxygen production\n\nUses of Animals:\n• Food\n• Transport\n• Farming\n• Income",
        important_facts: "• Plants make food through photosynthesis\n• Animals provide resources\n• Plants support life\n• Plants produce oxygen\n• Food stored as starch",
        exam_tips: "Explain photosynthesis and uses of plants."
      },
      {
        topicName: "Environmental Awareness and Conservation",
        overview: "Environmental conservation protects natural resources. Climate change is caused by deforestation, pollution and burning fuels. Weathering is the breakdown of rocks into smaller pieces through physical, chemical and biological processes.",
        key_concepts: "Climate Change Causes:\n• Deforestation\n• Pollution\n• Burning fuels\n\nTypes of Weathering:\n• Physical – breaking by wind, water\n• Chemical – chemical breakdown\n• Biological – breakdown by organisms\n\nWater Scarcity:\n• Happens when water demand exceeds supply\n\nConservation Methods:\n• Tree planting\n• Water conservation\n• Recycling",
        important_facts: "• Climate change affects weather\n• Weathering forms soil\n• Conservation protects resources\n• Water scarcity is growing\n• Deforestation harms ecosystems",
        exam_tips: "Differentiate types of weathering."
      },
      {
        topicName: "Tools, Equipment and Implements",
        overview: "Tools and equipment make work easier. Farm implements include manual tools like hoes and shovels, animal-drawn tools like ploughs, and motorised equipment like tractors. Digital tools include databases used to store information.",
        key_concepts: "Types of Farm Implements:\nManual: Hoe, Rake, Shovel\nAnimal drawn: Plough, Harrow\nMotorised: Tractor, Harvester, Planter\n\nDatabase Terms:\n• Record – row\n• Field – column\n• Table – collection of data",
        important_facts: "• Tools improve productivity\n• Safety is important\n• Digital tools manage data\n• Different implements for different tasks\n• Technology increases efficiency",
        exam_tips: "Know types of farm implements."
      },
      {
        topicName: "Energy and Fuels",
        overview: "Energy is the ability to do work. Sources include renewable energy like solar and wind, and non-renewable energy like coal and petrol. Solar energy is clean and renewable while fossil fuels cause pollution and climate change.",
        key_concepts: "Energy Sources:\nRenewable:\n• Solar\n• Wind\n\nNon-renewable:\n• Coal\n• Petrol\n\nFuel Impacts:\n• Pollution\n• Climate change\n• Resource depletion",
        important_facts: "• Renewable energy is sustainable\n• Fossil fuels cause pollution\n• Solar energy is clean\n• Energy is needed for work\n• Wind energy is renewable",
        exam_tips: "Differentiate renewable vs non-renewable energy."
      },
      {
        topicName: "Disaster Risk Management and Resilience",
        overview: "A disaster is a serious event causing damage. Natural disasters include floods, droughts and earthquakes. Man-made disasters include fires and pollution. Resilience is the ability to recover from disasters.",
        key_concepts: "Types of Disasters:\nNatural: Floods, Droughts, Earthquakes\nMan-made: Fires, Pollution\n\nDisaster Response:\n• Rescue\n• First aid\n• Relief aid\n\nResilience:\n• Ability to recover from disasters\n• Community planning",
        important_facts: "• Disasters cause losses\n• Preparedness saves lives\n• Communities must plan responses\n• Both natural and man-made disasters exist\n• Resilience is important",
        exam_tips: "Define disaster and give examples."
      },
      {
        topicName: "Educational Technology and Innovation",
        overview: "Technology improves learning and problem solving. Artificial Intelligence (AI) allows computers to perform human-like tasks such as decision making and recognising speech. Coding is writing instructions for computers. Robotics involves designing robots.",
        key_concepts: "Artificial Intelligence:\n• Virtual assistants\n• Translation tools\n• Chatbots\n\nCoding:\n• Writing computer instructions\n• Building technology skills\n\nRobotics:\n• Uses engineering principles\n• Automation",
        important_facts: "• AI improves efficiency\n• Coding builds technology skills\n• Robotics uses engineering principles\n• Technology enables innovation\n• AI performs human-like tasks",
        exam_tips: "Define AI and coding."
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
      message: `Updated Science and Technology notes`,
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