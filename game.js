const SAVE_KEY = "cookie-empire-save-v2";
const LEGACY_SAVE_KEYS = ["cookie-empire-save-v1"];
const SCHEMA_VERSION = 2;
const TICK_MS = 200;
const AUTO_SAVE_MS = 10000;
const MAX_OFFLINE_SECONDS = 12 * 60 * 60;
const CHALLENGE_ROTATION_MS = 15 * 60 * 1000;
const CHIPS_FORMULA_BASE = 9000;

const BUY_MODES = ["x1", "x10", "x25", "x100", "MAX"];
const STORE_FILTERS = ["all", "click", "automation", "ascension", "utility"];
const BRANCHES = ["Click", "Industry", "Fortune", "Legacy"];

const MULT_EFFECTS = new Set([
  "click_mult",
  "generator_mult",
  "charge_gain_mult",
  "buff_duration_mult",
  "offline_mult",
  "skill_gain_mult",
  "charge_boost_mult",
]);

const BUFFS = {
  overclock: { id: "overclock", name: "Overclock", durationSec: 24, gen: 1.9, click: 1, rain: 0, w: 1 },
  frenzy: { id: "frenzy", name: "Frenzy", durationSec: 18, gen: 1, click: 2.2, rain: 0, w: 1 },
  "golden-rain": { id: "golden-rain", name: "Golden Rain", durationSec: 20, gen: 1, click: 1, rain: 0.18, w: 0.8 },
};
const BUFF_LIST = Object.values(BUFFS);

const CHALLENGES = [
  {
    id: "rapid-hands",
    title: "Rapid Hands",
    description: "Manual clicks this rotation.",
    key: "clicks",
    goal: (slot) => 300 + Math.min(slot, 20) * 20,
    reward: { type: "skill_points", amount: 1 },
  },
  {
    id: "production-surge",
    title: "Production Surge",
    description: "Automation cookies this rotation.",
    key: "generatorCookies",
    goal: (slot) => 200000 + Math.min(slot, 20) * 120000,
    reward: { type: "permanent_bonus", effectType: "generator_mult", value: 0.01 },
  },
  {
    id: "buff-hunter",
    title: "Buff Hunter",
    description: "Buff triggers this rotation.",
    key: "buffsTriggered",
    goal: (slot) => 5 + Math.min(Math.floor(slot / 6), 8),
    reward: { type: "skill_points", amount: 1 },
  },
  {
    id: "shopping-spree",
    title: "Shopping Spree",
    description: "Purchases this rotation.",
    key: "totalPurchases",
    goal: (slot) => 35 + Math.min(slot, 20) * 3,
    reward: { type: "chips", amount: 2 },
  },
];

function mkMilestones(tier, baseCost) {
  return {
    25: tier <= 5 ? { type: "cookies", amount: Math.floor(baseCost * 400) } : { type: "chips", amount: Math.max(2, Math.floor(tier / 2)) },
    50: { type: "permanent_bonus", effectType: "generator_mult", value: 0.01 + tier * 0.001 },
    100: { type: "skill_points", amount: 1 + Math.floor((tier - 1) / 4) },
  };
}

const genDefs = [
  ["cursor", "Grandma Cursor", "An eager helper.", 15, 1.15, 0.2, null],
  ["oven", "Smart Oven", "Fast and consistent.", 100, 1.16, 1.2, { lifetime: 400 }],
  ["factory", "Cookie Factory", "Mass output line.", 650, 1.17, 7, { lifetime: 5000 }],
  ["portal", "Dough Portal", "Imports from weird dimensions.", 5000, 1.185, 40, { lifetime: 60000 }],
  ["time-lab", "Time Lab", "Borrows tomorrow's cookies.", 40000, 1.2, 230, { lifetime: 600000 }],
  ["moon-mine", "Moon Mine", "Low gravity extraction.", 320000, 1.21, 1300, { lifetime: 5000000 }],
  ["nano-assembler", "Nano Assembler", "Microrobots bake nonstop.", 2600000, 1.22, 7600, { lifetime: 50000000 }],
  ["nebula-refinery", "Nebula Refinery", "Stellar sugar refinery.", 22000000, 1.225, 43000, { lifetime: 300000000 }],
  ["void-reactor", "Void Reactor", "Converts emptiness to cookies.", 210000000, 1.23, 240000, { chips: 15 }],
  ["quantum-swarm", "Quantum Swarm", "Probability factory.", 2000000000, 1.235, 1400000, { chips: 40 }],
  ["celestial-foundry", "Celestial Foundry", "Forges cookie constellations.", 24000000000, 1.24, 8200000, { chips: 100 }],
  ["infinity-crucible", "Infinity Crucible", "Infinite baking horizon.", 320000000000, 1.245, 52000000, { chips: 220, skill: "legacy-crown", skillRank: 1 }],
];
const generators = genDefs.map((g, idx) => ({
  id: g[0],
  tier: idx + 1,
  name: g[1],
  description: g[2],
  baseCost: g[3],
  costScale: g[4],
  cps: g[5],
  unlockRule: g[6],
  milestoneRewards: mkMilestones(idx + 1, g[3]),
}));

