\# Learning Agent — Project Development Protocol



\## 0. Purpose



This repository develops a personal Learning Agent.



The long-term goal is to build an AI learning system that can:



1\. ingest heterogeneous learning sources such as lecture transcripts, slides,

&#x20;  textbooks, manual notes and other materials;

2\. understand a lesson before modifying the knowledge base;

3\. maintain a machine-readable semantic layer corresponding to human-readable

&#x20;  Obsidian notes;

4\. incrementally update a long-term knowledge network;

5\. preserve evidence, provenance, uncertainty and conflicts;

6\. propose changes before modifying knowledge;

7\. support auditing and regression testing;

8\. eventually expose the system through an Obsidian plugin;

9\. optionally integrate external learning systems such as OpenMAIC later.



The current repository is NOT an Obsidian plugin project yet.



The current priority is to build a reproducible Learning Agent experiment

environment and stable internal protocols.



\---



\# 1. Core development principle



Separate:



\- product logic;

\- experiment logic;

\- model/runtime implementation;

\- Obsidian integration.



DSH is currently used as an Agent Runtime.



DSH is NOT the Learning Agent itself.



All core concepts, schemas, prompts, benchmarks and business logic must remain

independent from DSH so that another runtime can replace DSH in the future.



Never couple core Learning Agent logic directly to DSH internals unless a

documented technical reason makes this unavoidable.



\---



\# 2. Human / Agent division of responsibility



The human should primarily perform:



\- architecture approval;

\- semantic judgment;

\- Gold benchmark creation;

\- ambiguity resolution;

\- high-risk knowledge-change review;

\- final acceptance or rejection.



The Agent should perform all reasonable non-review work, including:



\- creating directories;

\- creating files;

\- writing boilerplate;

\- maintaining documentation;

\- writing code;

\- writing tests;

\- validating schemas;

\- generating experiment manifests;

\- managing candidate outputs;

\- producing diffs;

\- running non-destructive checks;

\- preparing Git commits when appropriate.



Do not ask the human to perform mechanical file operations that the Agent can

perform safely.



Prefer exception-driven human interaction:



only request human input when uncertainty, risk or an architectural decision

actually requires it.



\---



\# 3. Repository safety boundaries



\## 3.1 Production Vault boundary



Never modify the user's real Obsidian Vault during development or experiments.



Experiments must use:



\- test-vault/

\- benchmark fixtures;

\- snapshots or copied notes.



Production Vault integration is a future milestone.



\## 3.2 Secrets boundary



Never commit:



\- API keys;

\- access tokens;

\- passwords;

\- `.env`;

\- private credentials.



The repository may contain:



\- `.env.example`;

\- names of required environment variables;

\- non-secret model configuration.



\## 3.3 Runtime boundary



DSH must remain behind a runtime adapter.



Core modules must not directly depend on DSH-specific internal representations.



Preferred conceptual boundary:



Learning Pipeline

&#x20;   -> AgentRuntime interface

&#x20;       -> DSH adapter



Future runtimes must be replaceable without redesigning schemas and learning

protocols.



\## 3.4 Destructive operations



Do not:



\- delete user-created files;

\- rewrite Git history;

\- force push;

\- remove large groups of files;

\- rename major directories;

\- merge experimental branches into main;



without an explicit human review gate.



\---



\# 4. Git policy



`main` represents the current stable runnable project state.



Use feature or experiment branches when changes become substantial.



Branches represent work, not physical computers.



Examples:



\- feature/runtime-abstraction

\- feature/source-map

\- experiment/source-ablation

\- feature/semantic-card



Make small meaningful commits.



Before committing:



1\. validate relevant files;

2\. run available tests;

3\. summarize changes;

4\. ensure no secret is staged.



Do not commit large generated experiment outputs by default.



Generated runs should normally live under:



runs/



and be ignored by Git.



Important experiment results may later be promoted into:



benchmark/results/



after review.



\---



\# 5. Dependency policy



Prefer project-local dependencies.



Do not install or modify global system software unless explicitly approved.



Do not modify DSH source code during normal development.



Pin important runtime dependencies to exact versions where reproducibility

matters.



Record the DSH version used by experiments.



Lockfiles must be committed.



