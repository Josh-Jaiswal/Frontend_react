Good call — Cosmos DB is the right production choice for this since you're already Azure-native. Here's exactly what you need to change and add.

---

## Why Cosmos DB over SQLite/TinyDB

For your setup specifically — Azure-hosted, async FastAPI, potentially multiple API instances — Cosmos DB gives you persistent storage that survives restarts, scales horizontally, has a free tier (1000 RU/s, 25 GB), and integrates cleanly with the rest of your Azure stack. You already have an Azure subscription so provisioning takes 5 minutes.

---

## What changes

Only two files need meaningful changes:

- `api.py` — swap the `JOBS` dict for Cosmos operations
- `config/azure_clients.py` — add a Cosmos client factory
- `.env` — add three new variables
- `requirements.txt` — add one package

Nothing in the pipeline, normalisation, or generation layers changes at all.

---

## Step 1 — Provision Cosmos DB

In Azure Portal:

```
Create resource → Azure Cosmos DB → Core (NoSQL)
Account name:  contract-intel-db
API:           NoSQL (Core)
Capacity:      Serverless  ← cheapest for variable load
Region:        Same as your other resources
```

Once created, go to **Data Explorer** and create:

```
Database ID:   contract-intelligence
Container ID:  jobs
Partition key: /job_id
```

Then go to **Keys** and copy the `URI` and `PRIMARY KEY`.

---

## Step 2 — `.env` additions

```bash
# Cosmos DB
AZURE_COSMOS_ENDPOINT=https://contract-intel-db.documents.azure.com:443/
AZURE_COSMOS_KEY=your_primary_key_here
AZURE_COSMOS_DATABASE=contract-intelligence
AZURE_COSMOS_CONTAINER=jobs
```

---

## Step 3 — `requirements.txt` addition

```
azure-cosmos>=4.5.1
```

---

## Step 4 — `config/azure_clients.py` addition

Add this alongside your existing client factories:

```python
from azure.cosmos import CosmosClient, ContainerProxy
import os

_cosmos_client: CosmosClient | None = None
_cosmos_container: ContainerProxy | None = None


def get_cosmos_container() -> ContainerProxy:
    """
    Returns a cached Cosmos DB container client.
    Call this anywhere you need to read/write jobs.
    """
    global _cosmos_client, _cosmos_container

    if _cosmos_container is not None:
        return _cosmos_container

    endpoint = os.getenv("AZURE_COSMOS_ENDPOINT")
    key = os.getenv("AZURE_COSMOS_KEY")
    database_id = os.getenv("AZURE_COSMOS_DATABASE", "contract-intelligence")
    container_id = os.getenv("AZURE_COSMOS_CONTAINER", "jobs")

    if not endpoint or not key:
        raise RuntimeError(
            "AZURE_COSMOS_ENDPOINT and AZURE_COSMOS_KEY must be set in .env"
        )

    _cosmos_client = CosmosClient(endpoint, credential=key)
    database = _cosmos_client.get_database_client(database_id)
    _cosmos_container = database.get_container_client(container_id)

    return _cosmos_container
```

---

## Step 5 — `api.py` full replacement

This is the main change. Replace your current `JOBS` dict and all the functions that read/write it:

```python
# ── Remove this ───────────────────────────────────────────────────────────────
# JOBS: dict = {}

# ── Add these helpers at the top of api.py ───────────────────────────────────
from config.azure_clients import get_cosmos_container


def _job_get(job_id: str) -> dict | None:
    """Fetch a single job document from Cosmos DB."""
    try:
        container = get_cosmos_container()
        item = container.read_item(item=job_id, partition_key=job_id)
        return dict(item)
    except Exception:
        return None


def _job_upsert(job: dict) -> None:
    """Insert or update a job document in Cosmos DB."""
    container = get_cosmos_container()
    # Cosmos requires an 'id' field — map job_id to id
    doc = {**job, "id": job["job_id"]}
    container.upsert_item(doc)


def _job_list() -> list[dict]:
    """Return all jobs ordered by created_at descending."""
    container = get_cosmos_container()
    query = "SELECT * FROM c ORDER BY c.created_at DESC"
    items = list(container.query_items(
        query=query,
        enable_cross_partition_query=True
    ))
    return items


def _job_delete(job_id: str) -> None:
    """Delete a job document from Cosmos DB."""
    container = get_cosmos_container()
    container.delete_item(item=job_id, partition_key=job_id)
```