const upDefs = [
  ["sturdy-oven-mitt", "Sturdy Oven Mitt", "+1 base click.", "click", 20, 1.32, 20, "click_base_add", 1, null],
  ["baker-wristband", "Baker Wristband", "+2 base click.", "click", 160, 1.37, 18, "click_base_add", 2, { lifetime: 1500 }],
  ["sugar-rush", "Sugar Rush", "+12% click.", "click", 220, 1.42, 20, "click_mult", 0.12, null],
  ["combo-mastery", "Combo Mastery", "+0.15 combo cap.", "click", 900, 1.55, 15, "combo_cap_add", 0.15, { lifetime: 30000 }],
  ["rhythmic-tapping", "Rhythmic Tapping", "+0.01 combo gain.", "click", 1400, 1.58, 15, "combo_gain_add", 0.01, { lifetime: 60000 }],
  ["golden-touch", "Golden Touch", "+1.5% crit chance.", "click", 2400, 1.65, 12, "crit_chance_add", 0.015, { lifetime: 120000 }],
  ["diamond-knuckle", "Diamond Knuckle", "+0.24 crit power.", "click", 6800, 1.72, 10, "crit_power_add", 0.24, { lifetime: 400000 }],
  ["rapid-whisk", "Rapid Whisk", "+10% charge gain.", "click", 14500, 1.75, 12, "charge_gain_mult", 0.1, { chips: 2 }],

  ["industrial-kitchen", "Industrial Kitchen", "+12% generator.", "automation", 350, 1.5, 25, "generator_mult", 0.12, { lifetime: 5000 }],
  ["conveyor-belts", "Conveyor Belts", "+10% generator.", "automation", 2400, 1.57, 20, "generator_mult", 0.1, { lifetime: 50000 }],
  ["thermal-recycling", "Thermal Recycling", "+9% generator.", "automation", 9000, 1.63, 18, "generator_mult", 0.09, { lifetime: 250000 }],
  ["robotics-crew", "Robotics Crew", "+11% generator.", "automation", 38000, 1.68, 16, "generator_mult", 0.11, { lifetime: 1500000 }],
  ["quantum-planners", "Quantum Planners", "+13% generator.", "automation", 180000, 1.74, 14, "generator_mult", 0.13, { lifetime: 10000000 }],
  ["charge-coupler", "Charge Coupler", "+8% charge boost.", "automation", 420000, 1.8, 12, "charge_boost_mult", 0.08, { chips: 8 }],
  ["overclock-battery", "Overclock Battery", "+10% buff duration.", "automation", 1100000, 1.82, 10, "buff_duration_mult", 0.1, { chips: 15 }],
  ["auto-crit-catalyst", "Auto-Crit Catalyst", "+0.3% buff chance.", "automation", 2600000, 1.84, 10, "buff_chance_add", 0.003, { chips: 22 }],

  ["chip-refinery", "Chip Refinery", "+0.4% chip power.", "ascension", 65000, 1.72, 12, "chip_power_add", 0.004, { chips: 3 }],
  ["legacy-ledger", "Legacy Ledger", "+10% ascension SP.", "ascension", 150000, 1.76, 10, "skill_gain_mult", 0.1, { chips: 6 }],
  ["sacred-oven", "Sacred Oven", "+10% offline gain.", "ascension", 310000, 1.78, 10, "offline_mult", 0.1, { chips: 10 }],
  ["transcendence-protocol", "Transcendence Protocol", "+14% generator.", "ascension", 1250000, 1.85, 8, "generator_mult", 0.14, { chips: 25 }],
  ["eternal-heat", "Eternal Heat", "+12% click.", "ascension", 1550000, 1.87, 8, "click_mult", 0.12, { chips: 30 }],
  ["gilded-insight", "Gilded Insight", "+0.4% buff chance.", "ascension", 2200000, 1.9, 10, "buff_chance_add", 0.004, { chips: 45 }],
  ["timeless-focus", "Timeless Focus", "+0.22 combo cap.", "ascension", 3600000, 1.92, 8, "combo_cap_add", 0.22, { chips: 60 }],

  ["bargain-bin", "Bargain Bin", "-1.5% upgrade cost.", "utility", 500, 1.46, 15, "upgrade_discount_add", 0.015, { lifetime: 12000 }],
  ["wholesale-contracts", "Wholesale Contracts", "-1.5% generator cost.", "utility", 2800, 1.54, 15, "generator_discount_add", 0.015, { lifetime: 70000 }],
  ["storage-expansion", "Storage Expansion", "+8% offline gain.", "utility", 20000, 1.62, 12, "offline_mult", 0.08, { lifetime: 500000 }],
  ["motivation-poster", "Motivation Poster", "+0.2 combo cap.", "utility", 130000, 1.73, 10, "combo_cap_add", 0.2, { chips: 12 }],
  ["focus-tonic", "Focus Tonic", "+0.012 combo gain.", "utility", 330000, 1.77, 10, "combo_gain_add", 0.012, { chips: 18 }],
  ["lucky-charm", "Lucky Charm", "+1% crit chance.", "utility", 840000, 1.82, 10, "crit_chance_add", 0.01, { chips: 28 }],
  ["catalyst-lab", "Catalyst Lab", "+10% buff duration.", "utility", 1900000, 1.86, 10, "buff_duration_mult", 0.1, { chips: 38 }],
];
const upgrades = upDefs.map((u) => ({
  id: u[0], name: u[1], description: u[2], category: u[3], baseCost: u[4], costScale: u[5], max: u[6], effectType: u[7], effectValue: u[8], unlockRule: u[9],
}));

const skillDefs = [
  ["precise-fingers", "Click", "Precise Fingers", "+0.8 base click/rank", 5, 1, 1.7, "click_base_add", 0.8, { ascensions: 1 }, null],
  ["combo-discipline", "Click", "Combo Discipline", "+0.25 combo cap/rank", 3, 2, 1.8, "combo_cap_add", 0.25, { chips: 2 }, "precise-fingers"],
  ["crit-training", "Click", "Crit Training", "+1% crit/rank", 4, 2, 1.85, "crit_chance_add", 0.01, { chips: 5 }, "combo-discipline"],
  ["charged-strikes", "Click", "Charged Strikes", "+12% charge gain/rank", 4, 3, 1.9, "charge_gain_mult", 0.12, { chips: 8 }, "crit-training"],
  ["frenzy-control", "Click", "Frenzy Control", "+12% buff duration/rank", 3, 4, 2, "buff_duration_mult", 0.12, { chips: 15 }, "charged-strikes"],
  ["active-overflow", "Click", "Active Overflow", "+14% click/rank", 3, 5, 2.1, "click_mult", 0.14, { chips: 28 }, "frenzy-control"],

  ["assembly-blueprints", "Industry", "Assembly Blueprints", "+7% generator/rank", 5, 1, 1.7, "generator_mult", 0.07, { ascensions: 1 }, null],
  ["conveyor-logic", "Industry", "Conveyor Logic", "-1% generator cost/rank", 4, 2, 1.8, "generator_discount_add", 0.01, { chips: 3 }, "assembly-blueprints"],
  ["heat-recapture", "Industry", "Heat Recapture", "+9% generator/rank", 4, 3, 1.9, "generator_mult", 0.09, { chips: 8 }, "conveyor-logic"],
  ["reactor-synchrony", "Industry", "Reactor Synchrony", "+12% charge boost/rank", 3, 4, 2, "charge_boost_mult", 0.12, { chips: 16 }, "heat-recapture"],
  ["macro-automation", "Industry", "Macro Automation", "+12% generator/rank", 3, 5, 2.1, "generator_mult", 0.12, { chips: 30 }, "reactor-synchrony"],
  ["autonomous-harmony", "Industry", "Autonomous Harmony", "+18% offline/rank", 2, 8, 2.2, "offline_mult", 0.18, { chips: 55 }, "macro-automation"],

  ["lucky-threads", "Fortune", "Lucky Threads", "+0.4% buff chance/rank", 4, 1, 1.75, "buff_chance_add", 0.004, { ascensions: 1 }, null],
  ["gilded-rhythm", "Fortune", "Gilded Rhythm", "+0.15 crit power/rank", 4, 2, 1.8, "crit_power_add", 0.15, { chips: 4 }, "lucky-threads"],
  ["jackpot-engine", "Fortune", "Jackpot Engine", "+11% buff duration/rank", 3, 3, 1.9, "buff_duration_mult", 0.11, { chips: 10 }, "gilded-rhythm"],
  ["rain-harvester", "Fortune", "Rain Harvester", "+8% click/rank", 3, 4, 2, "click_mult", 0.08, { chips: 20 }, "jackpot-engine"],
  ["omen-reader", "Fortune", "Omen Reader", "Golden Rain weight/rank", 3, 5, 2.1, "rare_buff_weight_add", 0.25, { chips: 35 }, "rain-harvester"],
  ["fortune-core", "Fortune", "Fortune Core", "+1% chip power/rank", 2, 8, 2.2, "chip_power_add", 0.01, { chips: 65 }, "omen-reader"],

  ["ancestral-oven", "Legacy", "Ancestral Oven", "+0.6% chip power/rank", 4, 1, 1.75, "chip_power_add", 0.006, { ascensions: 1 }, null],
  ["timeless-notes", "Legacy", "Timeless Notes", "+14% ascension SP/rank", 3, 2, 1.85, "skill_gain_mult", 0.14, { chips: 6 }, "ancestral-oven"],
  ["deeper-prestige", "Legacy", "Deeper Prestige", "+8% generator/rank", 3, 3, 1.95, "generator_mult", 0.08, { chips: 14 }, "timeless-notes"],
  ["transcendence-math", "Legacy", "Transcendence Math", "+10% click/rank", 3, 4, 2.05, "click_mult", 0.1, { chips: 26 }, "deeper-prestige"],
  ["archived-wisdom", "Legacy", "Archived Wisdom", "+14% offline/rank", 3, 5, 2.1, "offline_mult", 0.14, { chips: 45 }, "transcendence-math"],
  ["legacy-crown", "Legacy", "Legacy Crown", "+20% generator", 1, 12, 2.5, "generator_mult", 0.2, { chips: 90 }, "archived-wisdom"],
];
const skills = skillDefs.map((s) => ({
  id: s[0], branch: s[1], name: s[2], description: s[3], maxRank: s[4], baseCost: s[5], costScale: s[6], effectType: s[7], effectValue: s[8], unlockRule: s[9], prereq: s[10],
}));

