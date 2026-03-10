-- Add services_page_config column to site_settings table
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS services_page_config JSONB DEFAULT '{
  "hero": {
    "badge": "What We Offer",
    "title_primary": "Our",
    "title_highlight": "Services",
    "description": "Comprehensive solutions for every event need — creative, strategic, and flawlessly executed from start to finish."
  },
  "services": [
    {
      "icon": "🎪",
      "title": "Event Management",
      "description": "Full-scale event planning and execution for any size — from concept and design to day-of logistics and post-event reporting.",
      "features": ["Venue sourcing & setup", "Guest management", "Vendor coordination", "On-site execution team"]
    },
    {
      "icon": "📸",
      "title": "Photography",
      "description": "Cinematic, high-resolution photography that captures every emotion, connection, and milestone of your event.",
      "features": ["Event & corporate photography", "Wedding photography", "Product photography", "Same-day delivery available"]
    },
    {
      "icon": "🎬",
      "title": "Videography & Production",
      "description": "Professional video storytelling with cinematic grade equipment, post-production editing, and brand-aligned delivery.",
      "features": ["4K video production", "Highlight reels", "Live streaming", "Drone footage"]
    },
    {
      "icon": "🎤",
      "title": "Corporate Events",
      "description": "Conferences, product launches, seminars, and award nights — delivered on-brand, on-budget, on-time.",
      "features": ["AV production", "Stage & set design", "Keynote support", "Media coverage"]
    },
    {
      "icon": "🌹",
      "title": "Wedding Planning",
      "description": "Your dream wedding, meticulously planned from first consultation to last dance, with love and attention to every detail.",
      "features": ["Full wedding coordination", "Floral & décor", "Catering management", "Honeymoon planning"]
    },
    {
      "icon": "📊",
      "title": "Brand Activations",
      "description": "Immersive brand experiences that connect your audience, drive engagement, and make your brand unforgettable.",
      "features": ["Pop-up events", "Influencer events", "Roadshows", "Experiential marketing"]
    }
  ],
  "process": {
    "badge": "How It Works",
    "title_primary": "Our",
    "title_highlight": "Process",
    "steps": [
      { "step": "01", "title": "Discovery Call", "text": "We learn about your event, vision, and goals in a free consultation." },
      { "step": "02", "title": "Proposal & Planning", "text": "Our team creates a detailed event plan, timeline, and budget." },
      { "step": "03", "title": "Execution", "text": "We handle every detail so you can enjoy the experience stress-free." },
      { "step": "04", "title": "Delivery & Review", "text": "Deliverables handed over, feedback collected, and excellence ensured." }
    ]
  },
  "cta": {
    "title_primary": "Ready to get",
    "title_highlight": "started?",
    "description": "Talk to our team and let''s plan something extraordinary together.",
    "button_label": "Request a Quote",
    "button_url": "/contact"
  }
}';