Do not automatically upgrade major dependencies.



\---



\# 6. Architectural layers



The intended architecture currently contains the following conceptual layers.



\## Layer A — Evidence



Raw or minimally transformed sources:



\- lecture transcript;

\- slides;

\- textbook;

\- student notes;

\- board images;

\- other materials.



Evidence is not automatically equivalent to verified knowledge.



\## Layer B — Lesson understanding



The system should model what the current lesson contains before consulting the

existing knowledge network too heavily.



Candidate intermediate artifacts include:



\- SourceMap;

\- LessonModel.



\## Layer C — Machine semantic knowledge



Human-readable notes should eventually have corresponding machine-readable

semantic representations.



The machine layer should NOT duplicate complete human notes.



It should provide semantic coverage through:



\- stable IDs;

\- compact semantic description;

\- section index;

\- relations;

\- provenance;

\- epistemic status;

\- learning-asset index;

\- integrity state.



Working name:



SemanticCard.



\## Layer D — Knowledge alignment



Determine how current lesson knowledge relates to existing knowledge.



Typical operations include:



\- NEW

\- EXPAND

\- REFINE

\- CORRECT

\- EXAMPLE

\- RELATION

\- CONFLICT

\- NO\_CHANGE



\## Layer E — Change planning



Agents must propose structured changes before writing knowledge.



A ChangePlan should describe:



\- what will be created;

\- what will be modified;

\- why;

\- supporting evidence;

\- confidence;

\- risks;

\- items requiring review.



Direct unplanned modification is discouraged.



\## Layer F — Candidate writing



Changes are first applied to a candidate/test state.



They must not directly modify production knowledge.



\## Layer G — Auditing



Expected future audit dimensions include:



\- evidence;

\- source coverage;

\- knowledge architecture;

\- regression;

\- learning utility.



Auditing must distinguish factual correctness from writing quality.



\---



\# 7. Human notes and machine semantic layer



The intended design is:



Human Note

&#x20;   <-> stable knowledge\_id

Semantic Card

&#x20;   -> Evidence



Human notes optimize for human learning and review.



Semantic Cards optimize for:



\- navigation;

\- retrieval;

\- routing;

\- network understanding;

\- change planning;

\- token efficiency.



The semantic layer must never become an independent source of truth.



Important machine claims should retain provenance or epistemic status.



A machine-generated inference must not silently become a verified fact merely

because it was stored previously.



\---



\# 8. Context-loading principle



Use progressive context loading.



Preferred conceptual order:



L0 Vault / domain index

&#x20;   ->

L1 Module manifest

&#x20;   ->

L2 Semantic Card

&#x20;   ->

L3 Human Note

&#x20;   ->

L4 Evidence



Do not read full notes or full Vault contents unless necessary.



Machine-readable layers should help determine which human notes and evidence

must be opened.



\---



\# 9. Experiment principle



Experiments must be reproducible.



Every run should eventually be capable of recording:



\- case ID;

\- Git commit;

\- runtime version;

\- DSH version;

\- model;

\- model configuration;

\- prompt versions;

\- schema versions;

\- source bundle;

\- timestamp.



Do not compare experiments if uncontrolled infrastructure changes make the

comparison invalid.



Source variation and Prompt variation should be tested separately when

possible.



Do not silently change multiple major variables in one comparison.



\---



\# 10. Benchmark principle



Benchmarks should eventually contain:



\- normal conceptual lessons;

\- noisy ASR;

\- missing source information;

\- conflicting sources;

\- teacher analogies;

\- teacher opinions;

\- problem-solving tips;

\- mathematics/formula-heavy material;

\- repeated existing knowledge;

\- genuine corrections to old knowledge.



Human Gold data must not be fabricated by the Agent.



If Gold data does not exist, create placeholders or TODO items rather than

inventing a reference answer.



\---



\# 11. Current milestone: M0 — Repository Bootstrap



This is the ONLY active milestone unless the human explicitly advances it.



M0 is infrastructure bootstrap.



Do NOT yet implement:



\- a production Obsidian plugin;

\- OpenMAIC integration;

\- production Vault editing;

\- autonomous large-scale knowledge rewriting;

\- a complete multi-agent architecture;

\- learner-state modeling;

\- large benchmark suites.



