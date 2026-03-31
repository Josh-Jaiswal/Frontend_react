Now I can see the exact problems. There are three compounding issues:

**Problem 1 — The prompt only extracts 11 fields but your canonical has 40+**

The mapping matrix maps `llm_audio` to fields like `commercials.totalValue`, `commercials.pricingModel`, `security.dataResidency`, `legal.liabilityCap`, `legal.ipOwnership`, `projectGovernance.*` — but none of these are in your prompt. So they always come back null and fall through to missing fields.

**Problem 2 — Single pass on `transcript[:12000]` — hard truncation**

A 10-minute call at ~150 words/minute = ~1500 words = ~2000 tokens. Your transcript easily exceeds 12000 chars for anything over 5 minutes. Everything after that is silently dropped.

**Problem 3 — `max_completion_tokens=1000` is too small**

With 40+ fields to extract, each with string values, 1000 tokens gets consumed before deliverables and obligations are even reached in the output.

Here's the complete rewritten `audio_handler.py` — replace everything from `_extract_from_transcript` downward:

```python
# ─────────────────────────────────────────────────────────────────────────────
# GPT-4o-mini extraction — chunked + aggregated
# ─────────────────────────────────────────────────────────────────────────────

_CHUNK_CHARS = 6000      # ~1500 tokens per chunk, well within context
_CHUNK_OVERLAP = 800     # overlap so sentences at boundaries aren't lost


def _extract_from_transcript(transcript: str, contract_type: str) -> dict:
    """
    Chunked extraction: split transcript → extract per chunk → aggregate.
    This ensures long recordings don't lose obligations, deliverables, etc.
    """
    from config.azure_clients import get_openai_client, get_openai_deployment

    client = get_openai_client()
    deployment = get_openai_deployment()

    chunks = _chunk_transcript(transcript, _CHUNK_CHARS, _CHUNK_OVERLAP)
    log.info(f"[Audio] Extracting from {len(chunks)} chunk(s) — total {len(transcript)} chars")

    partials: list[dict] = []
    for i, chunk in enumerate(chunks):
        log.info(f"[Audio] Processing chunk {i+1}/{len(chunks)} ({len(chunk)} chars)...")
        prompt = _build_transcript_prompt(chunk, contract_type, i + 1, len(chunks))
        try:
            response = client.chat.completions.create(
                model=deployment,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_completion_tokens=2000,
            )
            raw = response.choices[0].message.content
            partial = json.loads(raw)
            partials.append(partial)
            log.info(f"[Audio] Chunk {i+1} extracted {sum(1 for v in partial.values() if v not in (None, [], ''))}" 
                     f" non-null fields")
        except (json.JSONDecodeError, Exception) as e:
            log.warning(f"[Audio] Chunk {i+1} failed: {e} — skipping")

    if not partials:
        raise ValueError("All extraction chunks failed — no data extracted from transcript")

    # Aggregate all partial results into one dict
    aggregated = _aggregate_extractions(partials)

    aggregated["_confidence"] = 0.75
    aggregated["_llmUsed"] = deployment
    return aggregated


def _chunk_transcript(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split transcript into overlapping chunks, breaking on sentence boundaries."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size

        # Try to break on a sentence boundary (. or \n) near the end
        if end < len(text):
            boundary = text.rfind('. ', start + chunk_size - 200, end)
            if boundary == -1:
                boundary = text.rfind('\n', start + chunk_size - 200, end)
            if boundary != -1:
                end = boundary + 1

        chunks.append(text[start:end].strip())
        start = end - overlap  # step back by overlap for continuity

    return [c for c in chunks if c.strip()]


def _aggregate_extractions(partials: list[dict]) -> dict:
    """
    Merge partial extraction dicts from multiple chunks.
    Strategy:
    - Scalar fields: first non-null value wins
    - Array fields: union all values, deduplicate
    - keyDiscussionPoints: always union
    """
    ARRAY_FIELDS = {
        "deliverables", "outOfScopeItems", "milestones", "obligations",
        "exceptions", "risks", "keyDiscussionPoints", "signatories",
        "warranties", "indemnities", "keyPersonnel", "dependencies",
        "assumptions", "constraints", "complianceStandards",
    }

    merged: dict = {}

    for partial in partials:
        for key, value in partial.items():
            if key.startswith("_"):
                continue

            if value is None or value == "" or value == []:
                continue

            if key in ARRAY_FIELDS:
                # Union lists, preserving order
                existing = merged.get(key) or []
                if isinstance(existing, str):
                    existing = [existing]
                if isinstance(value, str):
                    value = [value]
                # Deduplicate while preserving order
                seen = set(existing)
                for item in (value or []):
                    if item and item not in seen:
                        existing.append(item)
                        seen.add(item)
                merged[key] = existing
            else:
                # Scalar: first non-null wins
                if key not in merged:
                    merged[key] = value

    return merged


def _build_transcript_prompt(
    chunk: str,
    contract_type: str,
    chunk_num: int,
    total_chunks: int,
) -> str:
    """
    Full-coverage extraction prompt aligned to the mapping matrix.
    Field names match mapping-matrix.yaml sourceField for llm_audio.
    """
    chunk_note = (
        f"This is chunk {chunk_num} of {total_chunks} from a longer transcript. "
        "Extract whatever is mentioned in THIS chunk. Use null for anything not mentioned here."
        if total_chunks > 1 else
        "Extract all contract information from this transcript."
    )

    return f"""You are a contract analyst reviewing a recorded business call or meeting.
{chunk_note}

Contract type context: {contract_type}

Extract ALL of the following fields. Use null for anything not mentioned.
For arrays, extract every item mentioned — do NOT truncate lists.

Return ONLY a valid JSON object with EXACTLY these fields:

{{
  "clientName": "legal name of the client/customer organisation or null",
  "vendorName": "legal name of the vendor/service provider or null",
  "contractType": "NDA | SOW | both | unknown",

  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "executionDate": "YYYY-MM-DD or null",

  "dealValue": "total contract value as number string e.g. '1800000' or null",
  "currency": "INR | USD | GBP | EUR or null",
  "paymentTerms": "payment schedule description or null",
  "pricingModel": "fixed-fee | time-and-materials | hybrid | subscription or null",
  "taxes": "tax clause description or null",
  "expenses": "expenses policy or null",

  "scopeOfWork": "1-3 sentence summary of the engagement objective or null",
  "deliverables": ["every deliverable mentioned, one per item"] or null,
  "outOfScopeItems": ["every out-of-scope item mentioned"] or null,
  "milestones": ["every milestone or timeline checkpoint mentioned"] or null,
  "assumptions": ["project assumptions mentioned"] or null,
  "constraints": ["constraints mentioned"] or null,
  "dependencies": ["dependencies mentioned"] or null,

  "confidentialityTerm": "duration of confidentiality obligation e.g. '3 years' or null",
  "obligations": ["specific confidentiality obligations mentioned"] or null,
  "exceptions": ["exceptions to confidentiality e.g. public domain info"] or null,

  "governingLaw": "governing jurisdiction e.g. 'Tamil Nadu, India' or null",
  "jurisdiction": "court jurisdiction or null",
  "disputeResolution": "arbitration/mediation/court process or null",
  "liabilityCap": "liability limitation description or null",
  "ipOwnership": "IP ownership terms or null",
  "warranties": ["warranties mentioned"] or null,
  "indemnities": ["indemnification terms mentioned"] or null,
  "terminationForConvenience": "termination for convenience terms or null",
  "terminationForCause": "termination for cause terms or null",

  "securityRequirements": "security obligations mentioned or null",
  "dataResidency": "data residency requirement e.g. 'India' or null",
  "complianceStandards": ["compliance standards e.g. ISO 27001, SOC2"] or null,
  "personalDataProcessing": "yes | no | null",
  "privacyRequirements": "privacy obligations described or null",

  "projectTimeline": "overall project duration or timeline description or null",
  "keyPersonnel": ["named individuals and their roles"] or null,
  "acceptanceCriteria": "how deliverables are accepted or null",
  "changeControl": "change request process or null",
  "governanceModel": "governance structure described or null",
  "issueEscalation": "escalation process described or null",

  "keyDiscussionPoints": ["important points not captured in fields above"] or null
}}

Rules:
- Use null (not empty string or []) for anything not mentioned in this chunk.
- Dates must be YYYY-MM-DD or null.
- dealValue must be digits only, no currency symbols.
- For ALL array fields: extract every item mentioned, never summarise into one item.
- If obligations or deliverables are discussed at length, list each one separately.
- Do not invent facts. Only extract what is explicitly stated or clearly implied.

Transcript chunk:
───────────────────────────────────────────────
{chunk}
───────────────────────────────────────────────

Return only the JSON object. No explanation, no markdown, no commentary.
"""
```