function makeDerived() {
  return {
    clickBase: 1,
    clickMult: 1,
    genMult: 1,
    comboCap: 2,
    comboGain: 0.06,
    critChance: 0.05,
    critPower: 2,
    chargeGain: 1,
    chargeDecay: 1,
    buffChance: 0.01,
    buffDuration: 1,
    offline: 1,
    chipPower: 0.04,
    skillGain: 1,
    upDiscount: 0,
    genDiscount: 0,
    chargeBoost: 1,
    rainWeight: 0,
  };
}

function makeState() {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    cookies: 0,
    lifetimeCookies: 0,
    chips: 0,
    skillPoints: 0,
    clicks: 0,
    comboMultiplier: 1,
    comboExpiresAt: 0,
    clickCharge: 0,
    lastClickAt: 0,
    lastTickAt: now,
    lastSavedAt: now,
    upgradesBought: {},
    generatorsOwned: {},
    skillsUnlocked: {},
    achievements: {},
    achievementClaims: {},
    activeBuffs: [],
    permanentBonuses: {},
    generatorMilestonesClaimed: {},
    challenge: { slot: -1, idx: 0, baseline: {}, claimedSlots: {} },
    stats: {
      ascensions: 0,
      manualCookies: 0,
      generatorCookies: 0,
      buffsTriggered: 0,
      highestCps: 0,
      highestCombo: 1,
      totalPurchases: 0,
      achievementsClaimed: 0,
      challengeCompletions: 0,
    },
    ui: { buyMode: "x1", storeFilter: "all" },
  };
}

let state = makeState();
let derived = makeDerived();
let toastTimer = null;

const achievements = [];

const el = {
  cookies: document.getElementById("cookies"),
  perClick: document.getElementById("perClick"),
  perSecond: document.getElementById("perSecond"),
  clickCharge: document.getElementById("clickCharge"),
  combo: document.getElementById("combo"),
  comboHint: document.getElementById("comboHint"),
  activeBuffs: document.getElementById("activeBuffs"),
  upgradeList: document.getElementById("upgradeList"),
  generatorList: document.getElementById("generatorList"),
  lifetime: document.getElementById("lifetime"),
  chips: document.getElementById("chips"),
  skillPoints: document.getElementById("skillPoints"),
  clicks: document.getElementById("clicks"),
  ascendHint: document.getElementById("ascendHint"),
  ascendPreview: document.getElementById("ascendPreview"),
  nextMilestones: document.getElementById("nextMilestones"),
  challengeCard: document.getElementById("challengeCard"),
  skillTree: document.getElementById("skillTree"),
  achievementList: document.getElementById("achievementList"),
  buyMode: document.getElementById("buyMode"),
  storeFilter: document.getElementById("storeFilter"),
  clickBtn: document.getElementById("clickBtn"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  ascendBtn: document.getElementById("ascendBtn"),
  claimAllBtn: document.getElementById("claimAllBtn"),
  toast: document.getElementById("toast"),
};

function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) < 1000) return n.toFixed(1).replace(/\.0$/, "");
  const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  let v = n;
  let i = -1;
  while (Math.abs(v) >= 1000 && i < units.length - 1) {
    v /= 1000;
    i += 1;
  }
  return `${v.toFixed(2)}${units[i]}`;
}
function fmtInt(n) { return Math.floor(n).toLocaleString("en-US"); }
function dur(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function toast(msg) {
  el.toast.textContent = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (el.toast.textContent === msg) el.toast.textContent = ""; }, 2300);
}
function upCount(id) { return state.upgradesBought[id] || 0; }
function genCount(id) { return state.generatorsOwned[id] || 0; }
function skillRank(id) { return state.skillsUnlocked[id] || 0; }
function unlockedSkillNodes() { return skills.reduce((n, s) => n + (skillRank(s.id) > 0 ? 1 : 0), 0); }

function metricValue(key) {
  if (key === "clicks") return state.clicks;
  if (key === "generatorCookies") return state.stats.generatorCookies;
  if (key === "buffsTriggered") return state.stats.buffsTriggered;
  if (key === "totalPurchases") return state.stats.totalPurchases;
  return 0;
}

function chipsFromLifetime(lifetime) {
  return Math.floor(Math.sqrt(Math.max(0, lifetime) / CHIPS_FORMULA_BASE));
}
function lifetimeForChips(chips) { return chips * chips * CHIPS_FORMULA_BASE; }
function ascendMult(chips = state.chips) { return 1 + chips * derived.chipPower; }
function spFromAscend(chipGain) {
  if (chipGain <= 0) return 0;
  const base = Math.max(1, Math.floor(Math.sqrt(chipGain) * 1.4));
  return Math.max(1, Math.floor(base * derived.skillGain));
}

function ruleOk(rule) {
  if (!rule) return true;
  if (rule.lifetime && state.lifetimeCookies < rule.lifetime) return false;
  if (rule.chips && state.chips < rule.chips) return false;
  if (rule.ascensions && state.stats.ascensions < rule.ascensions) return false;
  if (rule.skill && skillRank(rule.skill) < (rule.skillRank || 1)) return false;
  return true;
}
function ruleText(rule) {
  if (!rule) return "Unlocked";
  const parts = [];
  if (rule.lifetime) parts.push(`${fmt(rule.lifetime)} lifetime`);
  if (rule.chips) parts.push(`${rule.chips} chips`);
  if (rule.ascensions) parts.push(`${rule.ascensions} ascensions`);
  if (rule.skill) parts.push(`${rule.skill} rank ${rule.skillRank || 1}`);
  return parts.join(" and ");
}

