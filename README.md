The key error is:

```
[Audio] Chunk 1 failed: Expecting value: line 1 column 1 (char 0) — skipping
```

GPT-4o-mini returned an **empty response** — `response.choices[0].message.content` is empty string or None, so `json.loads("")` fails immediately.

Share your pasted `audio_handler.py` file so I can see exactly what was saved. But the fix is almost certainly one of these two things:

**Fix 1 — The model name is wrong for your deployment**

Your logs show the request hitting `gpt4omini-main` as the deployment name. The `response_format={"type": "json_object"}` mode requires the model to support it — if the deployment version is older it returns empty. Add a system message to force JSON:

```python
response = client.chat.completions.create(
    model=deployment,
    messages=[
        {
            "role": "system", 
            "content": "You are a JSON extraction system. Always return only valid JSON. Never return empty responses."
        },
        {"role": "user", "content": prompt}
    ],
    response_format={"type": "json_object"},
    max_completion_tokens=2000,
)
```

**Fix 2 — Log the raw response before parsing**

Change the except block to expose what actually came back:

```python
except json.JSONDecodeError as e:
    log.warning(
        f"[Audio] Chunk {i+1} JSON parse failed — raw response was: "
        f"'{raw[:500] if raw else 'EMPTY'}' — error: {e} — skipping"
    )
except Exception as e:
    log.warning(f"[Audio] Chunk {i+1} failed: {e} — skipping")
```

Right now your generic `except Exception` is catching the JSON error and hiding the actual content. Once you see what GPT returned, the fix will be obvious. Share the pasted handler file and I'll fix it directly.
