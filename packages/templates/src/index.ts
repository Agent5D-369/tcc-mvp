export type WorkspaceTemplate = {
  id: string;
  name: string;
  category: string;
  summary: string;
  projectName: string;
  projectSummary: string;
  tasks: Array<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
  }>;
  helpsPrevent: string[];
};

export const workspaceTemplates: WorkspaceTemplate[] = [
  {
    id: "team-charter",
    name: "Team Charter",
    category: "Foundation",
    summary: "Clarify purpose, boundaries, accountabilities, success measures, cadence, and next review date.",
    projectName: "Team Charter Setup",
    projectSummary: "Create a one-page operating charter so the team knows what it exists to do, what it owns, and when the agreement will be reviewed.",
    helpsPrevent: ["vision drift", "unclear authority", "scale confusion"],
    tasks: [
      {
        title: "Draft purpose and scope",
        description: "Write why this team exists, what it serves, and what work belongs outside its scope.",
        priority: "high",
      },
      {
        title: "Define decision domains",
        description: "List what this team can decide without additional approval and what requires escalation.",
        priority: "high",
      },
      {
        title: "Choose 2-3 health metrics",
        description: "Pick measurable signals that show whether the team is producing value without burning people out.",
        priority: "medium",
      },
      {
        title: "Set the charter review date",
        description: "Schedule a quarterly review so the agreement stays alive instead of becoming shelfware.",
        priority: "medium",
      },
    ],
  },
  {
    id: "roles-and-load",
    name: "Roles and Load Map",
    category: "People",
    summary: "Map responsibilities, role owners, backups, decision rights, and load risks before invisible work piles up.",
    projectName: "Roles and Load Map",
    projectSummary: "Make ownership visible so work does not concentrate on the most responsible people by default.",
    helpsPrevent: ["burnout", "wrong people in key roles", "hidden power"],
    tasks: [
      {
        title: "List active roles and owners",
        description: "Create role cards for current work, including purpose, authority, recurring responsibilities, and backup owner.",
        priority: "high",
      },
      {
        title: "Find unowned or duplicated accountabilities",
        description: "Review current work for responsibilities that nobody owns or that multiple people think they own.",
        priority: "high",
      },
      {
        title: "Run a load check",
        description: "Identify the people carrying too much invisible work and move at least one responsibility into a clearer role.",
        priority: "urgent",
      },
      {
        title: "Set role review cadence",
        description: "Schedule a recurring review to compare written roles with how the work actually happens.",
        priority: "medium",
      },
    ],
  },
  {
    id: "decision-ledger",
    name: "Decision Ledger",
    category: "Governance",
    summary: "Record drivers, proposals, objections, outcomes, owners, and review dates for decisions that matter.",
    projectName: "Decision Ledger Setup",
    projectSummary: "Create a lightweight decision system so agreements stay findable, reviewable, and connected to the reason they were made.",
    helpsPrevent: ["decision amnesia", "governance confusion", "recurring conflict"],
    tasks: [
      {
        title: "Define what must be logged",
        description: "Decide which decisions require a record: money, roles, policies, client commitments, strategy, or risks.",
        priority: "high",
      },
      {
        title: "Create the decision intake fields",
        description: "Use driver, proposal, objections, decision, owner, date, and review date as the minimum fields.",
        priority: "high",
      },
      {
        title: "Review the last five important decisions",
        description: "Backfill the most important recent decisions so the team has immediate continuity.",
        priority: "medium",
      },
      {
        title: "Schedule decision reviews",
        description: "Add review dates for decisions that should not become permanent by accident.",
        priority: "medium",
      },
    ],
  },
  {
    id: "conflict-repair",
    name: "Conflict Repair Path",
    category: "Trust",
    summary: "Create a calm default path for tensions, feedback, escalation, and learning before conflict is hot.",
    projectName: "Conflict Repair Path",
    projectSummary: "Give the team a trusted way to name tension, seek repair, escalate safely, and document what was learned.",
    helpsPrevent: ["unresolved tension", "power shadows", "trust erosion"],
    tasks: [
      {
        title: "Write the first-step repair agreement",
        description: "Define how someone raises tension directly, respectfully, and early.",
        priority: "high",
      },
      {
        title: "Define escalation levels",
        description: "Clarify when a tension stays within the team, when it needs facilitation, and when it becomes a safety or integrity issue.",
        priority: "high",
      },
      {
        title: "Choose a neutral facilitator role",
        description: "Name who can hold process when the people involved cannot resolve the issue alone.",
        priority: "medium",
      },
      {
        title: "Create a learning log",
        description: "Capture resolved tensions as operating lessons without turning the log into blame storage.",
        priority: "medium",
      },
    ],
  },
  {
    id: "dependency-map",
    name: "Dependency Map",
    category: "Coordination",
    summary: "Track cross-team requests, owners, due dates, blockers, and delivery promises in one visible place.",
    projectName: "Dependency Map",
    projectSummary: "Make handoffs and cross-team promises visible so growth does not create silent coordination failure.",
    helpsPrevent: ["scale trap", "missed handoffs", "fragmented communication"],
    tasks: [
      {
        title: "List active dependencies",
        description: "Capture who is waiting on whom, what is needed, and by when.",
        priority: "high",
      },
      {
        title: "Assign a single owner per dependency",
        description: "Every dependency needs one named person responsible for keeping the handoff visible.",
        priority: "high",
      },
      {
        title: "Create blocker review rhythm",
        description: "Set a weekly scan for blocked dependencies and unresolved requests.",
        priority: "medium",
      },
      {
        title: "Define escalation trigger",
        description: "Decide when a missed dependency becomes a leadership or client-risk issue.",
        priority: "medium",
      },
    ],
  },
  {
    id: "financial-reality",
    name: "Financial Reality Check",
    category: "Resilience",
    summary: "Make runway, commitments, revenue dependencies, and founder-energy risks visible enough to act on.",
    projectName: "Financial Reality Check",
    projectSummary: "Create a simple operating view of money and capacity so the team can make grounded commitments.",
    helpsPrevent: ["financial fragility", "overpromising", "founder bottleneck"],
    tasks: [
      {
        title: "Write the current runway picture",
        description: "Summarize cash, committed expenses, expected revenue, and the date when pressure becomes urgent.",
        priority: "urgent",
      },
      {
        title: "Identify single-point dependencies",
        description: "Name any client, funder, founder, or channel the team is overly dependent on.",
        priority: "high",
      },
      {
        title: "Review promises against capacity",
        description: "Compare current commitments with available people, time, and budget.",
        priority: "high",
      },
      {
        title: "Define the next financial review",
        description: "Set a recurring review so money becomes a visible operating signal, not a background anxiety.",
        priority: "medium",
      },
    ],
  },
];

export function getWorkspaceTemplate(id: string) {
  return workspaceTemplates.find((template) => template.id === id) ?? null;
}