function discountFactor(type) {
  if (type === "upgrade") return Math.max(0.25, 1 - derived.upDiscount);
  return Math.max(0.2, 1 - derived.genDiscount);
}

function calculateBulkCost(baseCost, costScale, ownedCount, quantity) {
  if (quantity <= 0) return 0;
  if (costScale === 1) return baseCost * quantity;
  const first = baseCost * costScale ** ownedCount;
  return first * ((costScale ** quantity - 1) / (costScale - 1));
}

function maxAffordable(baseCost, costScale, ownedCount, cookies, maxQ = Number.POSITIVE_INFINITY) {
  if (cookies <= 0) return 0;
  if (costScale === 1) return Math.min(maxQ, Math.floor(cookies / baseCost));
  const first = baseCost * costScale ** ownedCount;
  if (cookies < first) return 0;
  const n = Math.floor(Math.log((cookies * (costScale - 1)) / first + 1) / Math.log(costScale));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(maxQ, n));
}

function wantedQty() {
  if (state.ui.buyMode === "MAX") return Number.POSITIVE_INFINITY;
  return Number.parseInt(state.ui.buyMode.replace("x", ""), 10) || 1;
}

function quote(item, owned, maxAllowed, type) {
  const base = item.baseCost * discountFactor(type);
  const desired = wantedQty();
  const cap = Number.isFinite(maxAllowed) ? maxAllowed : 1000000;
  const q = desired === Number.POSITIVE_INFINITY
    ? maxAffordable(base, item.costScale, owned, state.cookies, cap)
    : Math.max(0, Math.min(desired, cap));
  return { q, cost: calculateBulkCost(base, item.costScale, owned, q) };
}

function applyEffect(type, value, stacks = 1) {
  if (stacks <= 0 || value === 0) return;
  if (type === "click_base_add") derived.clickBase += value * stacks;
  else if (type === "combo_cap_add") derived.comboCap += value * stacks;
  else if (type === "combo_gain_add") derived.comboGain += value * stacks;
  else if (type === "crit_chance_add") derived.critChance += value * stacks;
  else if (type === "crit_power_add") derived.critPower += value * stacks;
  else if (type === "click_mult") derived.clickMult *= (1 + value) ** stacks;
  else if (type === "generator_mult") derived.genMult *= (1 + value) ** stacks;
  else if (type === "charge_gain_mult") derived.chargeGain *= (1 + value) ** stacks;
  else if (type === "buff_chance_add") derived.buffChance += value * stacks;
  else if (type === "buff_duration_mult") derived.buffDuration *= (1 + value) ** stacks;
  else if (type === "offline_mult") derived.offline *= (1 + value) ** stacks;
  else if (type === "chip_power_add") derived.chipPower += value * stacks;
  else if (type === "skill_gain_mult") derived.skillGain *= (1 + value) ** stacks;
  else if (type === "upgrade_discount_add") derived.upDiscount += value * stacks;
  else if (type === "generator_discount_add") derived.genDiscount += value * stacks;
  else if (type === "charge_boost_mult") derived.chargeBoost *= (1 + value) ** stacks;
  else if (type === "rare_buff_weight_add") derived.rainWeight += value * stacks;
}

function applySkillEffects() {
  for (const s of skills) {
    const rank = skillRank(s.id);
    if (rank > 0) applyEffect(s.effectType, s.effectValue, rank);
  }
}

function recomputeDerived() {
  derived = makeDerived();
  for (const [type, value] of Object.entries(state.permanentBonuses)) applyEffect(type, value, 1);
  applySkillEffects();
  for (const up of upgrades) {
    const n = upCount(up.id);
    if (n > 0) applyEffect(up.effectType, up.effectValue, n);
  }
  derived.comboCap = Math.max(1.2, derived.comboCap);
  derived.comboGain = Math.max(0.02, derived.comboGain);
  derived.critChance = Math.min(0.95, Math.max(0, derived.critChance));
  derived.critPower = Math.max(1.1, derived.critPower);
  derived.buffChance = Math.max(0.002, derived.buffChance);
  derived.chargeDecay = Math.max(0.12, derived.chargeDecay);
  derived.upDiscount = Math.min(0.65, Math.max(0, derived.upDiscount));
  derived.genDiscount = Math.min(0.7, Math.max(0, derived.genDiscount));
}

function buffsNow() {
  let click = 1;
  let gen = 1;
  let rain = 0;
  for (const active of state.activeBuffs) {
    const b = BUFFS[active.id];
    if (!b) continue;
    click *= b.click;
    gen *= b.gen;
    rain += b.rain;
  }
  return { click, gen, rain };
}

function chargeBoost() { return 1 + (state.clickCharge / 100) * 0.7 * derived.chargeBoost; }
function clickValue() {
  const b = buffsNow();
  return derived.clickBase * derived.clickMult * ascendMult() * state.comboMultiplier * b.click;
}
function cookiesPerSecond(withCharge = true) {
  const base = generators.reduce((sum, g) => sum + g.cps * genCount(g.id), 0);
  const b = buffsNow();
  let mult = derived.genMult * ascendMult() * b.gen;
  if (withCharge) mult *= chargeBoost();
  return base * mult;
}

function addCookies(amount, source = "generator") {
  if (!Number.isFinite(amount) || amount <= 0) return;
  state.cookies += amount;
  state.lifetimeCookies += amount;
  if (source === "manual") state.stats.manualCookies += amount;
  else state.stats.generatorCookies += amount;
}

function addPermanent(type, value) {
  if (MULT_EFFECTS.has(type)) {
    const current = state.permanentBonuses[type] || 0;
    state.permanentBonuses[type] = (1 + current) * (1 + value) - 1;
  } else {
    state.permanentBonuses[type] = (state.permanentBonuses[type] || 0) + value;
  }
}

function effectText(type, value) {
  if (type === "click_mult") return `+${(value * 100).toFixed(1)}% click`;
  if (type === "generator_mult") return `+${(value * 100).toFixed(1)}% generator`;
  if (type === "skill_gain_mult") return `+${(value * 100).toFixed(1)}% ascension SP`;
  if (type === "chip_power_add") return `+${(value * 100).toFixed(1)}% chip power`;
  if (type === "charge_gain_mult") return `+${(value * 100).toFixed(1)}% charge gain`;
  return `${type} ${(value * 100).toFixed(1)}%`;
}

function rewardText(r) {
  if (!r) return "No reward";
  if (r.type === "cookies") return `+${fmt(r.amount)} cookies`;
  if (r.type === "chips") return `+${r.amount} chips`;
  if (r.type === "skill_points") return `+${r.amount} skill points`;
  if (r.type === "permanent_bonus") return `Permanent: ${effectText(r.effectType, r.value)}`;
  return "Reward";
}

