import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";

// export async function GET() {
//     try {
//         const csvFilePath = path.join(process.cwd(), "data", "completed_jobs_embeddings.csv");
//         console.log(csvFilePath);


//         const fileContent = fs.readFileSync(csvFilePath, "utf-8");

//         const records = parse(fileContent, {
//             columns: true, // Use first row as header
//             skip_empty_lines: true,
//         });

//         return NextResponse.json(records);
//     } catch (error) {
//         console.error(error);
//         return NextResponse.json({ error: "Failed to read CSV file" }, { status: 500 });
//     }
// }

export async function GET() {
    try {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
        const urlencoded = new URLSearchParams();

        urlencoded.append("grant_type", "refresh_token");
        urlencoded.append("client_id", "4356de735e5695c8aae8faa677b7b3cf");
        urlencoded.append("client_secret", "4038af64bbc85d0f");
        urlencoded.append("refresh_token", "oauth2v2_REDACTED");

        const requestOptions: any = {
            method: "POST",
            headers: myHeaders,
            body: urlencoded,
            redirect: "follow"
        };


        const response = await fetch("https://www.upwork.com/api/v3/oauth2/token", requestOptions)

        return NextResponse.json(await response.json());
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to read CSV file" }, { status: 500 });
    }
}
