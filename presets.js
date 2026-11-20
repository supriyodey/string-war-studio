// Pre-configured contestant presets with clean SVG avatar badges and colors

function createSvgAvatar(text, bgColor, textColor = '#ffffff', secondary = '') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="bg" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#3a3f55"/>
        <stop offset="100%" stop-color="${bgColor}"/>
      </radialGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#bg)"/>
    <circle cx="50" cy="50" r="48" fill="url(#shine)"/>
    <text x="50" y="${secondary ? 46 : 58}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
    ${secondary ? `<text x="50" y="70" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="${textColor}" opacity="0.85" text-anchor="middle" dominant-baseline="middle">${secondary}</text>` : ''}
    <circle cx="50" cy="50" r="47" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

window.createSvgAvatar = createSvgAvatar;

window.PRESET_PACKS = {
  world_leaders: {
    name: "World Leaders (YouTube Short Match)",
    title: "WHO WILL WIN?",
    subtitle: "COMMENT YOUR LEADER",
    initialStrings: 80,
    contestants: [
      { name: "Donald Trump", color: "#FFD700", avatar: createSvgAvatar("TRUMP", "#b8860b", "#fff", "USA"), strings: 80 },
      { name: "Emmanuel Macron", color: "#3B82F6", avatar: createSvgAvatar("MACRON", "#1d4ed8", "#fff", "FRA"), strings: 80 },
      { name: "Joe Biden", color: "#EC4899", avatar: createSvgAvatar("BIDEN", "#be185d", "#fff", "USA"), strings: 80 },
      { name: "Giorgia Meloni", color: "#84CC16", avatar: createSvgAvatar("MELONI", "#4d7c0f", "#fff", "ITA"), strings: 80 },
      { name: "Narendra Modi", color: "#22C55E", avatar: createSvgAvatar("MODI", "#15803d", "#fff", "IND"), strings: 80 },
      { name: "Xi Jinping", color: "#06B6D4", avatar: createSvgAvatar("XI", "#0e7490", "#fff", "CHN"), strings: 80 },
      { name: "Keir Starmer", color: "#A855F7", avatar: createSvgAvatar("STARMER", "#7e22ce", "#fff", "UK"), strings: 80 },
      { name: "Vladimir Putin", color: "#EF4444", avatar: createSvgAvatar("PUTIN", "#b91c1c", "#fff", "RUS"), strings: 80 }
    ]
  },
  tech_titans: {
    name: "Tech Billionaires",
    title: "TECH BATTLE ROYALE",
    subtitle: "WHO WINS THE CAGE MATCH?",
    initialStrings: 80,
    contestants: [
      { name: "Elon Musk", color: "#38BDF8", avatar: createSvgAvatar("ELON", "#0284c7", "#fff", "X / TESLA"), strings: 80 },
      { name: "Mark Zuckerberg", color: "#3B82F6", avatar: createSvgAvatar("ZUCK", "#1d4ed8", "#fff", "META"), strings: 80 },
      { name: "Jeff Bezos", color: "#F59E0B", avatar: createSvgAvatar("BEZOS", "#b45309", "#fff", "AMAZON"), strings: 80 },
      { name: "Bill Gates", color: "#10B981", avatar: createSvgAvatar("GATES", "#047857", "#fff", "MICROSOFT"), strings: 80 },
      { name: "Sam Altman", color: "#8B5CF6", avatar: createSvgAvatar("SAM", "#6d28d9", "#fff", "OPENAI"), strings: 80 },
      { name: "Jensen Huang", color: "#84CC16", avatar: createSvgAvatar("JENSEN", "#4d7c0f", "#fff", "NVIDIA"), strings: 80 }
    ]
  },
  anime_legends: {
    name: "Anime Legends",
    title: "ULTIMATE ANIME CLASH",
    subtitle: "DROP YOUR POWER LEVEL",
    initialStrings: 80,
    contestants: [
      { name: "Goku", color: "#F97316", avatar: createSvgAvatar("GOKU", "#c2410c", "#fff", "DBZ"), strings: 80 },
      { name: "Naruto", color: "#EAB308", avatar: createSvgAvatar("NARUTO", "#a16207", "#fff", "LEAF"), strings: 80 },
      { name: "Luffy", color: "#EF4444", avatar: createSvgAvatar("LUFFY", "#b91c1c", "#fff", "PIRATE"), strings: 80 },
      { name: "Ichigo", color: "#3B82F6", avatar: createSvgAvatar("ICHIGO", "#1d4ed8", "#fff", "REAPER"), strings: 80 },
      { name: "Saitama", color: "#FACC15", avatar: createSvgAvatar("SAITAMA", "#854d0e", "#fff", "ONE PUNCH"), strings: 80 },
      { name: "Levi", color: "#10B981", avatar: createSvgAvatar("LEVI", "#047857", "#fff", "SCOUT"), strings: 80 }
    ]
  },
  animals: {
    name: "Animal Kingdom",
    title: "BEAST BATTLE ROYALE",
    subtitle: "WHO REIGNS SUPREME?",
    initialStrings: 80,
    contestants: [
      { name: "Lion", color: "#F59E0B", avatar: createSvgAvatar("🦁", "#78350f", "#fff", "KING"), strings: 80 },
      { name: "Tiger", color: "#EA580C", avatar: createSvgAvatar("🐅", "#9a3412", "#fff", "STRIPES"), strings: 80 },
      { name: "Bear", color: "#854D0E", avatar: createSvgAvatar("🐻", "#451a03", "#fff", "GRIZZLY"), strings: 80 },
      { name: "Wolf", color: "#64748B", avatar: createSvgAvatar("🐺", "#334155", "#fff", "ALPHA"), strings: 80 },
      { name: "Gorilla", color: "#475569", avatar: createSvgAvatar("🦍", "#1e293b", "#fff", "SILVER"), strings: 80 },
      { name: "Eagle", color: "#38BDF8", avatar: createSvgAvatar("🦅", "#0369a1", "#fff", "SKY"), strings: 80 }
    ]
  }
};