function applyReward(reward, label, silent = false) {
  if (!reward) return;
  if (reward.type === "cookies") addCookies(reward.amount, "generator");
  else if (reward.type === "chips") state.chips += reward.amount;
  else if (reward.type === "skill_points") state.skillPoints += reward.amount;
  else if (reward.type === "permanent_bonus") {
    addPermanent(reward.effectType, reward.value);
    recomputeDerived();
  }
  if (!silent) toast(`${label}: ${rewardText(reward)}`);
}

function critRoll() { return Math.random() < derived.critChance ? derived.critPower : 1; }

function activateBuff(id) {
  const buff = BUFFS[id];
  if (!buff) return;
  state.activeBuffs.push({ id: buff.id, expiresAt: Date.now() + buff.durationSec * 1000 * derived.buffDuration });
  state.stats.buffsTriggered += 1;
  toast(`Buff activated: ${buff.name}`);
}

function rollBuff() {
  if (state.clickCharge < 70) return;
  let chance = derived.buffChance * (1 + (state.clickCharge - 70) / 55);
  if (state.activeBuffs.length >= 2) chance *= 0.35;
  if (Math.random() >= chance) return;

  const active = new Set(state.activeBuffs.map((b) => b.id));
  const options = BUFF_LIST.filter((b) => !active.has(b.id));
  if (!options.length) return;

  const weights = options.map((b) => (b.id === "golden-rain" ? Math.max(0.1, b.w + derived.rainWeight) : b.w));
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = Math.random() * total;
  for (let i = 0; i < options.length; i += 1) {
    pick -= weights[i];
    if (pick <= 0) {
      activateBuff(options[i].id);
      break;
    }
  }
}

function decayCharge(dt) {
  state.clickCharge = Math.max(0, state.clickCharge - 4 * derived.chargeDecay * dt);
}
function chargeFromClick(now) {
  let gain = 3;
  if (state.lastClickAt > 0) {
    const delta = now - state.lastClickAt;
    gain = delta <= 450 ? 11 : delta <= 850 ? 7 : 3;
  }
  gain *= derived.chargeGain;
  if (state.comboMultiplier > 1.5) gain *= 1.08;
  state.clickCharge = Math.min(100, state.clickCharge + gain);
  state.lastClickAt = now;
}

function clickCookie() {
  const now = Date.now();
  const live = now <= state.comboExpiresAt;
  state.comboMultiplier = live ? Math.min(state.comboMultiplier + derived.comboGain, derived.comboCap) : 1;
  state.comboExpiresAt = now + 1450;
  chargeFromClick(now);

  const crit = critRoll();
  const gain = clickValue() * crit;
  addCookies(gain, "manual");
  state.clicks += 1;
  if (crit > 1) toast(`Critical click! x${crit.toFixed(2)}`);
  state.stats.highestCombo = Math.max(state.stats.highestCombo, state.comboMultiplier);

  rollBuff();
  checkAchievements();
  ensureChallenge();
  render();
}

function checkGenMilestones(id, fromOwned, toOwned) {
  const gen = generators.find((g) => g.id === id);
  if (!gen) return;
  for (const t of [25, 50, 100]) {
    if (fromOwned < t && toOwned >= t) {
      const key = `${id}-${t}`;
      if (state.generatorMilestonesClaimed[key]) continue;
      state.generatorMilestonesClaimed[key] = true;
      applyReward(gen.milestoneRewards[t], `${gen.name} milestone ${t}`);
    }
  }
}

function buyUpgrade(id) {
  const up = upgrades.find((u) => u.id === id);
  if (!up || !ruleOk(up.unlockRule)) return;
  const owned = upCount(id);
  const remaining = Math.max(0, up.max - owned);
  if (remaining <= 0) return;
  const q = quote(up, owned, remaining, "upgrade");
  if (q.q <= 0 || state.cookies + 1e-9 < q.cost) return;
  state.cookies -= q.cost;
  state.upgradesBought[id] = owned + q.q;
  state.stats.totalPurchases += q.q;
  recomputeDerived();
  checkAchievements();
  render();
}

function buyGenerator(id) {
  const gen = generators.find((g) => g.id === id);
  if (!gen || !ruleOk(gen.unlockRule)) return;
  const owned = genCount(id);
  const q = quote(gen, owned, Number.POSITIVE_INFINITY, "generator");
  if (q.q <= 0 || state.cookies + 1e-9 < q.cost) return;
  state.cookies -= q.cost;
  const next = owned + q.q;
  state.generatorsOwned[id] = next;
  state.stats.totalPurchases += q.q;
  checkGenMilestones(id, owned, next);
  checkAchievements();
  render();
}

function skillOpen(s) {
  if (!ruleOk(s.unlockRule)) return false;
  if (s.prereq && skillRank(s.prereq) <= 0) return false;
  return true;
}

function skillCost(s) { return Math.floor(s.baseCost * s.costScale ** skillRank(s.id)); }
function buySkill(id) {
  const s = skills.find((k) => k.id === id);
  if (!s) return;
  const rank = skillRank(s.id);
  if (rank >= s.maxRank || !skillOpen(s)) return;
  const cost = skillCost(s);
  if (state.skillPoints < cost) return;
  state.skillPoints -= cost;
  state.skillsUnlocked[s.id] = rank + 1;
  recomputeDerived();
  checkAchievements();
  render();
}

function claimAchievement(id, silent = false) {
  const a = achievements.find((x) => x.id === id);
  if (!a || !state.achievements[id] || state.achievementClaims[id]) return false;
  state.achievementClaims[id] = true;
  state.stats.achievementsClaimed += 1;
  applyReward(a.reward, `Achievement ${a.title}`, silent);
  return true;
}

function claimAllAchievements() {
  let c = 0;
  for (const a of achievements) if (claimAchievement(a.id, true)) c += 1;
  if (c > 0) {
    toast(`Claimed ${c} achievement rewards.`);
    render();
  }
}

function ascend() {
  const totalChips = chipsFromLifetime(state.lifetimeCookies);
  const gainChips = totalChips - state.chips;
  if (gainChips <= 0) {
    toast("Need more lifetime cookies for Golden Chips.");
    return;
  }
  const gainSP = spFromAscend(gainChips);

  state.chips = totalChips;
  state.skillPoints += gainSP;
  state.stats.ascensions += 1;

  state.cookies = 0;
  state.comboMultiplier = 1;
  state.comboExpiresAt = 0;
  state.clickCharge = 0;
  state.lastClickAt = 0;
  state.upgradesBought = {};
  state.generatorsOwned = {};
  state.activeBuffs = [];

  recomputeDerived();
  checkAchievements();
  toast(`Ascended: +${gainChips} chips, +${gainSP} SP.`);
  render();
}
function ensureChallenge() {
  const slot = Math.floor(Date.now() / CHALLENGE_ROTATION_MS);
  if (state.challenge.slot === slot) return;
  state.challenge.slot = slot;
  state.challenge.idx = slot % CHALLENGES.length;
  const ch = CHALLENGES[state.challenge.idx];
  state.challenge.baseline = { [ch.key]: metricValue(ch.key) };
}
function currentChallenge() { ensureChallenge(); return CHALLENGES[state.challenge.idx]; }
function challengeGoal(ch) { return ch.goal(state.challenge.slot); }
function challengeProgress(ch) {
  const base = state.challenge.baseline[ch.key] || 0;
  return Math.max(0, metricValue(ch.key) - base);
}
function challengeClaimed() { return Boolean(state.challenge.claimedSlots[state.challenge.slot]); }
function claimChallenge() {
  const ch = currentChallenge();
  const goal = challengeGoal(ch);
  const prog = challengeProgress(ch);
  if (prog < goal || challengeClaimed()) return;
  state.challenge.claimedSlots[state.challenge.slot] = true;
  state.stats.challengeCompletions += 1;
  applyReward(ch.reward, `Challenge ${ch.title}`);
  render();
}