M0 objective:



create a clean, reproducible repository skeleton that can support later

experiments.



\---



\# 12. Expected M0 repository skeleton



The exact structure may be improved if justified, but begin approximately with:



learning-agent/

├─ AGENTS.md

├─ README.md

├─ .gitignore

├─ .env.example

│

├─ docs/

│  ├─ ARCHITECTURE.md

│  ├─ DECISIONS.md

│  └─ ERROR\_TAXONOMY.md

│

├─ specs/

│  └─ README.md

│

├─ schemas/

│  └─ README.md

│

├─ prompts/

│  └─ README.md

│

├─ src/

│  ├─ core/

│  ├─ pipeline/

│  ├─ modules/

│  └─ runtime/

│     └─ dsh/

│

├─ benchmark/

│  ├─ cases/

│  ├─ gold/

│  └─ results/

│

├─ test-vault/

│  └─ .learning-agent/

│

├─ runs/

│

└─ obsidian-plugin/

&#x20;  └─ README.md



Do not invent fake production implementation merely to fill directories.



Empty areas may contain concise README placeholders explaining their future

responsibility.



\---



\# 13. M0 required work



During M0:



1\. inspect the current repository;

2\. record current Git status;

3\. identify the available local runtime environment;

4\. identify the installed DSH version without modifying DSH;

5\. create the repository structure;

6\. create an appropriate `.gitignore`;

7\. create `.env.example` without secrets;

8\. write a concise README;

9\. write initial architecture documentation;

10\. create DECISIONS.md;

11\. create ERROR\_TAXONOMY.md;

12\. establish a DSH runtime boundary placeholder;

13\. add placeholders for future schemas and specs;

14\. verify no secret or personal production Vault data is included;

15\. run basic repository sanity checks;

16\. prepare a proposed Git commit.



Do not create artificial benchmark Gold answers.



Do not copy the user's production Vault automatically.



\---



\# 14. Decision log



Architectural decisions that may affect future work must be recorded in:



docs/DECISIONS.md



Each decision should record:



\- decision ID;

\- date;

\- decision;

\- rationale;

\- alternatives considered;

\- consequences;

\- status.



Do not rely on chat history as the only record of important architecture

decisions.



\---



\# 15. Review gates



The Agent may work autonomously until one of these gates is reached.



\## REVIEW\_GATE\_M0



Stop after repository bootstrap.



Report:



\- files/directories created;

\- dependencies changed;

\- DSH version detected;

\- Git status;

\- important assumptions;

\- unresolved questions;

\- risks;

\- recommended next milestone.



Do not continue into M1 without explicit approval.



\## Future mandatory review situations



Stop and ask for review before:



\- changing a core schema incompatibly;

\- changing the machine/human note architecture;

\- introducing a major dependency;

\- modifying DSH source;

\- touching the production Vault;

\- deleting knowledge;

\- implementing irreversible migration;

\- connecting external services that alter data;

\- merging major experimental work into main.



\---



\# 16. Failure behavior



If information is missing:



do not invent it.



Prefer:



\- TODO;

\- UNKNOWN;

\- NEEDS\_REVIEW;

\- explicit assumption.



If a task cannot be completed safely:



stop at a review gate and explain the blocker.



Do not conceal partial failure behind plausible-looking generated files.



\---



\# 17. Reporting format



At the end of an autonomous work session report only what is useful for human

review.



Use this structure:



\## Completed

What changed.



\## Repository state

Git branch and relevant status.



\## Validation

What checks were performed and their results.



\## Decisions

New architectural decisions made.



\## Needs human review

Only questions requiring judgment.



\## Risks

Known risks or unresolved issues.



\## Proposed next step

One clearly bounded next milestone.



Avoid asking the human to review routine mechanical details unless something

failed.



\---



\# 18. General engineering style



Prefer:



\- simple;

\- modular;

\- reversible;

\- inspectable;

\- testable;

\- reproducible.



Avoid premature abstraction.



Do not build features merely because they may be useful later.



Do not optimize UI before core experimental protocols stabilize.



Do not convert every processing step into an autonomous Agent.



A deterministic module with structured input/output is preferred when

sufficient.



The system should become more complex only when experiments justify that

complexity.

