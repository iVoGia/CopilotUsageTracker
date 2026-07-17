# Database design (Phase 2)

PostgreSQL schema for Copilot Usage Tracker. Prisma is the source of truth: [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma).

## ER diagram

```mermaid
erDiagram
  developers ||--o{ sessions : has
  developers ||--o{ events : emits
  developers ||--o{ tasks : owns
  developers ||--o{ refresh_tokens : holds
  developers ||--o{ daily_statistics : rolls_up
  developers ||--o{ monthly_statistics : rolls_up
  projects ||--o{ sessions : scopes
  projects ||--o{ events : scopes
  projects ||--o{ tasks : scopes
  projects ||--o{ daily_statistics : rolls_up
  sessions ||--o{ events : groups
  tasks ||--o{ events : labels
  credit_estimation ||--o{ events : prices

  developers {
    uuid id PK
    string github_id UK
    string display_name
    string email
    enum role
    datetime created_at
  }

  projects {
    uuid id PK
    string workspace_name
    string git_branch
    datetime created_at
  }

  sessions {
    uuid id PK
    uuid developer_id FK
    uuid project_id FK
    enum status
    datetime started_at
    datetime ended_at
    datetime last_activity_at
    int prompt_count
    float credits_used
  }

  tasks {
    uuid id PK
    uuid developer_id FK
    uuid project_id FK
    string name
    string jira_id
    datetime started_at
    datetime ended_at
  }

  events {
    uuid id PK
    string idempotency_key UK
    enum kind
    uuid developer_id FK
    uuid session_id FK
    uuid project_id FK
    uuid task_id FK
    string provider
    string model
    int prompt_length
    int response_length
    int input_tokens
    int output_tokens
    float estimated_credits
    datetime occurred_at
  }

  daily_statistics {
    uuid id PK
    date day
    uuid developer_id FK
    uuid project_id FK
    string model
    int prompt_count
    float credits
  }

  monthly_statistics {
    uuid id PK
    string year_month
    uuid developer_id FK
    uuid project_id FK
    string model
    int prompt_count
    float credits
  }

  credit_estimation {
    uuid id PK
    string provider
    string model
    int version
    float input_credits_per_1k
    float output_credits_per_1k
    boolean active
  }

  refresh_tokens {
    uuid id PK
    uuid developer_id FK
    string token_hash UK
    string device_label
    datetime expires_at
  }
```

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| events | `(occurred_at)` | Time-range scans |
| events | `(developer_id, occurred_at)` | Per-dev timeline |
| events | `(session_id)` | Session detail |
| events | `(task_id)` | Task cost |
| events | `(model, occurred_at)` | Model charts |
| events | `(idempotency_key)` unique | Safe retries |
| sessions | `(developer_id, status, last_activity_at)` | Inactivity worker |
| daily_statistics | unique `(day, developer_id, project_id, model)` | Upsert rollups |
| monthly_statistics | unique `(year_month, developer_id, project_id, model)` | Upsert rollups |
| credit_estimation | unique `(provider, model, version)` | Versioned rates |
| projects | unique `(workspace_name, git_branch)` | Dedupe projects |

## Privacy

No columns store prompt text, message bodies, or source code.
