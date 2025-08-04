import fs from "fs";
import path from "path";
import axios from "axios";

export async function downloadReports(
  companyCode: string,
  reports: { year: number; link: string }[]
) {
  const dir = path.join(__dirname, "../../annual_reports", companyCode);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const downloadedFiles: string[] = [];

  for (const { year, link } of reports) {
    const fileName = `${year}-${path.basename(new URL(link).pathname)}`;
    const filePath = path.join(dir, fileName);

    const response = await axios.get(link, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);

    await new Promise<void>((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    downloadedFiles.push(filePath);
    console.log(`✅ Downloaded: ${fileName}`);
  }

  return downloadedFiles;
}