function makeAchievement(cfg) {
  return {
    id: cfg.id,
    title: cfg.title,
    description: cfg.description,
    conditionText: cfg.condition,
    reward: cfg.reward,
    rule: () => cfg.metric() >= cfg.target,
    progress: () => ({ current: cfg.metric(), target: cfg.target }),
  };
}

function buildAchievements() {
  achievements.length = 0;

  const clickTargets = [1, 25, 100, 500, 2000, 10000];
  const clickRewards = [
    { type: "cookies", amount: 50 },
    { type: "cookies", amount: 500 },
    { type: "skill_points", amount: 1 },
    { type: "permanent_bonus", effectType: "click_mult", value: 0.02 },
    { type: "skill_points", amount: 1 },
    { type: "permanent_bonus", effectType: "charge_gain_mult", value: 0.05 },
  ];
  clickTargets.forEach((t, i) => achievements.push(makeAchievement({
    id: `click-${t}`,
    title: `Click Cadence ${i + 1}`,
    description: "Build manual rhythm.",
    condition: `Make ${fmtInt(t)} clicks.`,
    target: t,
    metric: () => state.clicks,
    reward: clickRewards[i],
  })));

  const lifetimeTargets = [1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000];
  lifetimeTargets.forEach((t, i) => achievements.push(makeAchievement({
    id: `life-${t}`,
    title: `Empire Scale ${i + 1}`,
    description: "Grow across ascensions.",
    condition: `Reach ${fmtInt(t)} lifetime cookies.`,
    target: t,
    metric: () => state.lifetimeCookies,
    reward: i % 2 === 0 ? { type: "skill_points", amount: 1 } : { type: "permanent_bonus", effectType: "generator_mult", value: 0.012 },
  })));

  const cpsTargets = [10, 50, 200, 1000, 5000, 25000, 100000];
  cpsTargets.forEach((t, i) => achievements.push(makeAchievement({
    id: `cps-${t}`,
    title: `Automation Nation ${i + 1}`,
    description: "Scale production speed.",
    condition: `Reach ${fmtInt(t)} CPS.`,
    target: t,
    metric: () => cookiesPerSecond(true),
    reward: i < 3 ? { type: "cookies", amount: t * 300 } : { type: "permanent_bonus", effectType: "generator_mult", value: 0.01 + i * 0.002 },
  })));

  const ascTargets = [1, 3, 10, 25];
  const ascRewards = [
    { type: "skill_points", amount: 2 },
    { type: "permanent_bonus", effectType: "chip_power_add", value: 0.008 },
    { type: "skill_points", amount: 3 },
    { type: "permanent_bonus", effectType: "skill_gain_mult", value: 0.12 },
  ];
  ascTargets.forEach((t, i) => achievements.push(makeAchievement({
    id: `asc-${t}`,
    title: `Legacy Builder ${i + 1}`,
    description: "Ascend repeatedly.",
    condition: `Complete ${t} ascensions.`,
    target: t,
    metric: () => state.stats.ascensions,
    reward: ascRewards[i],
  })));

  const chipTargets = [5, 25, 100, 250];
  const chipRewards = [
    { type: "skill_points", amount: 1 },
    { type: "permanent_bonus", effectType: "chip_power_add", value: 0.012 },
    { type: "skill_points", amount: 2 },
    { type: "permanent_bonus", effectType: "generator_mult", value: 0.03 },
  ];
  chipTargets.forEach((t, i) => achievements.push(makeAchievement({
    id: `chips-${t}`,
    title: `Golden Legacy ${i + 1}`,
    description: "Accumulate Golden Chips.",
    condition: `Own ${t} chips.`,
    target: t,
    metric: () => state.chips,
    reward: chipRewards[i],
  })));

  for (const g of generators) {
    achievements.push(makeAchievement({
      id: `own-${g.id}-25`,
      title: `${g.name} Quartermaster`,
      description: "Hit ownership milestone.",
      condition: `Own 25 ${g.name}.`,
      target: 25,
      metric: () => genCount(g.id),
      reward: g.tier <= 4
        ? { type: "cookies", amount: g.baseCost * 600 }
        : g.tier <= 8
          ? { type: "permanent_bonus", effectType: "generator_mult", value: 0.012 }
          : { type: "skill_points", amount: 1 },
    }));
  }

  const buffTargets = [1, 25, 150];
  const buffRewards = [
    { type: "cookies", amount: 40000 },
    { type: "skill_points", amount: 2 },
    { type: "permanent_bonus", effectType: "buff_chance_add", value: 0.01 },
  ];
  buffTargets.forEach((t, i) => achievements.push(makeAchievement({
    id: `buff-${t}`,
    title: `Buff Conductor ${i + 1}`,
    description: "Trigger click buffs.",
    condition: `Trigger ${t} buffs.`,
    target: t,
    metric: () => state.stats.buffsTriggered,
    reward: buffRewards[i],
  })));

  achievements.push(makeAchievement({
    id: "skills-5",
    title: "Skill Architect",
    description: "Invest into skill tree.",
    condition: "Unlock 5 skill nodes.",
    target: 5,
    metric: () => unlockedSkillNodes(),
    reward: { type: "permanent_bonus", effectType: "skill_gain_mult", value: 0.1 },
  }));
}

function checkAchievements() {
  for (const a of achievements) {
    if (!state.achievements[a.id] && a.rule()) {
      state.achievements[a.id] = true;
      toast(`Achievement unlocked: ${a.title}`);
    }
  }
}

function renderBuffs() {
  if (!state.activeBuffs.length) {
    el.activeBuffs.innerHTML = "<small>No active buffs</small>";
    return;
  }
  const now = Date.now();
  el.activeBuffs.innerHTML = state.activeBuffs.map((x) => {
    const b = BUFFS[x.id];
    if (!b) return "";
    return `<div class="buff-chip">${b.name} (${dur((x.expiresAt - now) / 1000)})</div>`;
  }).join("");
}

