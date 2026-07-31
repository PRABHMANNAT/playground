export type TesterWorkspaceSeverity = "Confusing" | "Broken" | "Trust";

export type TesterWorkspaceTask = {
  id: number;
  title: string;
  completed: boolean;
};

export type TesterWorkspacePin = {
  id: string;
  xPercent: number;
  yPercent: number;
  severity: TesterWorkspaceSeverity;
  note: string;
  label: string;
};

export type TesterWorkspaceSeed = {
  runId: string;
  founderDecision: string;
  productUrl: string;
  productScreenshot: string;
  tester: { firstName: string; lastName: string; rate: number };
  tasks: TesterWorkspaceTask[];
  pins: TesterWorkspacePin[];
  startedAt: Date;
};

const TASKS: TesterWorkspaceTask[] = [
  { id: 1, title: "Explain what the product does in one sentence.", completed: false },
  { id: 2, title: "Find how it works.", completed: false },
  { id: 3, title: "Attempt to request a demo.", completed: false },
  { id: 4, title: "Mark anything that reduces trust.", completed: false },
];

const testerWorkspaceSeed: TesterWorkspaceSeed = {
  runId: "RUN_CMP_001",
  founderDecision: "Can a recruiter understand the product and request a demo?",
  productUrl: "https://www.ingenworkspace.com",
  productScreenshot: "/demo/ingen-hero.svg",
  tester: { firstName: "Sarah", lastName: "Chen", rate: 3000 },
  tasks: TASKS,
  pins: [],
  startedAt: new Date(),
};

function cloneSeed(seed: TesterWorkspaceSeed): TesterWorkspaceSeed {
  return {
    ...seed,
    tester: { ...seed.tester },
    tasks: seed.tasks.map((task) => ({ ...task })),
    pins: seed.pins.map((pin) => ({ ...pin })),
    startedAt: new Date(),
  };
}

export function createTesterWorkspaceSeed(runId = testerWorkspaceSeed.runId) {
  return cloneSeed({ ...testerWorkspaceSeed, runId });
}

export function openPrefilledDemo(runId = testerWorkspaceSeed.runId): TesterWorkspaceSeed {
  const seed = createTesterWorkspaceSeed(runId);
  seed.tasks = seed.tasks.map((task, index) => ({ ...task, completed: index < 2 }));
  seed.pins = [
    {
      id: "pin-demo-pricing",
      xPercent: 69.4,
      yPercent: 47.5,
      severity: "Confusing",
      label: "Pricing headline",
      note: "Two paid plans read almost identically, so I cannot tell which team each is for.",
    },
    {
      id: "pin-demo-proof",
      xPercent: 42.8,
      yPercent: 63.2,
      severity: "Trust",
      label: "Candidate proof",
      note: "The proof claim needs one real candidate example before I would request a demo.",
    },
  ];
  return seed;
}

export default testerWorkspaceSeed;
