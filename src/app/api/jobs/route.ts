import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const csvFilePath = path.join(process.cwd(), "data", "completed_jobs_embeddings.csv");
        // console.log(csvFilePath);


        const fileContent = fs.readFileSync(csvFilePath, "utf-8");

        const records = parse(fileContent, {
            columns: true, // Use first row as header
            skip_empty_lines: true,
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to read CSV file" }, { status: 500 });
    }
}
