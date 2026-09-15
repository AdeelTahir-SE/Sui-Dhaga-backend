import { app } from "./app.js";
import { env } from "./config/env.js";
import { initializeStorageBuckets } from "./services/storage.service.js";

app.listen(env.PORT, async () => {
  console.log(`Sui Dhaga API listening on port ${env.PORT}`);
  try {
    await initializeStorageBuckets();
    console.log("Supabase storage buckets verified and updated to public.");
  } catch (err: any) {
    console.warn("Storage bucket initialization notice:", err?.message);
  }
});