Now replace every place in `api.py` that reads or writes `JOBS`:

```python
# ── POST /analyze ─────────────────────────────────────────────────────────────
# Replace:
#   JOBS[job_id] = { ... }
# With:
job = {
    "job_id":        job_id,
    "status":        "queued",
    "created_at":    datetime.now(timezone.utc).isoformat(),
    "file_name":     file.filename,
    "contract_type": contract_type,
    "error":         None,
    "outputs":       {},
}
_job_upsert(job)


# ── GET /jobs/{job_id} ────────────────────────────────────────────────────────
# Replace:
#   if job_id not in JOBS: raise 404
#   return JOBS[job_id]
# With:
job = _job_get(job_id)
if not job:
    raise HTTPException(status_code=404, detail="Job not found")
return job


# ── GET /jobs ─────────────────────────────────────────────────────────────────
# Replace:
#   return {"jobs": list(JOBS.values())}
# With:
jobs = _job_list()
return {"total": len(jobs), "jobs": jobs}


# ── DELETE /jobs/{job_id} ─────────────────────────────────────────────────────
# Replace:
#   del JOBS[job_id]
# With:
_job_delete(job_id)


# ── Inside run_pipeline_job (background task) ─────────────────────────────────
# Replace every:
#   JOBS[job_id]["status"] = "processing"
#   JOBS[job_id].update({...})
# With:
job = _job_get(job_id)
job["status"] = "processing"
_job_upsert(job)

# And on completion:
job = _job_get(job_id)
job.update({
    "status":       "complete",
    "completed_at": datetime.now(timezone.utc).isoformat(),
    "outputs":      result,
})
_job_upsert(job)

# And on failure:
job = _job_get(job_id)
job.update({
    "status":       "failed",
    "error":        str(e),
    "completed_at": datetime.now(timezone.utc).isoformat(),
})
_job_upsert(job)
```

---

## Step 6 — Update the README known limitations section

Replace:

```
In-memory job store — JOBS resets on restart
```

With:

```
Job store — Azure Cosmos DB (NoSQL, serverless)
Jobs persist across API restarts and are queryable
by status. Partition key is job_id.
```

---

## What the data looks like in Cosmos

Each job document stored in Cosmos will look like this:

```json
{
  "id": "954cc893-6373-444d-92c4-6d446828de9d",
  "job_id": "954cc893-6373-444d-92c4-6d446828de9d",
  "status": "complete",
  "created_at": "2026-04-01T00:38:18Z",
  "completed_at": "2026-04-01T00:38:20Z",
  "file_name": "NDA_gov_oil.pdf",
  "contract_type": "auto",
  "error": null,
  "outputs": {
    "nda_pdf": "api_outputs/954cc.../generated-nda.pdf",
    "sow_pdf": "api_outputs/954cc.../generated-sow.pdf",
    "canonical": "api_outputs/954cc.../canonical.json"
  }
}
```

---

## Cost estimate

On serverless Cosmos DB, each job operation (read, write, upsert) costs roughly 1–5 RU. At 100 jobs per day that is under 500 RU/day — well within the free tier of 1000 RU/s and 25 GB storage. For a demo or internal tool this is effectively free.

---

## One thing to watch

The `output` file paths stored in Cosmos point to local `api_outputs/` directories. Those still live on the API server filesystem — which resets if the container restarts. For full persistence you should also move output files to Azure Blob Storage and store the Blob URLs in Cosmos instead of local paths. That is the next step after this one, but it is optional for an initial deployment.