
# 🧪 AI Agent Evaluation Server


---


The [Vis x GenAI workshop](https://visxgenai.github.io/2025/index.html) at IEEE VIS 2025 invited participants to build AI agents that could autonomously generate data visualizations and explanations from real-world datasets. Running a challenge like this needs a way for participants to submit their agents and a way to actually run those agents in a controlled environment. That's what this server does.


The challenge had a few requirements that shaped the system. Participants needed to **sign up, form teams, and submit code** through a web interface. Each submission had to run in **isolation** because participants' code is arbitrary and untrusted. The agents needed access to **LLM APIs** like OpenAI and Azure OpenAI, with keys provided by us so participants didn't have to bring their own. And the results had to feed a **public leaderboard** showing each team's best output.


## Architecture


The system is split into four pieces that communicate over a shared Postgres database and a Redis queue.

- **Web service** ([FastAPI](https://fastapi.tiangolo.com/)) — handles authentication, submission uploads, team management, and the leaderboard. Exposes a REST API that the [frontend](https://amplify.dvsuyr25l38y1.amplifyapp.com/archive/2025) consumes.
- **Worker** (Celery) — picks submissions off the Redis queue, spins up a fresh Docker container per submission, and writes results back to the database.
- **Evaluation container** — the actual sandbox. Each submission runs here, with the LLM API keys injected as environment variables. The container produces an `output.pdf` which gets stored and made available via the API.
- **Postgres** — stores users, teams, submissions, and metadata. Redis is just the task broker.

## How a submission flows


When a participant uploads their agent as a ZIP file, the web service unpacks it, validates that it contains the expected files (`agent.py` and `requirements.txt`), and inserts a submission record. It then dispatches a Celery task with the submission ID.


The worker picks up the task, builds a Docker image based on the participant's `requirements.txt`, and runs the container. Inside the container, the evaluation script dynamically loads the participant's `agent.py`, instantiates their `Agent` class, calls `initialize()` and `process()`, and captures the output PDF. The container is short-lived and gets torn down once evaluation finishes.


This isolation matters because we have no idea what's in the participant's code. The container runs as a non-privileged user with a strict time and memory budget. If an agent crashes, hangs, or tries something malicious, the blast radius is one container.


## Agent interface


Each participant implements a simple interface in `agent.py`:


```python
class Agent:
    def initialize(self):
        """Set up the agent. Called once before process."""
        pass

    def process(self, input_data: dict) -> dict:
        """Run the agent on a single input."""
        pass
```


The agent is expected to produce a single `output.pdf` at the root of the container — that PDF is the artifact that gets stored against the submission and shown on the leaderboard.


## My role


I was responsible for designing and implementing this server end-to-end. That covered the data model and API surface, the Docker sandbox, the Celery + Redis pipeline, and packaging everything so it could be brought up or torn down with a single script (`./run.sh dev` for development, `./run.sh prod` for production).


## Outcome


The platform went live for IEEE VIS 2025 and hosted the workshop challenge submissions. Each team's agent output got picked up, evaluated, and surfaced on [the platform](https://amplify.dvsuyr25l38y1.amplifyapp.com/archive/2025).

