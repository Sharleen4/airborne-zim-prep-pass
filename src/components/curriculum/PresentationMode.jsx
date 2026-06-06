import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

// Build the classroom slide deck from the lesson plan.
// Strictly EXCLUDES teacher guidance and meta sections.
function buildSlides(topic, plan) {
  const slides = [];

  // 1. Title
  slides.push({
    type: "title",
    title: plan.lesson_title || topic.topic,
    subtitle: `${topic.subject} · ${topic.grade}${topic.curriculum_code ? " · " + topic.curriculum_code : ""}`,
    duration: plan.duration || "",
  });

  // 2. Learning Objectives (so learners know what they will learn)
  if (plan.learning_objectives?.length) {
    slides.push({ type: "list", title: "What We Will Learn Today", items: plan.learning_objectives });
  }

  // 3. Introduction
  const introText = plan.introduction || plan.warm_up_activity || plan.prior_knowledge_activity;
  if (introText) slides.push({ type: "text", title: "Introduction", text: introText });

  // 4. Key Definitions — one slide per term for clarity on board
  if (plan.key_definitions?.length) {
    slides.push({ type: "definitions-overview", title: "Key Words", items: plan.key_definitions });
    plan.key_definitions.forEach(d => {
      slides.push({
        type: "definition",
        title: d.term,
        definition: d.definition,
        example: d.example,
      });
    });
  }

  // 5. Examples / demonstrations
  const examples = [
    { label: "Example 1", text: plan.worked_example_1 },
    { label: "Example 2", text: plan.worked_example_2 },
    { label: "Demonstration", text: plan.demonstration || plan.demonstration_activity },
    { label: "Story", text: plan.storytelling_activity },
    { label: "Reading", text: plan.reading_activity },
  ].filter(e => e.text);
  examples.forEach(e => slides.push({ type: "text", title: e.label, text: e.text }));

  // 6. Body — main concept / content
  const bodyText = plan.concept_explanation || plan.content_exploration || plan.cultural_exploration || plan.vocabulary_development;
  if (bodyText) slides.push({ type: "text", title: "Main Lesson", text: bodyText });

  // 7. Class activities
  const activities = [
    { label: "Group Activity", text: plan.group_activity || plan.group_work || plan.group_discussion || plan.group_research_activity },
    { label: "Guided Practice", text: plan.guided_practice || plan.language_practice || plan.practical_activity },
    { label: "Observation", text: plan.observation_activity },
    { label: "Investigation", text: plan.investigation_activity },
    { label: "Discussion", text: plan.guided_discussion || plan.discussion_activity },
  ].filter(a => a.text);
  activities.forEach(a => slides.push({ type: "text", title: a.label, text: a.text }));

  // 8. Images — one full-screen slide per generated AI image
  const imageUrls = Array.isArray(plan.generated_image_urls) ? plan.generated_image_urls.filter(Boolean) : [];
  imageUrls.forEach((url, i) => {
    const caption = plan.suggested_teaching_images?.[i] || "";
    slides.push({ type: "image", title: caption || "Look & Discuss", imageUrl: url });
  });

  // 9. Class Work / Exercise
  const classWork = plan.class_exercise || plan.writing_activity || plan.assessment_questions || plan.assessment_activity;
  if (classWork) slides.push({ type: "text", title: "Class Work", text: classWork });

  // 10. Summary / Conclusion
  const summary = plan.summary || plan.conclusion || plan.reflection || plan.reflection_activity;
  if (summary) slides.push({ type: "text", title: "Summary", text: summary });

  // 11. Homework — three tiers
  if (plan.homework_easy || plan.homework_medium || plan.homework_challenge) {
    slides.push({
      type: "homework",
      title: "Homework",
      easy: plan.homework_easy,
      medium: plan.homework_medium,
      challenge: plan.homework_challenge,
    });
  }

  // 12. End slide
  slides.push({ type: "end", title: "Well done, learners! 🎉" });

  return slides;
}

