import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import app from "./app";

const PORT = process.env.PORT || 5000;

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Shabdhan API running on port ${PORT}`);
});
