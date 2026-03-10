-- Update Homepage "Why Choose Us" section data
-- Run this in Supabase SQL Editor to populate the texts requested by the user.

UPDATE site_settings
SET 
  about_content = 'With 8+ years of experience and hundreds of successful events, The Marketing Solution is the trusted partner for brands and individuals who refuse to settle for ordinary.',
  services = '[
    {"icon": "📈", "title": "8+ Years of Expertise", "description": "Decade of delivering premium events with unmatched quality."},
    {"icon": "🌍", "title": "Pan-Bangladesh Reach", "description": "We operate across Dhaka, Chittagong, Sylhet and beyond."},
    {"icon": "✅", "title": "End-to-End Service", "description": "Concept, logistics, execution — one team handles it all."},
    {"icon": "🏆", "title": "Award-Winning Team", "description": "A passionate crew of creatives, planners, and storytellers."}
  ]'::jsonb
WHERE id = 1;
