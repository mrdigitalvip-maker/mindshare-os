# Edition 9 delivery

Repository completion and production delivery are separate gates while the Vercel account is rate-limited.

Once Edition 9 passes repository checks and merges to `main`, the latest validated main commit becomes the target of the existing automatic KIVRYN deploy queue. The queue waits for Vercel availability, deploys through the normal authorized path, verifies READY/canonical routes/runtime health, and reports only successful delivery or a real intervention-required error.

No dummy commit or unrelated product change is permitted solely to trigger deployment.