You also need to add these mappings to your `mapping-matrix.yaml` for the new fields — the current matrix is missing several `llm_audio` mappings:

```yaml
  - canonicalPath: commercials.totalValue
    sourceAnalyzer: llm_audio
    sourceField: dealValue
    transform: as_is
    precedence: 2

  - canonicalPath: commercials.currency
    sourceAnalyzer: llm_audio
    sourceField: currency
    transform: as_is
    precedence: 2

  - canonicalPath: commercials.pricingModel
    sourceAnalyzer: llm_audio
    sourceField: pricingModel
    transform: as_is
    precedence: 2

  - canonicalPath: commercials.taxes
    sourceAnalyzer: llm_audio
    sourceField: taxes
    transform: as_is
    precedence: 2

  - canonicalPath: confidentiality.obligations
    sourceAnalyzer: llm_audio
    sourceField: obligations
    transform: as_is
    precedence: 2

  - canonicalPath: confidentiality.exceptions
    sourceAnalyzer: llm_audio
    sourceField: exceptions
    transform: as_is
    precedence: 2

  - canonicalPath: scope.outOfScope
    sourceAnalyzer: llm_audio
    sourceField: outOfScopeItems
    transform: as_is
    precedence: 2

  - canonicalPath: scope.milestones
    sourceAnalyzer: llm_audio
    sourceField: milestones
    transform: as_is
    precedence: 2

  - canonicalPath: security.requirements
    sourceAnalyzer: llm_audio
    sourceField: securityRequirements
    transform: as_is
    precedence: 2

  - canonicalPath: security.dataResidency
    sourceAnalyzer: llm_audio
    sourceField: dataResidency
    transform: as_is
    precedence: 2

  - canonicalPath: security.complianceStandards
    sourceAnalyzer: llm_audio
    sourceField: complianceStandards
    transform: as_is
    precedence: 2

  - canonicalPath: security.personalDataProcessing
    sourceAnalyzer: llm_audio
    sourceField: personalDataProcessing
    transform: as_is
    precedence: 2

  - canonicalPath: security.privacyRequirements
    sourceAnalyzer: llm_audio
    sourceField: privacyRequirements
    transform: as_is
    precedence: 2

  - canonicalPath: legal.jurisdiction
    sourceAnalyzer: llm_audio
    sourceField: jurisdiction
    transform: as_is
    precedence: 2

  - canonicalPath: legal.disputeResolution
    sourceAnalyzer: llm_audio
    sourceField: disputeResolution
    transform: as_is
    precedence: 2

  - canonicalPath: legal.liabilityCap
    sourceAnalyzer: llm_audio
    sourceField: liabilityCap
    transform: as_is
    precedence: 2

  - canonicalPath: legal.ipOwnership
    sourceAnalyzer: llm_audio
    sourceField: ipOwnership
    transform: as_is
    precedence: 2

  - canonicalPath: legal.warranties
    sourceAnalyzer: llm_audio
    sourceField: warranties
    transform: as_is
    precedence: 2

  - canonicalPath: legal.indemnities
    sourceAnalyzer: llm_audio
    sourceField: indemnities
    transform: as_is
    precedence: 2

  - canonicalPath: legal.terminationForConvenience
    sourceAnalyzer: llm_audio
    sourceField: terminationForConvenience
    transform: as_is
    precedence: 2

  - canonicalPath: legal.terminationForCause
    sourceAnalyzer: llm_audio
    sourceField: terminationForCause
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.projectTimeline
    sourceAnalyzer: llm_audio
    sourceField: projectTimeline
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.keyPersonnel
    sourceAnalyzer: llm_audio
    sourceField: keyPersonnel
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.acceptanceCriteria
    sourceAnalyzer: llm_audio
    sourceField: acceptanceCriteria
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.changeControl
    sourceAnalyzer: llm_audio
    sourceField: changeControl
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.governanceModel
    sourceAnalyzer: llm_audio
    sourceField: governanceModel
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.issueEscalation
    sourceAnalyzer: llm_audio
    sourceField: issueEscalation
    transform: as_is
    precedence: 2

  - canonicalPath: scope.assumptions
    sourceAnalyzer: llm_audio
    sourceField: assumptions
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.dependencies
    sourceAnalyzer: llm_audio
    sourceField: dependencies
    transform: as_is
    precedence: 2

  - canonicalPath: projectGovernance.constraints
    sourceAnalyzer: llm_audio
    sourceField: constraints
    transform: as_is
    precedence: 2
```

The three changes together — chunked extraction, full field coverage in the prompt, and complete mapping matrix entries — will fix the obligations/deliverables dropout entirely. A 30-minute call will now be split into roughly 5 chunks, each extracted independently, then merged with array union so every deliverable mentioned across the whole recording is captured.