export default function PresentationMode({ topic, plan, onClose }) {
  const slides = useMemo(() => buildSlides(topic, plan), [topic, plan]);
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Advancing past the last slide exits the presentation instead of getting
  // stuck on a "blank-looking" final slide.
  const next = useCallback(() => {
    setIndex(i => {
      if (i >= slides.length - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [slides.length, onClose]);
  const prev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") onClose();
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, toggleFullscreen]);

  // Inject the exit handler so the end slide's button can close the presentation.
  const slide = useMemo(() => {
    const s = slides[index];
    if (s?.type === "end") return { ...s, onExit: onClose };
    return s;
  }, [slides, index, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[400] bg-slate-900 text-white flex flex-col select-none">
      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <p className="text-xs text-white/70 truncate">
          {topic.subject} · {topic.grade} · Slide {index + 1} / {slides.length}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/10" title="Fullscreen (F)">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" title="Exit (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-16 py-16 cursor-pointer" onClick={next}>
        <SlideRenderer slide={slide} />
      </div>

      {/* Nav */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        disabled={index === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        disabled={index === slides.length - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${((index + 1) / slides.length) * 100}%` }}
        />
      </div>
    </div>,
    document.body
  );
}

function SlideRenderer({ slide }) {
  if (!slide) return null;

  if (slide.type === "title") {
    return (
      <div className="text-center max-w-5xl">
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight mb-6">{slide.title}</h1>
        <p className="text-2xl sm:text-3xl text-white/80 mb-4">{slide.subtitle}</p>
        {slide.duration && <p className="text-xl text-white/60">Duration: {slide.duration}</p>}
      </div>
    );
  }

  if (slide.type === "end") {
    return (
      <div className="text-center max-w-3xl">
        <h1 className="text-6xl sm:text-8xl font-extrabold mb-10">{slide.title}</h1>
        <p className="text-2xl sm:text-3xl text-white/70 mb-10">End of lesson</p>
        <button
          onClick={(e) => { e.stopPropagation(); slide.onExit?.(); }}
          className="bg-primary hover:bg-primary/90 text-white font-bold text-xl sm:text-2xl px-8 py-4 rounded-2xl"
        >
          Exit Presentation
        </button>
      </div>
    );
  }

  if (slide.type === "list") {
    return (
      <div className="max-w-5xl w-full">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-10 text-primary">{slide.title}</h2>
        <ul className="space-y-5">
          {slide.items.map((it, i) => (
            <li key={i} className="flex items-start gap-4 text-2xl sm:text-4xl leading-relaxed">
              <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (slide.type === "text") {
    return (
      <div className="max-w-5xl w-full">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-8 text-primary">{slide.title}</h2>
        <p className="text-2xl sm:text-4xl leading-relaxed whitespace-pre-wrap">{slide.text}</p>
      </div>
    );
  }

  if (slide.type === "definitions-overview") {
    return (
      <div className="max-w-5xl w-full">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-10 text-primary">{slide.title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {slide.items.map((d, i) => (
            <div key={i} className="bg-white/10 rounded-2xl p-5 text-center">
              <p className="text-2xl sm:text-3xl font-bold">{d.term}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === "definition") {
    return (
      <div className="max-w-5xl w-full text-center">
        <p className="text-xl text-white/60 uppercase tracking-widest mb-4">Key Word</p>
        <h2 className="text-6xl sm:text-8xl font-extrabold mb-10 text-primary">{slide.title}</h2>
        <p className="text-3xl sm:text-5xl leading-relaxed mb-8">{slide.definition}</p>
        {slide.example && (
          <p className="text-xl sm:text-2xl italic text-white/70 mt-6 border-t border-white/20 pt-6">
            Example: {slide.example}
          </p>
        )}
      </div>
    );
  }

  if (slide.type === "image") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <img src={slide.imageUrl} alt={slide.title} className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl" />
        {slide.title && <p className="text-xl sm:text-2xl text-white/80 mt-6 text-center">{slide.title}</p>}
      </div>
    );
  }

  if (slide.type === "homework") {
    return (
      <div className="max-w-5xl w-full">
        <h2 className="text-4xl sm:text-6xl font-extrabold mb-10 text-primary">{slide.title}</h2>
        <div className="space-y-5">
          {slide.easy && <HomeworkSlideRow color="bg-emerald-500" label="Easy" text={slide.easy} />}
          {slide.medium && <HomeworkSlideRow color="bg-amber-500" label="Medium" text={slide.medium} />}
          {slide.challenge && <HomeworkSlideRow color="bg-rose-500" label="Challenge" text={slide.challenge} />}
        </div>
      </div>
    );
  }

  return null;
}

function HomeworkSlideRow({ color, label, text }) {
  return (
    <div className="flex items-start gap-4">
      <span className={`${color} text-white text-lg sm:text-xl font-bold px-4 py-2 rounded-xl flex-shrink-0`}>{label}</span>
      <p className="text-2xl sm:text-3xl leading-relaxed">{text}</p>
    </div>
  );
}