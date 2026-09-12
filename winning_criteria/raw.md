The workshop does not specify a single "winning project idea" for the **Agents for Humans Hackathon**. Instead, the presenter, *Sandhya Subramani*, emphasizes that the hackathon is focused on building **practical, functional AI agents** (0:33) using the *Strands Agents SDK* (7:39).

While there is no prescribed idea, the session provides a roadmap for building a high-quality submission:
* **Foundational Requirement:** Building a basic agent with the *Strands SDK* that uses a reasoning loop and tools to perform tasks is sufficient for submission (28:57, 48:06).
* **Competitive Edge:** To make a project stand out, the presenter suggests implementing features that increase **determinism and reliability**, such as:
    * **Hooks:** For implementing guardrails like rate-limiting (29:27).
    * **Skills:** For scoped context management (41:36).
    * **Steering:** For using a "buddy agent" to enforce tone and ensure the agent follows specific operational rules (48:43).

Participants can choose from three hackathon tracks: *Everyday Agents*, *Professional Agents*, and *Good Neighbor Agents*. The key is to demonstrate a reliable, production-ready system rather than just a simple demo (1:40, 5:45).
🧠 Time to plan your Agents for Humans project


A little planning goes a long way toward a winning project. If you're staring at a blank page, start with the question, not the answer: what small, repetitive thing does a real person deal with that an agent could quietly take off their plate?

🎯 Here's how to actually get moving:
Start with the person, not the tech. Write one sentence: "[Who] is stuck doing [what], over and over." Can't fill that in yet? That's your first task, not the code.
Sketch before you build. Rough out your agent, its tools, and how data moves between them on paper or a whiteboard. You'll need this for your architecture diagram anyway — get ahead of it.
Pick ONE workflow and go end-to-end. Judges reward a single thing that fully works over five things that half work. Scope down before you scope up.
Build the ugly version first. A working agent with zero polish beats a beautiful mockup that doesn't run. Get the core loop working, then make it pretty.
Storyboard your demo video now, not the night before. You've got 5 minutes: problem → who it's for → why it matters → it working. Knowing your pitch early shapes what you build.
🗓️ Rough timeline (6 weeks total — we're a few days into Week 1 now):
Week 1 (Aug 10–16): Set up your AWS account and Builder ID, install Strands (Quickstart), pick your track, nail your one-sentence problem statement.
Week 2 (Aug 17–23): Build the core agent loop. Get one workflow working end-to-end — ugly is fine.
Weeks 3–4 (Aug 24–Sept 6): Add tools and integrations, test with real scenarios, start your architecture diagram.
Week 5 (Sept 7–13): Polish. Lock in your public repo (license + README), record your demo video.
Final day (Sept 14): Submit before 5:00 pm PT (aim for 3-4 hours before if you can!). Don't wait until the last hour — video  and file uploads take time.
Not sure which track fits? Pick based on who the primary user is, not what the agent technically does:

Building for someone managing their own life? → Everyday Agents
Building for a professional doing skilled work? → Professional Agents
Building for a group of people coordinating together? → Good Neighbor Agents
Per the Official Rules, you may submit more than one project — just make sure each one is unique and substantially different from the others.

📚 Get inspired.
The Resources tab has track-by-track inspiration and Strands learning resources. Check the FAQs if you've got questions on tracks, submissions, or anything else. Devpost's Tips for Planning Your Project is a good way to map out your build.

One last thing: you can save a draft submission and keep editing it right up until the deadline. Getting the shell in place early means no surprises later.

 

We can't wait to see what you build! 🚀Q: What should my architecture diagram include?

Your architecture diagram should give judges a clear picture of how your agent is built and how the pieces connect. It doesn't have to be beautiful - a clear, labeled diagram including the following:

User input/interface: how a user interacts with your agent (CLI, web app, API call, etc.)
Strands Agents: the core agent and its agentic loop (model → tools → reasoning → response)
Tools & integrations: any APIs, datasets, databases, or external services your agent calls
AWS services used: Bedrock, Lambda, S3, DynamoDB, AgentCore, etc. — whatever's in your stack
Output: what the agent returns to the user
