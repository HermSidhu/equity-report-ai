import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
import annualReportsRouter from "./routes/annual_reports";
import parseRouter from "./routes/parse";
import csvRouter from "./routes/csv";

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(bodyParser.json());

app.use("/api/annual_reports", annualReportsRouter);
app.use("/api/parse", parseRouter);
app.use("/api/csv", csvRouter);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
