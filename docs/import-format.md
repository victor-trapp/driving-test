# Importing questions and hazard clips

The built-in questions are original ones written from the Highway Code. If you get hold of a question set or hazard clips you're licensed to use, you can add them without touching the code. Official DVSA revision questions and clips can't be used without a licence from DVSA, see [GOV.UK: make and sell driving theory test revision products](https://www.gov.uk/guidance/make-and-sell-driving-theory-test-revision-products).

## Question packs

A JSON file with a `source` (stored with every question so you know where it came from) and a list of `questions`:

```json
{
  "source": "Example pack, licensed from Example Ltd, 2026",
  "questions": [
    {
      "id": "EX-001",
      "topic": "motorway-rules",
      "difficulty": 2,
      "text": "What does a red X above a motorway lane mean?",
      "options": ["The lane is closed", "Slow down to 50 mph", "Lane for emergency vehicles", "Lane closes in 1 mile"],
      "correct": [0],
      "explanation": "A red X means the lane is closed and you must not drive in it.",
      "hc": [{ "label": "Highway Code rule 258", "url": "https://www.gov.uk/guidance/the-highway-code/motorways-253-to-273#rule258" }],
      "sourceUrl": "https://example.org/pack",
      "lastVerified": "2026-10-01",
      "contentVersion": 1
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Letters, numbers, `-` and `_`. Must not clash with a built-in id. Re-importing the same id updates the question. |
| `topic` | yes | One of `alertness`, `attitude`, `safety-and-your-vehicle`, `safety-margins`, `hazard-awareness`, `vulnerable-road-users`, `other-types-of-vehicle`, `vehicle-handling`, `motorway-rules`, `rules-of-the-road`, `road-and-traffic-signs`, `essential-documents`, `incidents-accidents-emergencies`, `vehicle-loading`. |
| `difficulty` | no | 1, 2 or 3. Defaults to 2. |
| `text` | yes | The question. |
| `options` | yes | 2 to 6 answers. The app shuffles them every time. |
| `correct` | yes | Indexes into `options`, starting at 0. Two or more makes it a "mark two answers" question. |
| `explanation` | yes | Shown after answering and in reviews. |
| `hc` | no | Highway Code or GOV.UK links, `https://` only. |
| `image` | no | `{ "kind": "sign", "ref": "r-no-entry", "alt": "..." }` using a sign id from the Road signs page, or `{ "kind": "illustration", "ref": "box-junction", "alt": "..." }`. |
| `sourceUrl` | yes | Where the question came from. |
| `lastVerified` | yes | `YYYY-MM-DD`, when someone last checked it against the current rules. |
| `contentVersion` | no | Your own version number. Defaults to 1. |

Invalid questions are skipped and reported. The rest of the file still imports.

**From the app:** Settings → Import a question pack.

**From the command line** (the file has to be inside the pod, so copy it in first):

```bash
POD=$(kubectl -n driving-theory get pod -l app.kubernetes.io/name=driving-theory -o jsonpath='{.items[0].metadata.name}')
kubectl cp ./my-pack.json driving-theory/$POD:/data/my-pack.json
kubectl -n driving-theory exec $POD -- node dist/server/cli.js import /data/my-pack.json
```

Locally: `npm run import:questions -- ./my-pack.json`

There's a full example in [examples/question-pack.json](examples/question-pack.json).

## Hazard perception clips (MP4)

1. Copy the video files onto the data volume under `media/`. Anything in `/data/media` is served at `/media/...`.

   ```bash
   kubectl -n driving-theory exec $POD -- mkdir -p /data/media/clips
   kubectl cp ./clip-01.mp4 driving-theory/$POD:/data/media/clips/clip-01.mp4
   ```

2. Describe the clips and their scoring windows in a JSON file. Times are milliseconds from the start of the video. Each window is split into five equal bands worth 5 down to 1 points, so set `startMs` where the hazard starts to develop and `endMs` where it's too late to react calmly.

   ```json
   {
     "clips": [
       {
         "id": "licensed-clip-01",
         "title": "Cyclist at a junction",
         "description": "Suburban junction, daytime.",
         "src": "/media/clips/clip-01.mp4",
         "durationMs": 61000,
         "hazards": [
           { "id": "cyclist", "startMs": 22400, "endMs": 27400, "label": "Cyclist pulls out", "explanation": "The cyclist looked over their shoulder before moving out." }
         ],
         "licence": "Licensed from Example Ltd for personal use, 2026"
       }
     ]
   }
   ```

3. Register them:

   ```bash
   kubectl cp ./clips.json driving-theory/$POD:/data/clips.json
   kubectl -n driving-theory exec $POD -- node dist/server/cli.js import-clips /data/clips.json
   ```

They appear in Hazard perception alongside the animated clips and are included in "Run all clips".
