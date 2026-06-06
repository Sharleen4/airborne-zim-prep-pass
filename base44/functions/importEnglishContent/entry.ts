import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get English subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: "English" });
    if (!subjects.length) {
      return Response.json({ error: 'English subject not found' }, { status: 404 });
    }
    const subjectId = subjects[0].id;

    const topicsData = [
      {
        name: "Understand Passages and Answer Questions",
        order: 1,
        learning_objectives: "Read comprehension passages and answer questions about them",
        overview: "A comprehension passage is a piece of writing that you read carefully and then answer questions about. You need to understand what you read and find the right information.",
        key_concepts: "How to answer comprehension questions:\n• Read the passage twice\n• Underline important information\n• Read the question carefully\n• Find the answer in the passage\n• Write the answer in your own words\n\nTypes of questions:\n• Who, What, Where, When, Why, How\n• True or False\n• Find the meaning of words",
        important_facts: "• Always read the passage before reading the questions\n• The answer is always in the passage\n• Use words from the passage in your answer\n• Answer in full sentences",
        exam_tips: "Read the passage slowly and carefully. Underline key words in both the question and the passage.",
        questions: [
          {
            comprehension_passage: "Chipo woke up very early on Monday morning. She had a big Mathematics test at school. She ate her sadza and vegetables quickly, packed her bag and walked to school. When she arrived, she sat quietly and revised her notes. Her teacher, Mrs Moyo, gave out the test papers. Chipo answered all the questions carefully. At the end of the day, Mrs Moyo said Chipo got the highest mark in the class.",
            question_text: "Why did Chipo wake up early on Monday morning?",
            options: [{ label: "A", text: "She wanted to eat breakfast" }, { label: "B", text: "She had a Mathematics test at school" }, { label: "C", text: "She wanted to walk slowly to school" }, { label: "D", text: "Her teacher called her early" }],
            correct_answer: "B",
            explanation: "The passage says she had a big Mathematics test at school.",
            difficulty: "Easy"
          },
          {
            comprehension_passage: "Chipo woke up very early on Monday morning. She had a big Mathematics test at school. She ate her sadza and vegetables quickly, packed her bag and walked to school. When she arrived, she sat quietly and revised her notes. Her teacher, Mrs Moyo, gave out the test papers. Chipo answered all the questions carefully. At the end of the day, Mrs Moyo said Chipo got the highest mark in the class.",
            question_text: "What did Chipo do when she arrived at school?",
            options: [{ label: "A", text: "She played with her friends" }, { label: "B", text: "She ate her breakfast" }, { label: "C", text: "She sat quietly and revised her notes" }, { label: "D", text: "She talked to Mrs Moyo" }],
            correct_answer: "C",
            explanation: "The passage says she sat quietly and revised her notes.",
            difficulty: "Easy"
          },
          {
            comprehension_passage: "The Victoria Falls is one of the most beautiful waterfalls in the world. It is found on the Zambezi River, on the border between Zimbabwe and Zambia. The local Shona people call it Mosi-oa-Tunya which means 'the smoke that thunders'. Every year, thousands of tourists visit the Falls. They come from many countries to see the water falling and hear the loud sound. The Falls is very important for Zimbabwe because it brings money to the country through tourism.",
            question_text: "What does 'Mosi-oa-Tunya' mean?",
            options: [{ label: "A", text: "The water that falls" }, { label: "B", text: "The smoke that thunders" }, { label: "C", text: "The beautiful river" }, { label: "D", text: "The border of Zimbabwe" }],
            correct_answer: "B",
            explanation: "The passage clearly states Mosi-oa-Tunya means 'the smoke that thunders'.",
            difficulty: "Easy"
          },
          {
            comprehension_passage: "The Victoria Falls is one of the most beautiful waterfalls in the world. It is found on the Zambezi River, on the border between Zimbabwe and Zambia. The local Shona people call it Mosi-oa-Tunya which means 'the smoke that thunders'. Every year, thousands of tourists visit the Falls. They come from many countries to see the water falling and hear the loud sound. The Falls is very important for Zimbabwe because it brings money to the country through tourism.",
            question_text: "Why is the Victoria Falls important for Zimbabwe?",
            options: [{ label: "A", text: "It provides drinking water" }, { label: "B", text: "It is on the border with Zambia" }, { label: "C", text: "It brings money through tourism" }, { label: "D", text: "It is called Mosi-oa-Tunya" }],
            correct_answer: "C",
            explanation: "The passage says it brings money to the country through tourism.",
            difficulty: "Standard"
          },
          {
            comprehension_passage: "Tafara was a young farmer who lived near Masvingo. He grew maize, tomatoes and onions on his small farm. Every morning he woke up before sunrise to water his plants. He worked very hard even when it was very hot. His neighbours admired his garden because it was always green and full of vegetables. Tafara sold his vegetables at the local market every Saturday. He used the money to pay his children's school fees.",
            question_text: "What did Tafara do with the money he earned from selling vegetables?",
            options: [{ label: "A", text: "He bought more seeds" }, { label: "B", text: "He paid his children's school fees" }, { label: "C", text: "He bought a new farm" }, { label: "D", text: "He gave it to his neighbours" }],
            correct_answer: "B",
            explanation: "The passage says he used the money to pay his children's school fees.",
            difficulty: "Easy"
          },
          {
            comprehension_passage: "Tafara was a young farmer who lived near Masvingo. He grew maize, tomatoes and onions on his small farm. Every morning he woke up before sunrise to water his plants. He worked very hard even when it was very hot. His neighbours admired his garden because it was always green and full of vegetables. Tafara sold his vegetables at the local market every Saturday. He used the money to pay his children's school fees.",
            question_text: "Which word in the passage means 'respected and looked up to'?",
            options: [{ label: "A", text: "Earned" }, { label: "B", text: "Admired" }, { label: "C", text: "Planted" }, { label: "D", text: "Watered" }],
            correct_answer: "B",
            explanation: "Admired means to respect or look up to someone or something.",
            difficulty: "Standard"
          },
          {
            comprehension_passage: "Schools in Zimbabwe help children to read, write and count. Every child between six and fifteen years old must go to school. Schools start early in the morning and finish in the afternoon. Children learn many subjects like Mathematics, English, Science and Social Studies. Teachers work hard to help pupils learn. Good education helps people get better jobs and live better lives.",
            question_text: "At what age must children in Zimbabwe go to school?",
            options: [{ label: "A", text: "Between five and twelve" }, { label: "B", text: "Between six and fifteen" }, { label: "C", text: "Between seven and sixteen" }, { label: "D", text: "Between eight and fourteen" }],
            correct_answer: "B",
            explanation: "The passage says every child between six and fifteen years old must go to school.",
            difficulty: "Easy"
          },
          {
            comprehension_passage: "Schools in Zimbabwe help children to read, write and count. Every child between six and fifteen years old must go to school. Schools start early in the morning and finish in the afternoon. Children learn many subjects like Mathematics, English, Science and Social Studies. Teachers work hard to help pupils learn. Good education helps people get better jobs and live better lives.",
            question_text: "According to the passage, what does good education help people do?",
            options: [{ label: "A", text: "Start their own farms" }, { label: "B", text: "Learn Mathematics only" }, { label: "C", text: "Get better jobs and live better lives" }, { label: "D", text: "Become teachers" }],
            correct_answer: "C",
            explanation: "The passage directly states good education helps people get better jobs and live better lives.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Write Concise Summaries",
        order: 2,
        learning_objectives: "Identify main ideas and write short, clear summaries",
        overview: "A summary is a short piece of writing that gives the main ideas of a longer text. A good summary is short and includes only the most important information.",
        key_concepts: "Steps to write a summary:\n1. Read the whole text carefully\n2. Find the main idea of each paragraph\n3. Write the main ideas in your own words\n4. Do not include small details\n5. Use short sentences\n\nA summary should be:\n• Short (about one third of the original)\n• In your own words\n• Include only important ideas\n• Written in one paragraph",
        important_facts: "• Do not copy word for word from the text\n• Leave out examples and small details\n• Write in the third person\n• Use present tense in summaries",
        exam_tips: "Read the passage twice. Ask yourself: What is the most important message? Write only that.",
        questions: [
          {
            question_text: "Which of the following is the best summary of a paragraph about how rain forms?",
            options: [{ label: "A", text: "Rain is water that falls from the sky. It falls on houses and roads." }, { label: "B", text: "Water evaporates from the earth, forms clouds and falls as rain." }, { label: "C", text: "People carry umbrellas when it rains. Rain can make roads slippery." }, { label: "D", text: "Clouds are white and fluffy. They float in the sky above us." }],
            correct_answer: "B",
            explanation: "Option B gives the main idea — the water cycle process — without unnecessary details.",
            difficulty: "Standard"
          },
          {
            question_text: "What should you NOT include in a summary?",
            options: [{ label: "A", text: "The main idea" }, { label: "B", text: "Small unimportant details and examples" }, { label: "C", text: "Key information" }, { label: "D", text: "The topic of the text" }],
            correct_answer: "B",
            explanation: "A summary should not include small details. It should only have the main, important information.",
            difficulty: "Easy"
          },
          {
            question_text: "A good summary should be written in ___.",
            options: [{ label: "A", text: "The exact words of the original text" }, { label: "B", text: "Your own words" }, { label: "C", text: "Bullet points only" }, { label: "D", text: "Questions and answers" }],
            correct_answer: "B",
            explanation: "A summary should be in your own words, not copied directly from the text.",
            difficulty: "Easy"
          },
          {
            question_text: "A summary of a 300-word passage should be approximately how long?",
            options: [{ label: "A", text: "300 words or more" }, { label: "B", text: "About 100 words" }, { label: "C", text: "Exactly 50 words" }, { label: "D", text: "Just one word" }],
            correct_answer: "B",
            explanation: "A summary is usually about one third the length of the original text.",
            difficulty: "Standard"
          },
          {
            question_text: "Which sentence is the BEST main idea for a passage about lions in Africa?",
            options: [{ label: "A", text: "Lions have sharp teeth and claws." }, { label: "B", text: "Lions are powerful animals that live in groups called prides in Africa." }, { label: "C", text: "A male lion has a big mane." }, { label: "D", text: "Lions sleep for many hours each day." }],
            correct_answer: "B",
            explanation: "Option B gives the most complete and important overview of lions rather than one small detail.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Write Stories with Structure",
        order: 3,
        learning_objectives: "Write creative stories with a clear beginning, middle and end",
        overview: "A story has three main parts: a beginning, a middle and an end. Good stories have interesting characters, a setting and a problem that is solved.",
        key_concepts: "Parts of a story:\n• Beginning: Introduce characters and setting\n• Middle: The problem or main events\n• End: How the problem is solved\n\nElements of a good story:\n• Characters (who is in the story)\n• Setting (where and when it happens)\n• Problem (what goes wrong)\n• Solution (how it is fixed)\n• Dialogue (what characters say)\n\nTips for interesting stories:\n• Start with an exciting opening line\n• Use describing words\n• Show feelings of characters\n• End in a satisfying way",
        important_facts: "• Every story needs a beginning, middle and end\n• Use paragraphs for each part\n• Make your characters interesting\n• Use dialogue to make the story lively",
        exam_tips: "Plan your story before writing. Write 3 bullet points — one for beginning, middle and end.",
        questions: [
          {
            question_text: "Which part of a story introduces the characters and setting?",
            options: [{ label: "A", text: "The middle" }, { label: "B", text: "The end" }, { label: "C", text: "The beginning" }, { label: "D", text: "The conclusion" }],
            correct_answer: "C",
            explanation: "The beginning of a story introduces the characters and the setting.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence is a good opening line for a story?",
            options: [{ label: "A", text: "One day there was a boy." }, { label: "B", text: "This story is about a dog." }, { label: "C", text: "Suddenly, the ground shook and Tindo dropped his bucket in shock." }, { label: "D", text: "The end was very good." }],
            correct_answer: "C",
            explanation: "Option C creates immediate excitement and makes the reader want to know what happens next.",
            difficulty: "Standard"
          },
          {
            question_text: "What is the 'setting' of a story?",
            options: [{ label: "A", text: "The problem in the story" }, { label: "B", text: "Where and when the story takes place" }, { label: "C", text: "What the characters eat" }, { label: "D", text: "How the story ends" }],
            correct_answer: "B",
            explanation: "The setting tells us where and when the story happens.",
            difficulty: "Easy"
          },
          {
            question_text: "In which part of the story is the problem usually solved?",
            options: [{ label: "A", text: "The beginning" }, { label: "B", text: "The title" }, { label: "C", text: "The middle" }, { label: "D", text: "The end" }],
            correct_answer: "D",
            explanation: "The end of the story is where the problem is resolved and the story is wrapped up.",
            difficulty: "Easy"
          },
          {
            question_text: "Why should a writer use dialogue in a story?",
            options: [{ label: "A", text: "To make the story longer" }, { label: "B", text: "To show what characters say and make the story lively" }, { label: "C", text: "Because teachers say so" }, { label: "D", text: "To avoid writing paragraphs" }],
            correct_answer: "B",
            explanation: "Dialogue shows what characters say and makes the story more interesting and realistic.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Describe People, Places and Events",
        order: 4,
        learning_objectives: "Use descriptive language to write vivid descriptions of people, places and events",
        overview: "Descriptive writing uses words to paint a picture in the reader's mind. Good descriptions use the five senses — sight, sound, smell, taste and touch.",
        key_concepts: "When describing a PERSON:\n• Appearance (how they look)\n• Personality (how they behave)\n• What they wear\n\nWhen describing a PLACE:\n• What you can see\n• What you can hear or smell\n• The size and atmosphere\n\nWhen describing an EVENT:\n• What happened\n• Who was there\n• What it looked, felt and sounded like\n\nUseful words: enormous, colourful, noisy, gentle, crowded, peaceful, sparkling",
        important_facts: "• Use adjectives to describe nouns\n• Use adverbs to describe actions\n• Use similes: as bright as the sun\n• Use all five senses",
        exam_tips: "Before writing, make a quick list of describing words you will use. Use at least 3 senses.",
        questions: [
          {
            question_text: "Which sentence uses the best descriptive language?",
            options: [{ label: "A", text: "The market was busy." }, { label: "B", text: "There were things at the market." }, { label: "C", text: "The colourful market buzzed with noise as vendors called out prices." }, { label: "D", text: "People went to the market to buy things." }],
            correct_answer: "C",
            explanation: "Option C uses descriptive adjectives and verbs to create a vivid picture.",
            difficulty: "Standard"
          },
          {
            question_text: "Which of the following is a simile?",
            options: [{ label: "A", text: "The boy ran quickly." }, { label: "B", text: "Her smile was as bright as sunshine." }, { label: "C", text: "He was a lion." }, { label: "D", text: "The flowers were beautiful." }],
            correct_answer: "B",
            explanation: "A simile compares two things using 'as' or 'like'. Option B uses 'as...as'.",
            difficulty: "Standard"
          },
          {
            question_text: "What do we call words that describe a noun?",
            options: [{ label: "A", text: "Verbs" }, { label: "B", text: "Adverbs" }, { label: "C", text: "Adjectives" }, { label: "D", text: "Prepositions" }],
            correct_answer: "C",
            explanation: "Adjectives are words that describe or give more information about a noun.",
            difficulty: "Easy"
          },
          {
            question_text: "How many senses should good descriptive writing use?",
            options: [{ label: "A", text: "Only sight" }, { label: "B", text: "Only sight and sound" }, { label: "C", text: "As many of the five senses as possible" }, { label: "D", text: "None — just facts" }],
            correct_answer: "C",
            explanation: "Good descriptive writing uses as many senses as possible — sight, sound, smell, taste and touch.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Write Friendly and Formal Letters",
        order: 5,
        learning_objectives: "Write correctly structured friendly and formal letters",
        overview: "There are two types of letters: friendly letters (to people you know) and formal letters (to people you do not know well, like a headmaster or company).",
        key_concepts: "FRIENDLY LETTER parts:\n• Your address (top right)\n• Date\n• Greeting: Dear [Name],\n• Body of the letter\n• Closing: Your friend, / Love,\n• Your name\n\nFORMAL LETTER parts:\n• Your address (top right)\n• Date\n• Receiver's address (left side)\n• Subject line\n• Greeting: Dear Sir/Madam,\n• Body of the letter\n• Closing: Yours faithfully,\n• Full name and signature\n\nKey differences:\n• Formal uses Sir/Madam, Yours faithfully\n• Friendly uses first name, Love/Your friend",
        important_facts: "• Always include the date in both types\n• Formal letters use 'Yours faithfully' if you don't know the name\n• Formal letters use 'Yours sincerely' if you know the name\n• Friendly letters end with 'Your friend' or 'Love'",
        exam_tips: "Remember: Faithfully = you don't know their name. Sincerely = you know their name.",
        questions: [
          {
            question_text: "How do you end a formal letter when you do NOT know the name of the person?",
            options: [{ label: "A", text: "Love," }, { label: "B", text: "Your friend," }, { label: "C", text: "Yours faithfully," }, { label: "D", text: "See you soon," }],
            correct_answer: "C",
            explanation: "'Yours faithfully' is used in a formal letter when you do not know the person's name.",
            difficulty: "Standard"
          },
          {
            question_text: "Which greeting is correct for a formal letter?",
            options: [{ label: "A", text: "Hey there," }, { label: "B", text: "Dear Sir/Madam," }, { label: "C", text: "Hello Friend," }, { label: "D", text: "Hi Boss," }],
            correct_answer: "B",
            explanation: "'Dear Sir/Madam' is the correct formal greeting in a letter.",
            difficulty: "Easy"
          },
          {
            question_text: "Where do you write YOUR address in a letter?",
            options: [{ label: "A", text: "At the bottom of the letter" }, { label: "B", text: "In the middle" }, { label: "C", text: "Top right corner" }, { label: "D", text: "On the envelope only" }],
            correct_answer: "C",
            explanation: "Your address is written at the top right corner of the letter.",
            difficulty: "Easy"
          },
          {
            question_text: "A pupil is writing a letter to a company asking for a job. Which type of letter is this?",
            options: [{ label: "A", text: "Friendly letter" }, { label: "B", text: "Story letter" }, { label: "C", text: "Formal letter" }, { label: "D", text: "Diary entry" }],
            correct_answer: "C",
            explanation: "Letters to companies or people you do not know well are formal letters.",
            difficulty: "Easy"
          },
          {
            question_text: "Which closing is correct for a friendly letter to your cousin?",
            options: [{ label: "A", text: "Yours faithfully," }, { label: "B", text: "Yours sincerely," }, { label: "C", text: "Your friend," }, { label: "D", text: "Dear," }],
            correct_answer: "C",
            explanation: "'Your friend' or 'Love' are appropriate closings for a friendly letter.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Write Factual Reports",
        order: 6,
        learning_objectives: "Write clear, accurate factual reports on topics and events",
        overview: "A factual report gives information about a real topic. It is written clearly, without opinions, and is organised into sections.",
        key_concepts: "Parts of a factual report:\n• Title\n• Introduction: What the report is about\n• Sections with headings\n• Facts and information\n• Conclusion\n\nFeatures of a report:\n• Written in present tense\n• Uses facts not opinions\n• Uses headings and subheadings\n• Uses formal language\n• Third person (he, she, it, they)",
        important_facts: "• Reports use facts, not opinions\n• Written in present tense usually\n• Use headings to organise the report\n• Do not use 'I' in a formal report",
        exam_tips: "Plan your report with headings first. Fill in facts under each heading.",
        questions: [
          {
            question_text: "Which sentence is appropriate for a factual report?",
            options: [{ label: "A", text: "I think lions are very scary animals." }, { label: "B", text: "Lions are carnivorous mammals that live in groups called prides." }, { label: "C", text: "Once upon a time a lion lived in the forest." }, { label: "D", text: "Lions are the best animals in my opinion." }],
            correct_answer: "B",
            explanation: "Option B gives facts without opinions and uses formal, clear language.",
            difficulty: "Standard"
          },
          {
            question_text: "Which tense is usually used in factual reports?",
            options: [{ label: "A", text: "Past tense" }, { label: "B", text: "Future tense" }, { label: "C", text: "Present tense" }, { label: "D", text: "Any tense is fine" }],
            correct_answer: "C",
            explanation: "Factual reports are usually written in present tense because they describe things as they are.",
            difficulty: "Standard"
          },
          {
            question_text: "Why do factual reports use headings?",
            options: [{ label: "A", text: "To make the report look longer" }, { label: "B", text: "To organise information and help readers find sections easily" }, { label: "C", text: "Because it is a rule with no reason" }, { label: "D", text: "To replace writing paragraphs" }],
            correct_answer: "B",
            explanation: "Headings organise the report and help the reader navigate to different sections.",
            difficulty: "Standard"
          },
          {
            question_text: "Which of the following should NOT appear in a factual report?",
            options: [{ label: "A", text: "Facts and figures" }, { label: "B", text: "Headings" }, { label: "C", text: "Personal opinions like 'I feel'" }, { label: "D", text: "An introduction" }],
            correct_answer: "C",
            explanation: "Factual reports present information objectively — personal opinions should not be included.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Identify and Use Nouns",
        order: 7,
        learning_objectives: "Identify and correctly use common, proper, collective and abstract nouns",
        overview: "A noun is a naming word. Nouns name people, places, animals and things.",
        key_concepts: "Types of nouns:\n• Common noun: names any person, place or thing (e.g. girl, city, book)\n• Proper noun: names a specific person or place, starts with a capital letter (e.g. Harare, Chipo)\n• Collective noun: names a group (e.g. a herd of cattle, a flock of birds, a class of pupils)\n• Abstract noun: names something you cannot touch (e.g. love, happiness, courage)\n\nExamples:\n• Common: market, teacher, river\n• Proper: Zambezi, Zimbabwe, Mrs Moyo\n• Collective: a pride of lions, a bunch of flowers\n• Abstract: fear, freedom, knowledge",
        important_facts: "• Proper nouns always start with a capital letter\n• Collective nouns name groups\n• Abstract nouns cannot be seen or touched\n• Nouns can be singular or plural",
        exam_tips: "Ask yourself: Is it a naming word? Can you see or touch it? Does it start with a capital letter?",
        questions: [
          {
            question_text: "Which of these is a proper noun?",
            options: [{ label: "A", text: "city" }, { label: "B", text: "river" }, { label: "C", text: "Harare" }, { label: "D", text: "school" }],
            correct_answer: "C",
            explanation: "Harare is a proper noun because it is the name of a specific city and starts with a capital letter.",
            difficulty: "Easy"
          },
          {
            question_text: "What is the collective noun for a group of lions?",
            options: [{ label: "A", text: "A flock of lions" }, { label: "B", text: "A herd of lions" }, { label: "C", text: "A pride of lions" }, { label: "D", text: "A bunch of lions" }],
            correct_answer: "C",
            explanation: "The correct collective noun for lions is 'a pride of lions'.",
            difficulty: "Standard"
          },
          {
            question_text: "Which of these is an abstract noun?",
            options: [{ label: "A", text: "Table" }, { label: "B", text: "Teacher" }, { label: "C", text: "Courage" }, { label: "D", text: "River" }],
            correct_answer: "C",
            explanation: "Courage is an abstract noun because you cannot see or touch it — it is a feeling or quality.",
            difficulty: "Standard"
          },
          {
            question_text: "Identify the noun in this sentence: 'The children played in the garden.'",
            options: [{ label: "A", text: "played" }, { label: "B", text: "children and garden" }, { label: "C", text: "in" }, { label: "D", text: "the" }],
            correct_answer: "B",
            explanation: "'Children' and 'garden' are both nouns — naming words.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence uses a collective noun correctly?",
            options: [{ label: "A", text: "A pride of birds flew past." }, { label: "B", text: "A flock of birds flew past." }, { label: "C", text: "A herd of birds flew past." }, { label: "D", text: "A pack of birds flew past." }],
            correct_answer: "B",
            explanation: "The correct collective noun for birds is 'a flock of birds'.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Use Pronouns Correctly",
        order: 8,
        learning_objectives: "Identify and correctly use subject and object pronouns",
        overview: "A pronoun is a word used in place of a noun to avoid repeating the noun. Instead of saying 'Chipo went to the market. Chipo bought vegetables.' we say 'Chipo went to the market. She bought vegetables.'",
        key_concepts: "Subject pronouns (used as the subject):\nI, you, he, she, it, we, they\n\nObject pronouns (used as the object):\nme, you, him, her, it, us, them\n\nPossessive pronouns:\nmy/mine, your/yours, his, her/hers, our/ours, their/theirs\n\nExamples:\n• She went to school. (subject)\n• Give the book to her. (object)\n• That bag is mine. (possessive)",
        important_facts: "• Pronouns replace nouns to avoid repetition\n• Subject pronouns come before the verb\n• Object pronouns come after the verb\n• Pronouns must match the noun they replace",
        exam_tips: "Replace the noun with the pronoun. Check if the sentence still sounds correct.",
        questions: [
          {
            question_text: "Choose the correct pronoun: 'Tindo and ___ went to the market.'",
            options: [{ label: "A", text: "me" }, { label: "B", text: "him" }, { label: "C", text: "I" }, { label: "D", text: "her" }],
            correct_answer: "C",
            explanation: "'I' is a subject pronoun used before the verb. 'Me' is an object pronoun used after the verb.",
            difficulty: "Standard"
          },
          {
            question_text: "Replace the underlined noun with a pronoun: 'Peter kicked the ball.' (replace 'Peter')",
            options: [{ label: "A", text: "Him" }, { label: "B", text: "He" }, { label: "C", text: "His" }, { label: "D", text: "They" }],
            correct_answer: "B",
            explanation: "'He' is the correct subject pronoun to replace 'Peter' as the subject of the sentence.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence uses a pronoun correctly?",
            options: [{ label: "A", text: "Her went to the shop." }, { label: "B", text: "The teacher gave the book to I." }, { label: "C", text: "They played football after school." }, { label: "D", text: "Me and John are friends." }],
            correct_answer: "C",
            explanation: "'They' is correctly used as a subject pronoun. All other options use pronouns incorrectly.",
            difficulty: "Standard"
          },
          {
            question_text: "Which word is a possessive pronoun in this sentence: 'That bicycle is mine.'?",
            options: [{ label: "A", text: "that" }, { label: "B", text: "bicycle" }, { label: "C", text: "is" }, { label: "D", text: "mine" }],
            correct_answer: "D",
            explanation: "'Mine' is a possessive pronoun showing ownership.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Identify Verbs",
        order: 9,
        learning_objectives: "Identify action verbs, helping verbs and linking verbs in sentences",
        overview: "A verb is a doing or being word. Every sentence must have a verb.",
        key_concepts: "Types of verbs:\n• Action verbs: show what someone does (e.g. run, eat, write, jump)\n• Helping verbs: come before the main verb (e.g. is, are, was, were, have, has, will, can)\n• Linking verbs: connect the subject to a description (e.g. is, are, seem, become)\n\nExamples:\n• She ran to school. (action verb: ran)\n• He is eating sadza. (helping verb: is; action: eating)\n• The flowers are beautiful. (linking verb: are)",
        important_facts: "• Every sentence must have a verb\n• Action verbs show physical or mental actions\n• Helping verbs support the main verb\n• Verbs change form depending on tense",
        exam_tips: "To find a verb, ask: What is the subject DOING? or What IS the subject?",
        questions: [
          {
            question_text: "Identify the verb in: 'The pupils ran quickly to the classroom.'",
            options: [{ label: "A", text: "pupils" }, { label: "B", text: "quickly" }, { label: "C", text: "ran" }, { label: "D", text: "classroom" }],
            correct_answer: "C",
            explanation: "'Ran' is the action verb — it shows what the pupils did.",
            difficulty: "Easy"
          },
          {
            question_text: "Which word is a helping verb in: 'She has finished her homework.'?",
            options: [{ label: "A", text: "she" }, { label: "B", text: "has" }, { label: "C", text: "finished" }, { label: "D", text: "homework" }],
            correct_answer: "B",
            explanation: "'Has' is the helping verb that supports the main verb 'finished'.",
            difficulty: "Standard"
          },
          {
            question_text: "Which of these is an action verb?",
            options: [{ label: "A", text: "beautiful" }, { label: "B", text: "slowly" }, { label: "C", text: "is" }, { label: "D", text: "swim" }],
            correct_answer: "D",
            explanation: "'Swim' is an action verb showing physical activity.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence does NOT have a verb?",
            options: [{ label: "A", text: "The dog barked loudly." }, { label: "B", text: "She wrote a letter." }, { label: "C", text: "The big red ball." }, { label: "D", text: "He is sleeping." }],
            correct_answer: "C",
            explanation: "'The big red ball' has no verb — it is not a complete sentence.",
            difficulty: "Standard"
          },
          {
            question_text: "What type of verb is 'seem' in: 'She seems tired today.'?",
            options: [{ label: "A", text: "Action verb" }, { label: "B", text: "Helping verb" }, { label: "C", text: "Linking verb" }, { label: "D", text: "Describing verb" }],
            correct_answer: "C",
            explanation: "'Seems' is a linking verb connecting the subject 'she' to the description 'tired'.",
            difficulty: "Advanced"
          }
        ]
      },
      {
        name: "Use Describing Words",
        order: 10,
        learning_objectives: "Use adjectives correctly to describe nouns in sentences",
        overview: "Describing words (adjectives) tell us more about a noun. They describe size, colour, shape, number and feeling.",
        key_concepts: "Types of adjectives:\n• Size: big, small, tall, short, enormous\n• Colour: red, green, bright, dark\n• Shape: round, square, flat\n• Number: two, many, several, few\n• Feeling: happy, sad, angry, proud\n• Quality: beautiful, clean, rough, soft\n\nOrder of adjectives:\nnumber → opinion → size → colour → noun\ne.g. three beautiful tall green trees\n\nComparative adjectives:\n• tall → taller → tallest\n• good → better → best\n• bad → worse → worst",
        important_facts: "• Adjectives describe nouns\n• They come before the noun usually\n• Comparative: add -er (taller)\n• Superlative: add -est (tallest)",
        exam_tips: "Add -er to compare two things and -est to compare more than two.",
        questions: [
          {
            question_text: "Identify the adjective in: 'She wore a beautiful red dress.'",
            options: [{ label: "A", text: "wore" }, { label: "B", text: "beautiful and red" }, { label: "C", text: "she" }, { label: "D", text: "dress" }],
            correct_answer: "B",
            explanation: "'Beautiful' and 'red' are both adjectives describing the dress.",
            difficulty: "Easy"
          },
          {
            question_text: "What is the superlative form of 'hot'?",
            options: [{ label: "A", text: "more hot" }, { label: "B", text: "hotter" }, { label: "C", text: "hottest" }, { label: "D", text: "most hot" }],
            correct_answer: "C",
            explanation: "The superlative of 'hot' is 'hottest' — used when comparing more than two things.",
            difficulty: "Standard"
          },
          {
            question_text: "Choose the correct comparative: 'This mango is ___ than that one.'",
            options: [{ label: "A", text: "sweetest" }, { label: "B", text: "sweeter" }, { label: "C", text: "most sweet" }, { label: "D", text: "very sweet" }],
            correct_answer: "B",
            explanation: "When comparing two things, use the comparative form: 'sweeter'.",
            difficulty: "Standard"
          },
          {
            question_text: "Which sentence uses an adjective correctly?",
            options: [{ label: "A", text: "The children played happily." }, { label: "B", text: "She ran quickly to class." }, { label: "C", text: "The tall boy won the race." }, { label: "D", text: "He ate quickly." }],
            correct_answer: "C",
            explanation: "'Tall' is an adjective describing the boy in option C. Options A, B, and D use adverbs.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Use Adverbs",
        order: 11,
        learning_objectives: "Identify and use adverbs to describe verbs, adjectives and other adverbs",
        overview: "An adverb describes a verb, an adjective or another adverb. Adverbs often end in -ly.",
        key_concepts: "Types of adverbs:\n• Manner (how): quickly, slowly, carefully, loudly\n• Time (when): now, yesterday, soon, always, never\n• Place (where): here, there, everywhere, outside\n• Degree (how much): very, quite, too, extremely\n\nExamples:\n• She walked slowly. (manner)\n• He came yesterday. (time)\n• They played outside. (place)\n• It was very cold. (degree)\n\nForming adverbs:\nadjective + ly = adverb\nquick → quickly, quiet → quietly, careful → carefully",
        important_facts: "• Adverbs describe verbs, adjectives or other adverbs\n• Many adverbs end in -ly\n• Adverbs of manner answer HOW\n• Adverbs of time answer WHEN",
        exam_tips: "Ask: How? When? Where? or How much? If the answer is a describing word, it's an adverb.",
        questions: [
          {
            question_text: "Identify the adverb in: 'The children laughed loudly at the joke.'",
            options: [{ label: "A", text: "children" }, { label: "B", text: "laughed" }, { label: "C", text: "loudly" }, { label: "D", text: "joke" }],
            correct_answer: "C",
            explanation: "'Loudly' is an adverb of manner describing how the children laughed.",
            difficulty: "Easy"
          },
          {
            question_text: "What type of adverb is 'yesterday' in: 'We went to the farm yesterday.'?",
            options: [{ label: "A", text: "Adverb of manner" }, { label: "B", text: "Adverb of place" }, { label: "C", text: "Adverb of time" }, { label: "D", text: "Adverb of degree" }],
            correct_answer: "C",
            explanation: "'Yesterday' tells us WHEN they went — so it is an adverb of time.",
            difficulty: "Standard"
          },
          {
            question_text: "Change 'careful' into an adverb.",
            options: [{ label: "A", text: "carefulness" }, { label: "B", text: "more careful" }, { label: "C", text: "carefully" }, { label: "D", text: "carefullier" }],
            correct_answer: "C",
            explanation: "You add -ly to 'careful' to make the adverb 'carefully'.",
            difficulty: "Easy"
          },
          {
            question_text: "Which adverb correctly fills the blank: 'He was ___ tired after the long walk.'",
            options: [{ label: "A", text: "quiet" }, { label: "B", text: "extreme" }, { label: "C", text: "extremely" }, { label: "D", text: "more" }],
            correct_answer: "C",
            explanation: "'Extremely' is an adverb of degree that correctly describes how tired he was.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Use Prepositions",
        order: 12,
        learning_objectives: "Identify and use prepositions of place, time and direction",
        overview: "A preposition is a word that shows the relationship between a noun and other words in the sentence. It often tells us where, when or how something happens.",
        key_concepts: "Common prepositions:\n• Place: in, on, under, above, behind, between, beside, near\n• Time: at, on, in, before, after, during, since\n• Direction: to, from, towards, through, across, along\n\nExamples:\n• The book is on the table. (place)\n• School starts at 7 o'clock. (time)\n• She walked to the market. (direction)\n\nPrepositions come BEFORE a noun:\nIn the box, Under the tree, After school",
        important_facts: "• Prepositions come before nouns\n• They show place, time or direction\n• Common ones: in, on, at, under, behind, before, after",
        exam_tips: "Prepositions always come before a noun or pronoun. They show WHERE, WHEN or HOW.",
        questions: [
          {
            question_text: "Identify the preposition in: 'The cat hid under the bed.'",
            options: [{ label: "A", text: "cat" }, { label: "B", text: "hid" }, { label: "C", text: "under" }, { label: "D", text: "bed" }],
            correct_answer: "C",
            explanation: "'Under' is the preposition showing where the cat hid.",
            difficulty: "Easy"
          },
          {
            question_text: "Choose the correct preposition: 'She arrived ___ school early.'",
            options: [{ label: "A", text: "into" }, { label: "B", text: "at" }, { label: "C", text: "on" }, { label: "D", text: "above" }],
            correct_answer: "B",
            explanation: "We use 'at' with specific places like 'at school', 'at home', 'at the market'.",
            difficulty: "Easy"
          },
          {
            question_text: "Which preposition shows TIME in: 'We will eat ___ dinner.'?",
            options: [{ label: "A", text: "after" }, { label: "B", text: "beside" }, { label: "C", text: "through" }, { label: "D", text: "under" }],
            correct_answer: "A",
            explanation: "'After' is a preposition of time showing when they will eat.",
            difficulty: "Standard"
          },
          {
            question_text: "Choose the correct preposition: 'The farmers walked ___ the field.'",
            options: [{ label: "A", text: "before" }, { label: "B", text: "after" }, { label: "C", text: "across" }, { label: "D", text: "above" }],
            correct_answer: "C",
            explanation: "'Across' is a preposition of direction — it shows the farmers moving from one side to the other.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Join Sentences",
        order: 13,
        learning_objectives: "Use conjunctions and connectives to join simple sentences",
        overview: "We join two short sentences using conjunctions (joining words) to make longer, more interesting sentences.",
        key_concepts: "Common conjunctions:\n• and: adds information (He ran and she walked.)\n• but: shows contrast (I was tired but I finished.)\n• because: gives a reason (She cried because she was hurt.)\n• so: shows result (It rained so they stayed inside.)\n• although: shows contrast (Although it was cold, she swam.)\n• when: shows time (He laughed when she fell.)\n• if: shows condition (I'll help you if you ask.)\n• or: shows choice (You can eat now or later.)\n\nExample:\nShort: It was raining. They stayed home.\nJoined: It was raining so they stayed home.",
        important_facts: "• Conjunctions join two clauses\n• 'Because' gives a reason\n• 'But' and 'although' show contrast\n• 'So' shows a result",
        exam_tips: "Choose the conjunction that makes the most logical sense between the two ideas.",
        questions: [
          {
            question_text: "Join the sentences correctly: 'She was hungry. She ate her sadza.'",
            options: [{ label: "A", text: "She was hungry but she ate her sadza." }, { label: "B", text: "She was hungry so she ate her sadza." }, { label: "C", text: "She was hungry or she ate her sadza." }, { label: "D", text: "She was hungry when she ate her sadza." }],
            correct_answer: "B",
            explanation: "'So' shows a result — because she was hungry, the result was she ate.",
            difficulty: "Easy"
          },
          {
            question_text: "Choose the correct conjunction: 'He wanted to play ___ it was already dark.'",
            options: [{ label: "A", text: "so" }, { label: "B", text: "and" }, { label: "C", text: "but" }, { label: "D", text: "because" }],
            correct_answer: "C",
            explanation: "'But' shows contrast — he wanted to play, but there was a reason he couldn't (it was dark).",
            difficulty: "Standard"
          },
          {
            question_text: "Which conjunction gives a REASON?",
            options: [{ label: "A", text: "and" }, { label: "B", text: "but" }, { label: "C", text: "or" }, { label: "D", text: "because" }],
            correct_answer: "D",
            explanation: "'Because' is used to give a reason why something happened.",
            difficulty: "Easy"
          },
          {
            question_text: "Join correctly: 'You can walk. You can take the bus.'",
            options: [{ label: "A", text: "You can walk but you can take the bus." }, { label: "B", text: "You can walk because you can take the bus." }, { label: "C", text: "You can walk or you can take the bus." }, { label: "D", text: "You can walk so you can take the bus." }],
            correct_answer: "C",
            explanation: "'Or' shows a choice between two options — walking or taking the bus.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Use A, An, The",
        order: 14,
        learning_objectives: "Use articles a, an and the correctly in sentences",
        overview: "Articles are small words that come before nouns: 'a', 'an' and 'the'. They tell us whether we are talking about a specific thing or any thing.",
        key_concepts: "Rules for articles:\n• 'A' — used before consonant sounds: a dog, a school, a mango\n• 'An' — used before vowel sounds: an apple, an egg, an hour\n• 'The' — used for a specific thing both speaker and listener know: the book on the table\n\nWhen to use 'The':\n• When talking about a specific thing\n• When the noun has been mentioned before\n• With unique things: the sun, the moon\n• With superlatives: the best, the tallest\n\nWhen NOT to use articles:\n• With plural general nouns: Dogs are friendly.\n• With names: Harare is beautiful.",
        important_facts: "• 'A' comes before consonant sounds\n• 'An' comes before vowel sounds (a, e, i, o, u)\n• 'The' is used for specific things\n• 'An hour' — silent h is treated as vowel",
        exam_tips: "Say the word out loud. Does it start with a vowel sound? Use 'an'. Consonant sound? Use 'a'.",
        questions: [
          {
            question_text: "Choose the correct article: '___ elephant lives in the wild.'",
            options: [{ label: "A", text: "A" }, { label: "B", text: "An" }, { label: "C", text: "The" }, { label: "D", text: "No article" }],
            correct_answer: "B",
            explanation: "'An' is used because 'elephant' starts with a vowel sound (e).",
            difficulty: "Easy"
          },
          {
            question_text: "Choose the correct article: 'Please close ___ door.'",
            options: [{ label: "A", text: "a" }, { label: "B", text: "an" }, { label: "C", text: "the" }, { label: "D", text: "No article" }],
            correct_answer: "C",
            explanation: "'The' is used because we are referring to a specific door that both people know about.",
            difficulty: "Easy"
          },
          {
            question_text: "Choose the correct article: 'She ate ___ orange for breakfast.'",
            options: [{ label: "A", text: "a" }, { label: "B", text: "an" }, { label: "C", text: "the" }, { label: "D", text: "no article needed" }],
            correct_answer: "B",
            explanation: "'An' is used before 'orange' because it starts with a vowel sound (o).",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence uses articles correctly?",
            options: [{ label: "A", text: "A sun rises in the east." }, { label: "B", text: "An boy kicked an ball." }, { label: "C", text: "The sun rises in the east." }, { label: "D", text: "She is an good student." }],
            correct_answer: "C",
            explanation: "'The sun' is correct because the sun is unique. Other options misuse articles.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Past, Present and Future Tense",
        order: 15,
        learning_objectives: "Identify and correctly use past, present and future tense verbs",
        overview: "Tense tells us WHEN something happens. There are three main tenses: past (happened before), present (happening now) and future (will happen).",
        key_concepts: "PRESENT TENSE:\n• Simple: She walks to school.\n• Continuous: She is walking to school.\n\nPAST TENSE:\n• Simple: She walked to school.\n• Continuous: She was walking to school.\n• Add -ed for regular verbs: walk → walked, play → played\n• Irregular verbs: go → went, eat → ate, run → ran, write → wrote\n\nFUTURE TENSE:\n• Will: She will walk to school.\n• Going to: She is going to walk to school.\n\nIrregular past tense:\nbuy → bought, teach → taught, bring → brought, catch → caught, sit → sat",
        important_facts: "• Regular verbs add -ed in past tense\n• Irregular verbs change completely\n• Future uses will or going to\n• Present continuous uses is/are + -ing",
        exam_tips: "Identify the time words: yesterday/last week = past, now/today = present, tomorrow/next week = future.",
        questions: [
          {
            question_text: "Change to past tense: 'The boys play football.'",
            options: [{ label: "A", text: "The boys will play football." }, { label: "B", text: "The boys played football." }, { label: "C", text: "The boys are playing football." }, { label: "D", text: "The boys plays football." }],
            correct_answer: "B",
            explanation: "For regular verbs in simple past tense, we add -ed: play → played.",
            difficulty: "Easy"
          },
          {
            question_text: "What is the past tense of 'go'?",
            options: [{ label: "A", text: "goed" }, { label: "B", text: "gone" }, { label: "C", text: "going" }, { label: "D", text: "went" }],
            correct_answer: "D",
            explanation: "'Go' is an irregular verb. Its past tense is 'went'.",
            difficulty: "Standard"
          },
          {
            question_text: "Which sentence is in the FUTURE tense?",
            options: [{ label: "A", text: "She is eating her lunch." }, { label: "B", text: "She ate her lunch." }, { label: "C", text: "She will eat her lunch tomorrow." }, { label: "D", text: "She eats her lunch." }],
            correct_answer: "C",
            explanation: "'Will eat' indicates future tense — something that has not happened yet.",
            difficulty: "Easy"
          },
          {
            question_text: "What is the past tense of 'buy'?",
            options: [{ label: "A", text: "buyed" }, { label: "B", text: "buys" }, { label: "C", text: "buying" }, { label: "D", text: "bought" }],
            correct_answer: "D",
            explanation: "'Buy' is irregular — its past tense is 'bought'.",
            difficulty: "Standard"
          },
          {
            question_text: "Which sentence uses present continuous tense?",
            options: [{ label: "A", text: "She walked to school." }, { label: "B", text: "She is walking to school." }, { label: "C", text: "She will walk to school." }, { label: "D", text: "She walks to school." }],
            correct_answer: "B",
            explanation: "Present continuous = is/are + verb-ing. 'She is walking' is present continuous.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Match Subject and Verb",
        order: 16,
        learning_objectives: "Ensure verbs agree with their subjects in number and person",
        overview: "Subject-verb agreement means the verb must match the subject. If the subject is singular, the verb must be singular. If the subject is plural, the verb must be plural.",
        key_concepts: "Rules:\n• Singular subject → singular verb: The dog barks.\n• Plural subject → plural verb: The dogs bark.\n• He/She/It → add 's': She runs. He eats.\n• I → first person: I run. I eat.\n• We/They/You → no 's': They run. We eat.\n\nTricky cases:\n• Collective nouns use singular verb: The class is working.\n• Either/Neither → singular verb: Neither of them is correct.\n• Subjects joined by 'and' → plural: Rudo and Bongai are friends.",
        important_facts: "• Singular subjects take singular verbs\n• Plural subjects take plural verbs\n• Add 's' to verb for he, she, it\n• 'And' connecting subjects usually requires plural verb",
        exam_tips: "Find the subject first. Is it one thing or more than one? Then choose the correct verb.",
        questions: [
          {
            question_text: "Choose the correct verb: 'The teacher ___ the books.'",
            options: [{ label: "A", text: "carry" }, { label: "B", text: "carries" }, { label: "C", text: "carrying" }, { label: "D", text: "carried" }],
            correct_answer: "B",
            explanation: "'The teacher' is singular (he/she), so the verb must be 'carries' (add s).",
            difficulty: "Easy"
          },
          {
            question_text: "Choose the correct verb: 'The children ___ in the playground.'",
            options: [{ label: "A", text: "plays" }, { label: "B", text: "is playing" }, { label: "C", text: "play" }, { label: "D", text: "has played" }],
            correct_answer: "C",
            explanation: "'Children' is plural, so the verb is 'play' (no 's').",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence has correct subject-verb agreement?",
            options: [{ label: "A", text: "The dogs barks at night." }, { label: "B", text: "She walk to school." }, { label: "C", text: "They plays football on Saturdays." }, { label: "D", text: "He reads every evening." }],
            correct_answer: "D",
            explanation: "'He reads' is correct — singular subject 'he' matches singular verb 'reads'.",
            difficulty: "Standard"
          },
          {
            question_text: "Choose the correct verb: 'Rudo and Chipo ___ best friends.'",
            options: [{ label: "A", text: "is" }, { label: "B", text: "was" }, { label: "C", text: "are" }, { label: "D", text: "has been" }],
            correct_answer: "C",
            explanation: "'Rudo and Chipo' is a compound subject (joined by 'and'), so we use 'are' (plural).",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Use Punctuation Correctly",
        order: 17,
        learning_objectives: "Use full stops, commas, question marks, exclamation marks, apostrophes and capital letters correctly",
        overview: "Punctuation marks are symbols that help readers understand writing. They show where sentences end, where to pause and what type of sentence it is.",
        key_concepts: "Punctuation marks:\n• Full stop (.) — ends a statement: She went home.\n• Comma (,) — pause, separates items: She bought mangoes, oranges and bananas.\n• Question mark (?) — ends a question: Where are you going?\n• Exclamation mark (!) — shows strong feeling: Watch out!\n• Apostrophe (') — shows possession or contraction: Chipo's bag. Don't.\n• Capital letters — start sentences and proper nouns\n\nComma rules:\n• In a list\n• After an introductory phrase\n• Before conjunctions in compound sentences",
        important_facts: "• Every sentence starts with a capital letter\n• Questions end with ?\n• Exclamations end with !\n• Apostrophes show possession: the girl's book",
        exam_tips: "Read the sentence aloud. Where do you naturally pause? That's often where a comma goes.",
        questions: [
          {
            question_text: "Which sentence uses correct punctuation?",
            options: [{ label: "A", text: "she went to the market yesterday" }, { label: "B", text: "She went to the market yesterday." }, { label: "C", text: "she went to the market yesterday." }, { label: "D", text: "She went to the market yesterday?" }],
            correct_answer: "B",
            explanation: "A statement begins with a capital letter and ends with a full stop.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence needs a question mark?",
            options: [{ label: "A", text: "She is reading a book." }, { label: "B", text: "Look out for the car!" }, { label: "C", text: "Where is your homework?" }, { label: "D", text: "He ran to school." }],
            correct_answer: "C",
            explanation: "'Where is your homework?' is a question and requires a question mark.",
            difficulty: "Easy"
          },
          {
            question_text: "Insert the correct punctuation: 'The pupils bought pens pencils and rulers'",
            options: [{ label: "A", text: "The pupils bought pens pencils and rulers." }, { label: "B", text: "The pupils bought pens, pencils and rulers." }, { label: "C", text: "The pupils bought pens; pencils; and rulers." }, { label: "D", text: "The pupils bought pens. pencils. and rulers." }],
            correct_answer: "B",
            explanation: "Use commas to separate items in a list.",
            difficulty: "Standard"
          },
          {
            question_text: "Which shows correct use of an apostrophe for possession?",
            options: [{ label: "A", text: "the book's of the teacher" }, { label: "B", text: "the teachers book" }, { label: "C", text: "the teacher's book" }, { label: "D", text: "the teachers' book" }],
            correct_answer: "C",
            explanation: "Apostrophe + s after the owner shows possession: the teacher's book.",
            difficulty: "Standard"
          },
          {
            question_text: "What is the contracted form of 'do not'?",
            options: [{ label: "A", text: "dont" }, { label: "B", text: "do'nt" }, { label: "C", text: "don't" }, { label: "D", text: "d'ont" }],
            correct_answer: "C",
            explanation: "The apostrophe replaces the letter 'o' in 'not': do not → don't.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Convert Speech",
        order: 18,
        learning_objectives: "Convert between direct speech and indirect (reported) speech",
        overview: "Direct speech shows the exact words someone said, inside inverted commas. Indirect speech reports what someone said without using their exact words.",
        key_concepts: "DIRECT SPEECH:\nThe teacher said, \"Open your books.\"\n\nINDIRECT SPEECH:\nThe teacher told the class to open their books.\n\nRules for changing to indirect speech:\n• Remove inverted commas\n• Change pronouns: I → he/she, we → they\n• Change tense (backshift): is → was, will → would, can → could, go → went\n• Change time words: now → then, today → that day, tomorrow → the next day\n• Use reporting verbs: said, told, asked, replied, explained",
        important_facts: "• Direct speech uses inverted commas\n• Indirect speech reports without inverted commas\n• Tenses change (backshift) in indirect speech\n• Pronouns change in indirect speech",
        exam_tips: "Change tense back one step: present → past, will → would, can → could.",
        questions: [
          {
            question_text: "Change to indirect speech: 'She said, \"I am tired.\"'",
            options: [{ label: "A", text: "She said that I am tired." }, { label: "B", text: "She said that she was tired." }, { label: "C", text: "She said that she is tired." }, { label: "D", text: "She told that she was tired." }],
            correct_answer: "B",
            explanation: "'I' changes to 'she', and 'am' changes to 'was' (backshift to past tense).",
            difficulty: "Standard"
          },
          {
            question_text: "In direct speech, where do you put the speaker's exact words?",
            options: [{ label: "A", text: "In brackets" }, { label: "B", text: "In inverted commas" }, { label: "C", text: "In italics" }, { label: "D", text: "In capital letters" }],
            correct_answer: "B",
            explanation: "Direct speech puts the speaker's exact words inside inverted commas (speech marks).",
            difficulty: "Easy"
          },
          {
            question_text: "Change to indirect speech: 'He said, \"I will come tomorrow.\"'",
            options: [{ label: "A", text: "He said that he will come tomorrow." }, { label: "B", text: "He said that he would come the next day." }, { label: "C", text: "He said that I would come tomorrow." }, { label: "D", text: "He told that he will come the next day." }],
            correct_answer: "B",
            explanation: "'Will' becomes 'would', 'tomorrow' becomes 'the next day', and 'I' becomes 'he'.",
            difficulty: "Advanced"
          },
          {
            question_text: "Which is an example of DIRECT speech?",
            options: [{ label: "A", text: "She said she was hungry." }, { label: "B", text: "He told us to sit down." }, { label: "C", text: "The teacher asked if we understood." }, { label: "D", text: "\"Please sit down,\" said the teacher." }],
            correct_answer: "D",
            explanation: "Direct speech uses inverted commas to show the exact words spoken.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Similar Meanings (Synonyms)",
        order: 19,
        learning_objectives: "Identify and use synonyms to improve vocabulary and writing",
        overview: "Synonyms are words that have similar meanings. Using synonyms makes your writing more interesting and varied.",
        key_concepts: "Examples of synonyms:\n• big: large, huge, enormous, giant\n• small: tiny, little, miniature, petite\n• happy: joyful, pleased, delighted, cheerful\n• sad: unhappy, miserable, sorrowful, gloomy\n• fast: quick, rapid, swift, speedy\n• walk: stroll, march, stride, amble\n• said: replied, answered, shouted, whispered, explained\n\nWhy use synonyms?\n• Avoid repeating the same word\n• Make writing more interesting\n• Show a wider vocabulary",
        important_facts: "• Synonyms have similar (not identical) meanings\n• They improve writing variety\n• Always check the meaning fits the sentence",
        exam_tips: "If you are unsure, replace the word in the sentence and check if it still makes sense.",
        questions: [
          {
            question_text: "Which word is a synonym for 'happy'?",
            options: [{ label: "A", text: "Sad" }, { label: "B", text: "Tired" }, { label: "C", text: "Joyful" }, { label: "D", text: "Angry" }],
            correct_answer: "C",
            explanation: "'Joyful' means very happy — it is a synonym for happy.",
            difficulty: "Easy"
          },
          {
            question_text: "Choose a synonym for 'enormous'.",
            options: [{ label: "A", text: "tiny" }, { label: "B", text: "huge" }, { label: "C", text: "soft" }, { label: "D", text: "quiet" }],
            correct_answer: "B",
            explanation: "'Huge' and 'enormous' both mean very large.",
            difficulty: "Easy"
          },
          {
            question_text: "Which word could replace 'said' to show someone was very upset?",
            options: [{ label: "A", text: "whispered" }, { label: "B", text: "mumbled" }, { label: "C", text: "sobbed" }, { label: "D", text: "replied" }],
            correct_answer: "C",
            explanation: "'Sobbed' means to say something while crying — it shows the person was very upset.",
            difficulty: "Standard"
          },
          {
            question_text: "Find the synonym for 'fast' in this list:",
            options: [{ label: "A", text: "slow" }, { label: "B", text: "rapid" }, { label: "C", text: "gentle" }, { label: "D", text: "old" }],
            correct_answer: "B",
            explanation: "'Rapid' means moving very quickly — it is a synonym for 'fast'.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Opposites (Antonyms)",
        order: 20,
        learning_objectives: "Identify and use antonyms correctly",
        overview: "Antonyms are words that have opposite meanings. Knowing antonyms helps you understand meaning and improves your vocabulary.",
        key_concepts: "Examples of antonyms:\n• hot ↔ cold\n• tall ↔ short\n• begin ↔ end\n• light ↔ dark / heavy\n• love ↔ hate\n• happy ↔ sad\n• always ↔ never\n• arrive ↔ depart\n• ancient ↔ modern\n• guilty ↔ innocent\n• wealthy ↔ poor\n• courage ↔ cowardice\n\nForming antonyms using prefixes:\n• un-: happy → unhappy, kind → unkind\n• dis-: appear → disappear, honest → dishonest\n• im-: possible → impossible, polite → impolite\n• in-: correct → incorrect, visible → invisible",
        important_facts: "• Antonyms are opposites\n• Some antonyms use prefixes: un-, dis-, im-, in-\n• Always check the meaning in context",
        exam_tips: "Use prefixes to form antonyms: un-, dis-, im-, in-, ir-.",
        questions: [
          {
            question_text: "What is the opposite of 'ancient'?",
            options: [{ label: "A", text: "old" }, { label: "B", text: "modern" }, { label: "C", text: "large" }, { label: "D", text: "dark" }],
            correct_answer: "B",
            explanation: "'Modern' means new and current — it is the opposite of 'ancient' (very old).",
            difficulty: "Standard"
          },
          {
            question_text: "Form the antonym of 'possible' using a prefix.",
            options: [{ label: "A", text: "unpossible" }, { label: "B", text: "dispossible" }, { label: "C", text: "impossible" }, { label: "D", text: "inpossible" }],
            correct_answer: "C",
            explanation: "The correct prefix for 'possible' is 'im-': impossible.",
            difficulty: "Standard"
          },
          {
            question_text: "What is the opposite of 'arrive'?",
            options: [{ label: "A", text: "come" }, { label: "B", text: "depart" }, { label: "C", text: "travel" }, { label: "D", text: "walk" }],
            correct_answer: "B",
            explanation: "'Depart' means to leave — it is the opposite of 'arrive'.",
            difficulty: "Standard"
          },
          {
            question_text: "Which word is the opposite of 'guilty'?",
            options: [{ label: "A", text: "criminal" }, { label: "B", text: "wrong" }, { label: "C", text: "innocent" }, { label: "D", text: "sorry" }],
            correct_answer: "C",
            explanation: "'Innocent' means not guilty — it is the direct opposite.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Common Idioms",
        order: 21,
        learning_objectives: "Understand and use common English idioms",
        overview: "An idiom is a phrase whose meaning is different from the meanings of the individual words. You cannot understand an idiom by looking at each word separately.",
        key_concepts: "Common idioms:\n• It's raining cats and dogs → raining very heavily\n• Break a leg → good luck\n• Hit the nail on the head → say exactly the right thing\n• Beat around the bush → avoid saying something directly\n• Let the cat out of the bag → reveal a secret\n• Once in a blue moon → very rarely\n• Under the weather → feeling sick or unwell\n• Cost an arm and a leg → very expensive\n• Bite off more than you can chew → take on more than you can handle\n• A piece of cake → very easy",
        important_facts: "• Idioms cannot be understood word by word\n• They are fixed expressions\n• Used in everyday conversation\n• Understanding them improves comprehension",
        exam_tips: "Focus on the overall meaning, not individual words. Context clues help you understand idioms.",
        questions: [
          {
            question_text: "What does the idiom 'break a leg' mean?",
            options: [{ label: "A", text: "You will hurt yourself" }, { label: "B", text: "Good luck" }, { label: "C", text: "Run very fast" }, { label: "D", text: "Work very hard" }],
            correct_answer: "B",
            explanation: "'Break a leg' is an idiom meaning 'good luck', usually said to performers before a show.",
            difficulty: "Easy"
          },
          {
            question_text: "What does 'under the weather' mean?",
            options: [{ label: "A", text: "Standing outside in the rain" }, { label: "B", text: "Feeling sick or unwell" }, { label: "C", text: "Studying the clouds" }, { label: "D", text: "Being very cold" }],
            correct_answer: "B",
            explanation: "'Under the weather' means feeling ill or not well.",
            difficulty: "Easy"
          },
          {
            question_text: "Tafara 'let the cat out of the bag' about the surprise party. What did he do?",
            options: [{ label: "A", text: "He let a cat escape" }, { label: "B", text: "He brought a bag to the party" }, { label: "C", text: "He accidentally revealed the secret" }, { label: "D", text: "He was very quiet at the party" }],
            correct_answer: "C",
            explanation: "'Let the cat out of the bag' means to accidentally reveal a secret.",
            difficulty: "Standard"
          },
          {
            question_text: "What does 'a piece of cake' mean?",
            options: [{ label: "A", text: "A slice of birthday cake" }, { label: "B", text: "Something delicious" }, { label: "C", text: "Something very easy" }, { label: "D", text: "A reward for good work" }],
            correct_answer: "C",
            explanation: "'A piece of cake' is an idiom meaning something is very easy to do.",
            difficulty: "Easy"
          },
          {
            question_text: "What does 'it costs an arm and a leg' mean?",
            options: [{ label: "A", text: "It is very dangerous" }, { label: "B", text: "It is very expensive" }, { label: "C", text: "It is very large" }, { label: "D", text: "It is very heavy" }],
            correct_answer: "B",
            explanation: "'Costs an arm and a leg' means something is extremely expensive.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Word Meanings",
        order: 22,
        learning_objectives: "Use context clues and vocabulary knowledge to determine word meanings",
        overview: "Word meanings can often be worked out from the context (the words around the unfamiliar word). This skill helps you understand new words without a dictionary.",
        key_concepts: "Strategies for finding word meanings:\n1. Read the whole sentence\n2. Look for clues in the words around it\n3. Think about what would make sense\n4. Look for prefixes or suffixes\n\nCommon prefixes and their meanings:\n• pre- = before (predict, prepare)\n• re- = again (redo, return)\n• un- = not (unhappy, unkind)\n• mis- = wrongly (mistake, misspell)\n\nCommon suffixes:\n• -ful = full of (helpful, beautiful)\n• -less = without (careless, hopeless)\n• -ment = the result of (movement, enjoyment)",
        important_facts: "• Use context clues to find meaning\n• Prefixes change the beginning meaning\n• Suffixes change the end meaning\n• Always check the meaning fits the sentence",
        exam_tips: "Read the full sentence. Replace the unknown word with your guess and check if it makes sense.",
        questions: [
          {
            question_text: "What does the prefix 'un-' mean in 'unhappy'?",
            options: [{ label: "A", text: "very" }, { label: "B", text: "not" }, { label: "C", text: "again" }, { label: "D", text: "before" }],
            correct_answer: "B",
            explanation: "The prefix 'un-' means 'not' — unhappy means not happy.",
            difficulty: "Easy"
          },
          {
            question_text: "What does 'careless' mean based on its suffix?",
            options: [{ label: "A", text: "full of care" }, { label: "B", text: "caring too much" }, { label: "C", text: "without care" }, { label: "D", text: "caring again" }],
            correct_answer: "C",
            explanation: "The suffix '-less' means 'without'. So 'careless' means without care.",
            difficulty: "Standard"
          },
          {
            question_text: "Using context, what does 'exhausted' mean in: 'After the long race, she was exhausted and could barely walk.'?",
            options: [{ label: "A", text: "very hungry" }, { label: "B", text: "extremely tired" }, { label: "C", text: "very happy" }, { label: "D", text: "a little cold" }],
            correct_answer: "B",
            explanation: "Context clues (long race, could barely walk) tell us she was extremely tired.",
            difficulty: "Standard"
          },
          {
            question_text: "What does the prefix 're-' mean in 'rewrite'?",
            options: [{ label: "A", text: "before" }, { label: "B", text: "not" }, { label: "C", text: "again" }, { label: "D", text: "under" }],
            correct_answer: "C",
            explanation: "'Re-' means again — so 'rewrite' means to write again.",
            difficulty: "Easy"
          }
        ]
      },
      {
        name: "Correct Spelling",
        order: 23,
        learning_objectives: "Spell common words correctly and apply spelling rules",
        overview: "Good spelling is important in all your written work. Learning spelling rules and practising regularly helps you spell correctly.",
        key_concepts: "Spelling rules:\n• i before e except after c: believe, receive\n• Double the consonant before -ing/-ed (short vowel): run→running, sit→sitting\n• Drop the 'e' before -ing: make→making, write→writing\n• Add -es to words ending in ch, sh, x, s: watches, buses\n• Change 'y' to 'i' before -es: baby→babies, city→cities\n\nCommonly misspelled words:\nfriend, believe, receive, because, beautiful, necessary, separate, different, definitely, Wednesday\n\nSpelling strategies:\n• Sound it out\n• Break into syllables: be-cause, beau-ti-ful\n• Remember tricky parts\n• Look, cover, write, check",
        important_facts: "• i before e except after c (believe, receive)\n• Double consonant when adding -ing to CVC words\n• Drop e before -ing\n• Change y to i before adding -es/-ed",
        exam_tips: "Say the word slowly. Spell it in syllables. Check for common patterns.",
        questions: [
          {
            question_text: "Which is the correct spelling?",
            options: [{ label: "A", text: "recieve" }, { label: "B", text: "receive" }, { label: "C", text: "recive" }, { label: "D", text: "receeve" }],
            correct_answer: "B",
            explanation: "After 'c', it is 'ei' not 'ie': receive. This follows the 'i before e except after c' rule.",
            difficulty: "Standard"
          },
          {
            question_text: "Which word is spelled correctly?",
            options: [{ label: "A", text: "becaus" }, { label: "B", text: "becuase" }, { label: "C", text: "because" }, { label: "D", text: "beacuse" }],
            correct_answer: "C",
            explanation: "The correct spelling is 'because'.",
            difficulty: "Easy"
          },
          {
            question_text: "What is the correct spelling of the plural of 'baby'?",
            options: [{ label: "A", text: "babys" }, { label: "B", text: "babyes" }, { label: "C", text: "babies" }, { label: "D", text: "babys'" }],
            correct_answer: "C",
            explanation: "When a word ends in 'y' after a consonant, change 'y' to 'i' and add 'es': babies.",
            difficulty: "Standard"
          },
          {
            question_text: "What is the correct spelling of 'run + ing'?",
            options: [{ label: "A", text: "runing" }, { label: "B", text: "running" }, { label: "C", text: "runeing" }, { label: "D", text: "runig" }],
            correct_answer: "B",
            explanation: "With CVC words (consonant-vowel-consonant), double the final consonant before adding -ing: running.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Build Sentences",
        order: 24,
        learning_objectives: "Construct grammatically correct and meaningful sentences",
        overview: "A sentence is a complete thought that has a subject and a verb. Good sentences are clear, correct and interesting.",
        key_concepts: "Types of sentences:\n• Simple sentence: one main clause: She ate sadza.\n• Compound sentence: two clauses joined by a conjunction: She ate sadza and he drank water.\n• Complex sentence: a main clause + dependent clause: Although she was tired, she finished her work.\n\nA good sentence has:\n• A subject (who/what the sentence is about)\n• A verb (what the subject does or is)\n• An object or complement (more information)\n\nSentence starters to avoid:\nDon't always start with 'I' or 'The'\nTry: 'Quickly, she...', 'Under the tree...', 'After the storm...'",
        important_facts: "• Every sentence needs a subject and verb\n• Sentences start with a capital letter\n• Sentences end with . ? or !\n• Vary your sentence starters",
        exam_tips: "Check: Does the sentence have a subject? Does it have a verb? Is the meaning complete?",
        questions: [
          {
            question_text: "Which group of words is a complete sentence?",
            options: [{ label: "A", text: "Running very fast in the rain" }, { label: "B", text: "The big brown dog" }, { label: "C", text: "The big brown dog barked loudly." }, { label: "D", text: "When she arrived at school" }],
            correct_answer: "C",
            explanation: "Option C has a subject (dog), a verb (barked), and makes complete sense.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence is a COMPOUND sentence?",
            options: [{ label: "A", text: "She ran to school." }, { label: "B", text: "Although it rained, she came to school." }, { label: "C", text: "She was tired but she finished her work." }, { label: "D", text: "The boy with the red bag." }],
            correct_answer: "C",
            explanation: "A compound sentence has two main clauses joined by a conjunction like 'but'.",
            difficulty: "Advanced"
          },
          {
            question_text: "Arrange the words into a correct sentence: 'to / the / walked / market / she'",
            options: [{ label: "A", text: "Market she the walked to." }, { label: "B", text: "She walked to the market." }, { label: "C", text: "Walked the market to she." }, { label: "D", text: "To walked she the market." }],
            correct_answer: "B",
            explanation: "The correct word order is: subject (she) + verb (walked) + to + the + market.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence has an interesting opener?",
            options: [{ label: "A", text: "The children played football." }, { label: "B", text: "I went to the market." }, { label: "C", text: "She was happy." }, { label: "D", text: "After the heavy rain, the children played football." }],
            correct_answer: "D",
            explanation: "Option D uses an interesting introductory phrase 'After the heavy rain' before the main clause.",
            difficulty: "Standard"
          }
        ]
      },
      {
        name: "Correct Errors",
        order: 25,
        learning_objectives: "Identify and correct grammatical, punctuation and spelling errors in sentences",
        overview: "Proofreading means reading your work carefully to find and correct mistakes. Good writers always check their work before handing it in.",
        key_concepts: "Types of errors to look for:\n• Spelling errors: freind → friend\n• Punctuation errors: missing full stops, capitals, commas\n• Grammar errors: She go → She goes, He didn't went → He didn't go\n• Subject-verb agreement: The boys was → The boys were\n• Tense errors: Yesterday she go → Yesterday she went\n\nProofreading steps:\n1. Read the sentence carefully\n2. Check spelling\n3. Check punctuation\n4. Check grammar\n5. Check that the meaning makes sense",
        important_facts: "• Always proofread your work\n• Check spelling, punctuation and grammar\n• Read sentences aloud to spot errors\n• Correct tense and subject-verb agreement",
        exam_tips: "Read each sentence slowly. Ask: Is the spelling right? Does the verb match the subject? Is there a full stop?",
        questions: [
          {
            question_text: "Find and correct the error: 'The children was playing football.'",
            options: [{ label: "A", text: "The children is playing football." }, { label: "B", text: "The children were playing football." }, { label: "C", text: "The children be playing football." }, { label: "D", text: "The children playing football." }],
            correct_answer: "B",
            explanation: "'Children' is plural so the correct verb is 'were', not 'was'.",
            difficulty: "Easy"
          },
          {
            question_text: "Which sentence has a spelling error?",
            options: [{ label: "A", text: "She is my best friend." }, { label: "B", text: "We went to the market yesterday." }, { label: "C", text: "He recieved a letter." }, { label: "D", text: "They played football." }],
            correct_answer: "C",
            explanation: "'Recieved' is incorrectly spelled. The correct spelling is 'received' (i before e except after c).",
            difficulty: "Standard"
          },
          {
            question_text: "Correct the error: 'Yesterday she go to school early.'",
            options: [{ label: "A", text: "Yesterday she goes to school early." }, { label: "B", text: "Yesterday she is going to school early." }, { label: "C", text: "Yesterday she went to school early." }, { label: "D", text: "Yesterday she going to school early." }],
            correct_answer: "C",
            explanation: "'Yesterday' signals past tense. 'Go' should be changed to 'went' (irregular past tense).",
            difficulty: "Standard"
          },
          {
            question_text: "Which sentence has correct punctuation?",
            options: [{ label: "A", text: "where are you going" }, { label: "B", text: "Where are you going." }, { label: "C", text: "Where are you going?" }, { label: "D", text: "where are you going?" }],
            correct_answer: "C",
            explanation: "A question starts with a capital letter and ends with a question mark.",
            difficulty: "Easy"
          },
          {
            question_text: "Correct the error: 'She don't like mangoes.'",
            options: [{ label: "A", text: "She doesn't likes mangoes." }, { label: "B", text: "She doesn't like mangoes." }, { label: "C", text: "She don't likes mangoes." }, { label: "D", text: "She do not likes mangoes." }],
            correct_answer: "B",
            explanation: "With 'she' (third person singular), the correct form is 'doesn't' (does not), not 'don't'.",
            difficulty: "Standard"
          }
        ]
      }
    ];

    let topicsCreated = 0;
    let notesCreated = 0;
    let questionsCreated = 0;
    const allTopicIds = [];

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < topicsData.length; i++) {
      const t = topicsData[i];
      await sleep(300); // avoid rate limits

      // Check if topic exists already
      let existing = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId, name: t.name });
      let topic = existing.length > 0 ? existing[0] : await base44.asServiceRole.entities.Topic.create({
        subject_id: subjectId,
        name: t.name,
        order: t.order,
        learning_objectives: t.learning_objectives,
        is_active: true
      });
      allTopicIds.push(topic.id);
      topicsCreated++;

      // Create notes if not exist
      let notes = await base44.asServiceRole.entities.Note.filter({ topic_id: topic.id });
      if (notes.length === 0) {
        await base44.asServiceRole.entities.Note.create({
          topic_id: topic.id,
          subject_id: subjectId,
          overview: t.overview || "",
          key_definitions: "",
          key_concepts: t.key_concepts || "",
          zimbabwe_examples: "",
          important_facts: t.important_facts || "",
          common_mistakes: "",
          summary: "",
          exam_tips: t.exam_tips || "",
          is_ai_generated: false
        });
        notesCreated++;
      }

      // Create questions
      for (const q of t.questions) {
        await sleep(200);
        await base44.asServiceRole.entities.Question.create({
          topic_id: topic.id,
          subject_id: subjectId,
          question_text: q.question_text,
          comprehension_passage: q.comprehension_passage || "",
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || "Standard",
          question_type: q.comprehension_passage ? "comprehension" : "mcq",
          marks: 1,
          is_active: true
        });
        questionsCreated++;
      }
    }

    // Create a mock exam using all questions
    const allQuestions = await base44.asServiceRole.entities.Question.filter({ subject_id: subjectId, is_active: true });
    const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 30);

    await base44.asServiceRole.entities.MockExam.create({
      subject_id: subjectId,
      title: "Grade 7 English Mock Exam",
      grade: "Grade 7",
      duration_minutes: 60,
      total_marks: shuffled.length,
      question_ids: shuffled.map(q => q.id),
      instructions: "Answer all questions carefully. Read each question and passage before selecting your answer.",
      is_active: true
    });

    return Response.json({
      success: true,
      message: "English content imported successfully",
      stats: { topics_created: topicsCreated, notes_created: notesCreated, questions_created: questionsCreated }
    });

  } catch (error) {
    console.error("Import error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});