-- Add about_page_config column to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS about_page_config JSONB;

-- Populate about_page_config with initial content
UPDATE site_settings 
SET about_page_config = '{
  "hero": {
    "badge": "Our Story",
    "title_primary": "About",
    "title_highlight": "The Marketing Solution",
    "description": "We are Bangladesh''s premier event management and marketing agency — a team of passionate creatives, strategic planners, and relentless executors."
  },
  "mission": {
    "badge": "Our Mission",
    "title_primary": "Transforming Visions Into",
    "title_highlight": "Unforgettable Experiences",
    "statement": "\"Our mission is to transform ordinary moments into extraordinary memories.\"",
    "description_p1": "Founded in 2016, The Marketing Solution began as a small photography studio with a big dream: to redefine event experiences in Bangladesh. Today, we''ve grown into a full-service agency trusted by leading corporations, celebrities, and families alike.",
    "description_p2": "From intimate gatherings to large-scale productions, we bring the same level of passion, professionalism, and creative excellence to every project. Our team of 20+ specialists ensures no detail is overlooked.",
    "stats_value": "500+",
    "stats_label": "Events Executed"
  },
  "values": {
    "badge": "Our Values",
    "title_primary": "What",
    "title_highlight": "Drives Us",
    "items": [
      { "title": "Passion-Driven", "text": "Every event is a labor of love. We pour our hearts into every detail from the first meeting to the final curtain call.", "icon": "Heart" },
      { "title": "Results-Focused", "text": "We don''t just plan events — we create experiences that meet your goals, exceed expectations, and measure success.", "icon": "Target" },
      { "title": "Creative Excellence", "text": "Innovation is at our core. We bring fresh ideas and creative solutions to every brief, no matter the scale.", "icon": "Sparkles" },
      { "title": "Client-Centric", "text": "Your vision is our mission. We listen, we collaborate, and we build something extraordinary together.", "icon": "Users" }
    ]
  },
  "journey": {
    "badge": "Our Journey",
    "title_primary": "Key",
    "title_highlight": "Milestones",
    "milestones": [
      { "year": "2016", "title": "Founded", "text": "Started as a small photography studio in Dhaka." },
      { "year": "2018", "title": "First Major Event", "text": "Managed our first 1,000-guest corporate gala." },
      { "year": "2020", "title": "Full-Service Agency", "text": "Expanded to full event management and brand activations." },
      { "year": "2024", "title": "Industry Leader", "text": "500+ events, 300+ clients, and still growing." }
    ]
  }
}'::jsonb
WHERE id = 1;