function renderStore() {
  const filter = state.ui.storeFilter;
  el.upgradeList.innerHTML = "";

  for (const up of upgrades) {
    if (filter !== "all" && up.category !== filter) continue;
    const unlocked = ruleOk(up.unlockRule);
    const owned = upCount(up.id);
    const atCap = owned >= up.max;
    const q = quote(up, owned, up.max - owned, "upgrade");
    const can = unlocked && q.q > 0 && state.cookies >= q.cost;

    const card = document.createElement("article");
    card.className = `item ${unlocked ? "" : "locked"}`;
    card.innerHTML = `
      <strong><span>${up.name}</span><span>${atCap ? "MAX" : `${fmt(q.cost)} (${state.ui.buyMode})`}</span></strong>
      <p>${up.description}</p>
      <p>${up.category.toUpperCase()} | ${owned}/${up.max}</p>
      <p>${unlocked ? `Effect: ${effectText(up.effectType, up.effectValue)}` : `Unlock: ${ruleText(up.unlockRule)}`}</p>
      <button class="inline-btn" data-buy-upgrade="${up.id}" ${can && !atCap ? "" : "disabled"}>Buy</button>
    `;
    el.upgradeList.append(card);
  }

  el.generatorList.innerHTML = "";
  for (const gen of generators) {
    const unlocked = ruleOk(gen.unlockRule);
    const owned = genCount(gen.id);
    const q = quote(gen, owned, Number.POSITIVE_INFINITY, "generator");
    const can = unlocked && q.q > 0 && state.cookies >= q.cost;
    const nextT = [25, 50, 100].find((t) => owned < t);
    const nextTxt = nextT ? `Next milestone ${nextT} (in ${nextT - owned})` : "All milestones done";

    const roiBase = Math.max(1, q.q);
    const addedCps = gen.cps * roiBase * derived.genMult * ascendMult();
    const roi = addedCps > 0 ? `${fmt(q.cost / addedCps)}s` : "--";

    const card = document.createElement("article");
    card.className = `item ${unlocked ? "" : "locked"}`;
    card.innerHTML = `
      <strong><span>${gen.name}</span><span>${fmt(q.cost)} (${state.ui.buyMode})</span></strong>
      <p>${gen.description}</p>
      <p>Owned ${owned} | +${fmt(gen.cps)} CPS each | ROI ${roi}</p>
      <p>${unlocked ? nextTxt : `Unlock: ${ruleText(gen.unlockRule)}`}</p>
      <button class="inline-btn" data-buy-generator="${gen.id}" ${can ? "" : "disabled"}>Hire</button>
    `;
    el.generatorList.append(card);
  }
}

function nextSkillText() {
  if (state.stats.ascensions < 1) return "Ascend once to unlock skill tree.";
  const open = skills.filter((s) => skillRank(s.id) < s.maxRank && skillOpen(s)).sort((a, b) => skillCost(a) - skillCost(b));
  if (open.length) return `Next skill: ${open[0].name} (${skillCost(open[0])} SP)`;
  const locked = skills.filter((s) => skillRank(s.id) < s.maxRank && !skillOpen(s)).sort((a, b) => (a.unlockRule?.chips || 0) - (b.unlockRule?.chips || 0));
  if (!locked.length) return "All skill nodes maxed.";
  return `Next skill unlock: ${locked[0].name} (${ruleText(locked[0].unlockRule)})`;
}

function nextAchievementText() {
  const claimable = achievements.find((a) => state.achievements[a.id] && !state.achievementClaims[a.id]);
  if (claimable) return `Claim available: ${claimable.title}`;

  let best = null;
  let bestRatio = -1;
  for (const a of achievements) {
    if (state.achievements[a.id]) continue;
    const p = a.progress();
    const ratio = p.target > 0 ? p.current / p.target : 0;
    if (ratio > bestRatio) {
      best = a;
      bestRatio = ratio;
    }
  }
  return best ? `Closest achievement: ${best.title}` : "All achievements unlocked.";
}

function renderMilestones() {
  const nextNeed = lifetimeForChips(state.chips + 1);
  el.nextMilestones.innerHTML = [
    `Next ascend breakpoint: ${fmt(nextNeed)} lifetime cookies`,
    nextSkillText(),
    nextAchievementText(),
  ].map((txt) => `<li>${txt}</li>`).join("");
}

function renderChallenge() {
  const ch = currentChallenge();
  const goal = challengeGoal(ch);
  const prog = challengeProgress(ch);
  const claimed = challengeClaimed();
  const done = prog >= goal;
  const now = Date.now();
  const left = ((state.challenge.slot + 1) * CHALLENGE_ROTATION_MS - now) / 1000;

  el.challengeCard.innerHTML = `
    <strong><span>${ch.title}</span><span>${dur(left)}</span></strong>
    <p>${ch.description}</p>
    <p class="progress">Progress: ${fmt(prog)} / ${fmt(goal)}</p>
    <p class="reward">Reward: ${rewardText(ch.reward)}</p>
    <button class="claim-btn" data-claim-challenge="1" ${done && !claimed ? "" : "disabled"}>${claimed ? "Claimed" : "Claim"}</button>
  `;
}

function renderSkills() {
  if (state.stats.ascensions < 1) {
    el.skillTree.innerHTML = `<article class="skill-card locked"><strong><span>Skill Tree Locked</span></strong><p>Ascend once to unlock persistent skills.</p></article>`;
    return;
  }

  el.skillTree.innerHTML = BRANCHES.map((branch) => {
    const rows = skills.filter((s) => s.branch === branch).map((s) => {
      const rank = skillRank(s.id);
      const maxed = rank >= s.maxRank;
      const open = skillOpen(s);
      const cost = skillCost(s);
      const can = !maxed && open && state.skillPoints >= cost;
      const status = !open && rank === 0
        ? (s.prereq && skillRank(s.prereq) === 0 ? `Requires ${s.prereq}` : `Requires ${ruleText(s.unlockRule)}`)
        : `Cost ${cost} SP`;
      return `
        <article class="skill-card ${open || rank > 0 ? "" : "locked"}">
          <strong><span>${s.name}</span><span>${rank}/${s.maxRank}</span></strong>
          <p>${s.description}</p>
          <p>${status}</p>
          <button class="inline-btn" data-buy-skill="${s.id}" ${can ? "" : "disabled"}>${maxed ? "MAX" : "Learn"}</button>
        </article>
      `;
    }).join("");
    return `<section class="branch"><h3>${branch}</h3>${rows}</section>`;
  }).join("");
}

function renderAchievements() {
  el.achievementList.innerHTML = "";
  for (const a of achievements) {
    const unlocked = Boolean(state.achievements[a.id]);
    const claimed = Boolean(state.achievementClaims[a.id]);
    const p = a.progress();
    const li = document.createElement("li");
    li.className = unlocked ? "" : "locked";
    li.innerHTML = `
      <strong><span>${a.title}</span><span>${claimed ? "Claimed" : unlocked ? "Unlocked" : "Locked"}</span></strong>
      <p>${a.description}</p>
      <p>${a.conditionText}</p>
      <p class="progress">Progress: ${fmt(p.current)} / ${fmt(p.target)}</p>
      <p class="reward">Reward: ${rewardText(a.reward)}</p>
      <button class="claim-btn" data-claim-achievement="${a.id}" ${unlocked && !claimed ? "" : "disabled"}>Claim Reward</button>
    `;
    el.achievementList.append(li);
  }
}

