import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
import annualReportsRouter from "./routes/annual_reports";
import parseRouter from "./routes/parse";
import csvRouter from "./routes/csv";
import compiledDataRouter from "./routes/compiled_data";

const app = express();
const PORT = process.env.PORT || 5050;

app.use(
  cors({
    origin: [
      "http://localhost:5173", // for local development
      "https://equity-report-ai.pages.dev", // your deployed frontend
    ],
  })
);
app.use(bodyParser.json());

app.use("/api/annual_reports", annualReportsRouter);
app.use("/api/parse", parseRouter);
app.use("/api/csv", csvRouter);
app.use("/api/compiled_data", compiledDataRouter);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