function renderProgress() {
  const cps = cookiesPerSecond(true);
  state.stats.highestCps = Math.max(state.stats.highestCps, cps);
  const perClick = clickValue();

  const targetChips = chipsFromLifetime(state.lifetimeCookies);
  const chipGain = Math.max(0, targetChips - state.chips);
  const spGain = spFromAscend(chipGain);

  el.cookies.textContent = fmt(state.cookies);
  el.perClick.textContent = fmt(perClick);
  el.perSecond.textContent = fmt(cps);
  el.clickCharge.textContent = `${state.clickCharge.toFixed(0)}%`;
  el.combo.textContent = `x${state.comboMultiplier.toFixed(2)}`;
  el.comboHint.textContent = `Combo cap x${derived.comboCap.toFixed(2)} | Charge boost ${(chargeBoost() * 100 - 100).toFixed(0)}%`;

  el.lifetime.textContent = fmt(state.lifetimeCookies);
  el.chips.textContent = String(state.chips);
  el.skillPoints.textContent = String(state.skillPoints);
  el.clicks.textContent = fmtInt(state.clicks);

  el.ascendHint.textContent = chipGain > 0
    ? `Ascend now for +${chipGain} chips.`
    : `Next chip at ${fmt(lifetimeForChips(state.chips + 1))} lifetime cookies.`;

  const nowBonus = (ascendMult(state.chips) - 1) * 100;
  const nextBonus = (ascendMult(targetChips) - 1) * 100;
  el.ascendPreview.textContent = `Preview: +${chipGain} chips, +${spGain} SP, bonus ${nowBonus.toFixed(0)}% -> ${nextBonus.toFixed(0)}%`;
}

function render() {
  renderProgress();
  renderBuffs();
  renderStore();
  renderMilestones();
  renderChallenge();
  renderSkills();
  renderAchievements();
}

function tick() {
  const now = Date.now();
  const dt = Math.min((now - state.lastTickAt) / 1000, 1);
  state.lastTickAt = now;

  if (now > state.comboExpiresAt) state.comboMultiplier = 1;
  decayCharge(dt);
  state.activeBuffs = state.activeBuffs.filter((b) => b.expiresAt > now);

  const cps = cookiesPerSecond(true);
  addCookies(cps * dt, "generator");
  const b = buffsNow();
  if (b.rain > 0) addCookies(cps * b.rain * dt, "generator");

  checkAchievements();
  ensureChallenge();

  if (now - state.lastSavedAt >= AUTO_SAVE_MS) save(false);
  render();
}
function save(show = true) {
  state.lastSavedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  if (show) toast("Game saved.");
}

function load() {
  let removedLegacy = false;
  for (const key of LEGACY_SAVE_KEYS) {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      removedLegacy = true;
    }
  }

  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    if (removedLegacy) toast("V2 update applied: old save reset for new progression.");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      localStorage.removeItem(SAVE_KEY);
      state = makeState();
      toast("Save reset due to major progression update.");
      return;
    }

    const base = makeState();
    state = {
      ...base,
      ...parsed,
      upgradesBought: parsed.upgradesBought || {},
      generatorsOwned: parsed.generatorsOwned || {},
      skillsUnlocked: parsed.skillsUnlocked || {},
      achievements: parsed.achievements || {},
      achievementClaims: parsed.achievementClaims || {},
      activeBuffs: Array.isArray(parsed.activeBuffs) ? parsed.activeBuffs : [],
      permanentBonuses: parsed.permanentBonuses || {},
      generatorMilestonesClaimed: parsed.generatorMilestonesClaimed || {},
      challenge: {
        ...base.challenge,
        ...(parsed.challenge || {}),
        baseline: (parsed.challenge && parsed.challenge.baseline) || {},
        claimedSlots: (parsed.challenge && parsed.challenge.claimedSlots) || {},
      },
      stats: {
        ...base.stats,
        ...(parsed.stats || {}),
      },
      ui: {
        ...base.ui,
        ...(parsed.ui || {}),
      },
    };

    recomputeDerived();
    ensureChallenge();

    const awaySec = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (Date.now() - (state.lastSavedAt || Date.now())) / 1000));
    if (awaySec > 5) {
      const gain = cookiesPerSecond(false) * awaySec * derived.offline;
      addCookies(gain, "generator");
      toast(`Offline gain: +${fmt(gain)} cookies`);
    }

    if (removedLegacy) toast("Legacy save removed; V2 schema is active.");
  } catch {
    localStorage.removeItem(SAVE_KEY);
    state = makeState();
    toast("Corrupted save removed.");
  }
}

function reset() {
  localStorage.removeItem(SAVE_KEY);
  for (const key of LEGACY_SAVE_KEYS) localStorage.removeItem(key);
  location.reload();
}

function populateControls() {
  el.buyMode.innerHTML = BUY_MODES.map((m) => `<option value="${m}">${m}</option>`).join("");
  el.storeFilter.innerHTML = STORE_FILTERS.map((f) => `<option value="${f}">${f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}</option>`).join("");

  if (!BUY_MODES.includes(state.ui.buyMode)) state.ui.buyMode = "x1";
  if (!STORE_FILTERS.includes(state.ui.storeFilter)) state.ui.storeFilter = "all";
  el.buyMode.value = state.ui.buyMode;
  el.storeFilter.value = state.ui.storeFilter;
}

function wire() {
  el.clickBtn.addEventListener("click", clickCookie);
  el.saveBtn.addEventListener("click", () => save(true));
  el.ascendBtn.addEventListener("click", ascend);
  el.claimAllBtn.addEventListener("click", claimAllAchievements);

  el.buyMode.addEventListener("change", () => {
    state.ui.buyMode = el.buyMode.value;
    renderStore();
  });
  el.storeFilter.addEventListener("change", () => {
    state.ui.storeFilter = el.storeFilter.value;
    renderStore();
  });

  el.resetBtn.addEventListener("click", () => {
    const ok = confirm("Reset all progress? This cannot be undone.");
    if (ok) reset();
  });

  el.upgradeList.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-buy-upgrade]");
    if (b) buyUpgrade(b.dataset.buyUpgrade);
  });
  el.generatorList.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-buy-generator]");
    if (b) buyGenerator(b.dataset.buyGenerator);
  });
  el.skillTree.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-buy-skill]");
    if (b) buySkill(b.dataset.buySkill);
  });
  el.achievementList.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-claim-achievement]");
    if (!b) return;
    if (claimAchievement(b.dataset.claimAchievement)) render();
  });
  el.challengeCard.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-claim-challenge]");
    if (b) claimChallenge();
  });
}

buildAchievements();
load();
recomputeDerived();
populateControls();
wire();
checkAchievements();
render();
setInterval(tick, TICK_MS);
